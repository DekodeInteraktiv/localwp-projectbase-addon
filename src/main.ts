// https://getflywheel.github.io/local-addon-api/modules/_local_main_.html
import { getServiceContainer, SiteData } from '@getflywheel/local/main';

import { MultiSite } from '@getflywheel/local';
import * as path from 'path';

const ServiceContainer = getServiceContainer();

const normalizeSitePath = (sitePath: string) =>
	sitePath.replace(/^~/, process.env.HOME || '');

const fileExists = async (fileSystem: any, target: string) => {
	try {
		await fileSystem.access(target);
		return true;
	} catch {
		return false;
	}
};

const isDirectory = async (fileSystem: any, directory: string) => {
	try {
		const stats = await fileSystem.stat(directory);
		return stats.isDirectory();
	} catch {
		return false;
	}
};

const collectPhpIniPaths = async (fileSystem: any, confRoot: string) => {
	const paths: string[] = [];
	const basePath = path.join(confRoot, 'php', 'php.ini.hbs');

	if (await fileExists(fileSystem, basePath)) {
		paths.push(basePath);
	}

	let entries: string[];

	try {
		entries = await fileSystem.readdir(confRoot);
	} catch (error) {
		throw new Error(`Unable to read PHP config directory: ${error}`);
	}

	for (const entry of entries) {
		if (!entry.startsWith('php-')) {
			continue;
		}

		const versionDir = path.join(confRoot, entry);

		if (!(await isDirectory(fileSystem, versionDir))) {
			continue;
		}

		const iniPath = path.join(versionDir, 'php.ini.hbs');

		if (await fileExists(fileSystem, iniPath)) {
			paths.push(iniPath);
		}
	}

	return paths;
};

const rewriteCafileEntry = (original: string, caBundlePath: string, fileExists: boolean) => {
	const newline = original.includes('\r\n') ? '\r\n' : '\n';
	const lines = original.split(/\r?\n/);

	let changed = false;

	const updatedLines = lines.map(line => {
		if (!line.trim().startsWith('openssl.cafile')) {
			return line;
		}

		const leadingWhitespace = line.match(/^\s*/)?.[0] ?? '';
		
		// If file exists, use hardcoded path
		if (fileExists) {
			const replacement = `${leadingWhitespace}openssl.cafile = "${caBundlePath}"`;
			if (line === replacement) {
				return line;
			}
			changed = true;
			return replacement;
		} else {
			// If file doesn't exist and path is hardcoded, switch back to template
			if (line.includes(caBundlePath)) {
				const replacement = `${leadingWhitespace}openssl.cafile="{{wpCaBundlePath}}"`;
				changed = true;
				return replacement;
			}
			// If already using template, don't change
			return line;
		}
	});

	let updated = updatedLines.join(newline);

	// Handle template replacement when file exists
	if (fileExists && !changed && original.includes('{{wpCaBundlePath}}')) {
		const replaced = original.replace(/{{wpCaBundlePath}}/g, caBundlePath);
		changed = replaced !== original;
		updated = changed ? replaced : updated;
	}

	return { content: changed ? updated : original, changed };
};

const updatePhpConfigs = async (
	fileSystem: any,
	phpIniPaths: string[],
	caBundlePath: string,
	caBundleExists: boolean,
	localLogger: any
) => {
	let changed = false;
	const errors: string[] = [];

	for (const iniPath of phpIniPaths) {
		try {
			const original = await fileSystem.readFile(iniPath, 'utf8');
			const { content, changed: fileChanged } = rewriteCafileEntry(
				original,
				caBundlePath,
				caBundleExists
			);

			if (fileChanged) {
				await fileSystem.writeFile(iniPath, content, 'utf8');
				changed = true;
			}
		} catch (error) {
			errors.push(`${path.basename(iniPath)}: ${error}`);

				localLogger?.log(
					'info',
					`Error updating ${iniPath}: ${error}`
				);
		}
	}

	return { changed, errors };
};

export default function (context) {
	const { electron, fileSystem } = context;
	const { siteProcessManager, localLogger } = ServiceContainer.cradle as any;
	const { ipcMain } = electron;

	ipcMain.on('update-multisite-config', async (event, siteId, sitePath) => {
		const config = __dirname + '/conf/wordpress-multi.conf.hbs';

		let confPath =
			sitePath + '/conf/nginx/includes/wordpress-multi.conf.hbs';
		confPath = confPath.replace('~', process.env.HOME);

		try {
			// Check if the file exists
			try {
				await fileSystem.access(confPath, fileSystem.constants.F_OK);
			} catch (error) {
				// If the file doesn't exist, create it
				await fileSystem.writeFile(confPath, ''); // Initialize with an empty string or some default content
			}

			// Then copy your config file over
			await fileSystem.copyFile(config, confPath);

			siteProcessManager.restart(SiteData.getSite(siteId));
		} catch (error) {
			context.notifier.notify({
				title: 'Nginx multisite config failed',
				message: String(error),
			});

			localLogger?.log(
				'info',
				`Error moving wordpress-multi.conf ${siteId}: ${error}`
			);
		}
	});

	ipcMain.on('fix-ssl-config', async (event, siteId, sitePath) => {
		if (!sitePath) {
			context.notifier.notify({
				title: 'SSL config update failed',
				message: 'Missing site path.',
			});
			return;
		}

		const resolvedSitePath = normalizeSitePath(sitePath);
		const confRoot = path.join(resolvedSitePath, 'conf');
		let phpIniPaths: string[];

		try {
			phpIniPaths = await collectPhpIniPaths(fileSystem, confRoot);
		} catch (error) {
			context.notifier.notify({
				title: 'SSL config update failed',
				message: String(error),
			});

			localLogger?.log(
				'info',
				`Unable to collect php.ini paths for ${siteId}: ${error}`
			);

			return;
		}

		if (phpIniPaths.length === 0) {
			context.notifier.notify({
				title: 'SSL config update',
				message: 'No php.ini.hbs files found. Nothing to update.',
			});
			return;
		}

		const wpCaBundlePath = path.join(
			resolvedSitePath,
			'app',
			'public',
			'wp',
			'wp-includes',
			'certificates',
			'ca-bundle.crt'
		);

		const caBundleExists = await fileExists(fileSystem, wpCaBundlePath);

		const { changed, errors } = await updatePhpConfigs(
			fileSystem,
			phpIniPaths,
			wpCaBundlePath,
			caBundleExists,
			localLogger
		);

		if (errors.length) {
			context.notifier.notify({
				title: 'SSL config update failed',
				message:
					'One or more php.ini.hbs files could not be updated. Check Local logs for details.',
			});

			return;
		}

		if (changed) {
			context.notifier.notify({
				title: 'SSL config updated',
				message:
					'openssl.cafile path updated. Restarting the site to apply changes.',
			});

			try {
				siteProcessManager.restart(SiteData.getSite(siteId));
			} catch (error) {
				localLogger?.log(
					'info',
					`Failed to restart site ${siteId} after SSL update: ${error}`
				);
			}
		} else {
			context.notifier.notify({
				title: 'SSL config update',
				message: 'No changes were necessary.',
			});
		}
	});

	ipcMain.on('convert-to-multisite', async (event, siteId) => {
		SiteData.updateSite(siteId, {
			id: siteId,
			multiSite: MultiSite.Subdir,
		});
	});

	ipcMain.on(
		'update-custom-config',
		async (event, siteId, sitePath, rootPath, imageURL) => {
			const config = __dirname + '/conf/site.conf.hbs';

			let confPath = sitePath + '/conf/nginx/site.conf.hbs';
			confPath = confPath.replace('~', process.env.HOME);

			try {
				fileSystem.readFile(config, 'utf8', (error, data) => {
					if (error) throw error;

					// Replace the root path and image URL.
					data = data.replace('{{root}}', rootPath);
					data = data.replace('{{image_url}}', imageURL);

					fileSystem.writeFile(confPath, data, error => {
						if (error) throw error;

						localLogger?.log(
							'info',
							`site.conf updated for ${siteId}`
						);

						// TODO: Update from deprecated method.
						SiteData.updateSite(siteId, {
							id: siteId,
							// @ts-ignore
							rootPath: rootPath,
							imageURL: imageURL,
						});

						// Restart site on save.
						siteProcessManager.restart(SiteData.getSite(siteId));
					});
				});
			} catch (error) {
				context.notifier.notify({
					title: 'Nginx config failed',
					message: String(error),
				});

				localLogger?.log(
					'info',
					`Error moving site.conf ${siteId}: ${error}`
				);
			}
		}
	);
}
