// https://getflywheel.github.io/local-addon-api/modules/_local_main_.html
import {
	getServiceContainer,
	SiteData,
} from '@getflywheel/local/main';

const ServiceContainer = getServiceContainer();

export default function (context) {
	const { electron, fileSystem } = context;
	const { siteProcessManager } = ServiceContainer.cradle;
	const { ipcMain } = electron;

	ipcMain.on('update-multisite-config', async (event, siteId, sitePath) => {
		const config = __dirname + '/conf/wordpress-multi.conf.hbs';

		let confPath = sitePath + '/conf/nginx/includes/wordpress-multi.conf.hbs';
		confPath     = confPath.replace('~', process.env.HOME);

		try {
			await fileSystem.copyFile(config, confPath);
			siteProcessManager.restart( SiteData.getSite( siteId ) );
		} catch (error) {
			context.notifier.notify({  
				title: 'Nginx multisite config failed',  
				message: String(error),
			});

			ServiceContainer.cradle.localLogger.log('info', `Error moving wordpress-multi.conf ${siteId}: ${error}`);
		}
	} );

	ipcMain.on('update-custom-config', async ( event, siteId, sitePath, rootPath, imageURL ) => {
		const config = __dirname + '/conf/site.conf.hbs';

		let confPath = sitePath + '/conf/nginx/site.conf.hbs';
		confPath     = confPath.replace('~', process.env.HOME);

		try {
			fileSystem.readFile( config, 'utf8', ( error, data ) => {
				if (error) throw error;

				// Replace the root path and image URL.
				data = data.replace("{{root}}", rootPath);
				data = data.replace("{{image_url}}", imageURL);

				fileSystem.writeFile( confPath, data, (error) => {
					if (error) throw error;

					ServiceContainer.cradle.localLogger.log('info', `site.conf updated for ${siteId}`);

					// TODO: Update from deprecated method.
					SiteData.updateSite(siteId, {
						id: siteId,
						// @ts-ignore
						rootPath: rootPath,
						imageURL: imageURL,
					});

					// Restart site on save.
					siteProcessManager.restart( SiteData.getSite( siteId ) );
				} );
			} );

		} catch (error) {
			context.notifier.notify({  
				title: 'Nginx config failed',  
				message: String(error),
			});

			ServiceContainer.cradle.localLogger.log('info', `Error moving site.conf ${siteId}: ${error}`);
		}
	});
}
