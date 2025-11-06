"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// https://getflywheel.github.io/local-addon-api/modules/_local_main_.html
const main_1 = require("@getflywheel/local/main");
const local_1 = require("@getflywheel/local");
const path = __importStar(require("path"));
const ServiceContainer = (0, main_1.getServiceContainer)();
const normalizeSitePath = (sitePath) => sitePath.replace(/^~/, process.env.HOME || '');
const fileExists = (fileSystem, target) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield fileSystem.access(target);
        return true;
    }
    catch (_a) {
        return false;
    }
});
const isDirectory = (fileSystem, directory) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield fileSystem.stat(directory);
        return stats.isDirectory();
    }
    catch (_b) {
        return false;
    }
});
const collectPhpIniPaths = (fileSystem, confRoot) => __awaiter(void 0, void 0, void 0, function* () {
    const paths = [];
    const basePath = path.join(confRoot, 'php', 'php.ini.hbs');
    if (yield fileExists(fileSystem, basePath)) {
        paths.push(basePath);
    }
    let entries;
    try {
        entries = yield fileSystem.readdir(confRoot);
    }
    catch (error) {
        throw new Error(`Unable to read PHP config directory: ${error}`);
    }
    for (const entry of entries) {
        if (!entry.startsWith('php-')) {
            continue;
        }
        const versionDir = path.join(confRoot, entry);
        if (!(yield isDirectory(fileSystem, versionDir))) {
            continue;
        }
        const iniPath = path.join(versionDir, 'php.ini.hbs');
        if (yield fileExists(fileSystem, iniPath)) {
            paths.push(iniPath);
        }
    }
    return paths;
});
const rewriteCafileEntry = (original, caBundlePath, fileExists) => {
    const newline = original.includes('\r\n') ? '\r\n' : '\n';
    const lines = original.split(/\r?\n/);
    let changed = false;
    const updatedLines = lines.map(line => {
        var _a, _b;
        if (!line.trim().startsWith('openssl.cafile')) {
            return line;
        }
        const leadingWhitespace = (_b = (_a = line.match(/^\s*/)) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : '';
        // If file exists, use hardcoded path
        if (fileExists) {
            const replacement = `${leadingWhitespace}openssl.cafile = "${caBundlePath}"`;
            if (line === replacement) {
                return line;
            }
            changed = true;
            return replacement;
        }
        else {
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
const updatePhpConfigs = (fileSystem, phpIniPaths, caBundlePath, caBundleExists, localLogger) => __awaiter(void 0, void 0, void 0, function* () {
    let changed = false;
    const errors = [];
    for (const iniPath of phpIniPaths) {
        try {
            const original = yield fileSystem.readFile(iniPath, 'utf8');
            const { content, changed: fileChanged } = rewriteCafileEntry(original, caBundlePath, caBundleExists);
            if (fileChanged) {
                yield fileSystem.writeFile(iniPath, content, 'utf8');
                changed = true;
            }
        }
        catch (error) {
            errors.push(`${path.basename(iniPath)}: ${error}`);
            localLogger === null || localLogger === void 0 ? void 0 : localLogger.log('info', `Error updating ${iniPath}: ${error}`);
        }
    }
    return { changed, errors };
});
function default_1(context) {
    const { electron, fileSystem } = context;
    const { siteProcessManager, localLogger } = ServiceContainer.cradle;
    const { ipcMain } = electron;
    ipcMain.on('update-multisite-config', (event, siteId, sitePath) => __awaiter(this, void 0, void 0, function* () {
        const config = __dirname + '/conf/wordpress-multi.conf.hbs';
        let confPath = sitePath + '/conf/nginx/includes/wordpress-multi.conf.hbs';
        confPath = confPath.replace('~', process.env.HOME);
        try {
            // Check if the file exists
            try {
                yield fileSystem.access(confPath, fileSystem.constants.F_OK);
            }
            catch (error) {
                // If the file doesn't exist, create it
                yield fileSystem.writeFile(confPath, ''); // Initialize with an empty string or some default content
            }
            // Then copy your config file over
            yield fileSystem.copyFile(config, confPath);
            siteProcessManager.restart(main_1.SiteData.getSite(siteId));
        }
        catch (error) {
            context.notifier.notify({
                title: 'Nginx multisite config failed',
                message: String(error),
            });
            localLogger === null || localLogger === void 0 ? void 0 : localLogger.log('info', `Error moving wordpress-multi.conf ${siteId}: ${error}`);
        }
    }));
    ipcMain.on('fix-ssl-config', (event, siteId, sitePath) => __awaiter(this, void 0, void 0, function* () {
        if (!sitePath) {
            context.notifier.notify({
                title: 'SSL config update failed',
                message: 'Missing site path.',
            });
            return;
        }
        const resolvedSitePath = normalizeSitePath(sitePath);
        const confRoot = path.join(resolvedSitePath, 'conf');
        let phpIniPaths;
        try {
            phpIniPaths = yield collectPhpIniPaths(fileSystem, confRoot);
        }
        catch (error) {
            context.notifier.notify({
                title: 'SSL config update failed',
                message: String(error),
            });
            localLogger === null || localLogger === void 0 ? void 0 : localLogger.log('info', `Unable to collect php.ini paths for ${siteId}: ${error}`);
            return;
        }
        if (phpIniPaths.length === 0) {
            context.notifier.notify({
                title: 'SSL config update',
                message: 'No php.ini.hbs files found. Nothing to update.',
            });
            return;
        }
        const wpCaBundlePath = path.join(resolvedSitePath, 'app', 'public', 'wp', 'wp-includes', 'certificates', 'ca-bundle.crt');
        const caBundleExists = yield fileExists(fileSystem, wpCaBundlePath);
        const { changed, errors } = yield updatePhpConfigs(fileSystem, phpIniPaths, wpCaBundlePath, caBundleExists, localLogger);
        if (errors.length) {
            context.notifier.notify({
                title: 'SSL config update failed',
                message: 'One or more php.ini.hbs files could not be updated. Check Local logs for details.',
            });
            return;
        }
        if (changed) {
            context.notifier.notify({
                title: 'SSL config updated',
                message: 'openssl.cafile path updated. Restarting the site to apply changes.',
            });
            try {
                siteProcessManager.restart(main_1.SiteData.getSite(siteId));
            }
            catch (error) {
                localLogger === null || localLogger === void 0 ? void 0 : localLogger.log('info', `Failed to restart site ${siteId} after SSL update: ${error}`);
            }
        }
        else {
            context.notifier.notify({
                title: 'SSL config update',
                message: 'No changes were necessary.',
            });
        }
    }));
    ipcMain.on('convert-to-multisite', (event, siteId) => __awaiter(this, void 0, void 0, function* () {
        main_1.SiteData.updateSite(siteId, {
            id: siteId,
            multiSite: local_1.MultiSite.Subdir,
        });
    }));
    ipcMain.on('update-custom-config', (event, siteId, sitePath, rootPath, imageURL) => __awaiter(this, void 0, void 0, function* () {
        const config = __dirname + '/conf/site.conf.hbs';
        let confPath = sitePath + '/conf/nginx/site.conf.hbs';
        confPath = confPath.replace('~', process.env.HOME);
        try {
            fileSystem.readFile(config, 'utf8', (error, data) => {
                if (error)
                    throw error;
                // Replace the root path and image URL.
                data = data.replace('{{root}}', rootPath);
                data = data.replace('{{image_url}}', imageURL);
                fileSystem.writeFile(confPath, data, error => {
                    if (error)
                        throw error;
                    localLogger === null || localLogger === void 0 ? void 0 : localLogger.log('info', `site.conf updated for ${siteId}`);
                    // TODO: Update from deprecated method.
                    main_1.SiteData.updateSite(siteId, {
                        id: siteId,
                        // @ts-ignore
                        rootPath: rootPath,
                        imageURL: imageURL,
                    });
                    // Restart site on save.
                    siteProcessManager.restart(main_1.SiteData.getSite(siteId));
                });
            });
        }
        catch (error) {
            context.notifier.notify({
                title: 'Nginx config failed',
                message: String(error),
            });
            localLogger === null || localLogger === void 0 ? void 0 : localLogger.log('info', `Error moving site.conf ${siteId}: ${error}`);
        }
    }));
}
exports.default = default_1;
//# sourceMappingURL=main.js.map