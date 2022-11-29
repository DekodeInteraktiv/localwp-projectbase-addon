"use strict";
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
const ServiceContainer = main_1.getServiceContainer();
function default_1(context) {
    const { electron, fileSystem } = context;
    const { siteProcessManager } = ServiceContainer.cradle;
    const { ipcMain } = electron;
    ipcMain.on('update-multisite-config', (event, siteId, sitePath) => __awaiter(this, void 0, void 0, function* () {
        const config = __dirname + '/conf/wordpress-multi.conf.hbs';
        let confPath = sitePath + '/conf/nginx/includes/wordpress-multi.conf.hbs';
        confPath = confPath.replace('~', process.env.HOME);
        try {
            yield fileSystem.copyFile(config, confPath);
            siteProcessManager.restart(main_1.SiteData.getSite(siteId));
        }
        catch (error) {
            context.notifier.notify({
                title: 'Nginx multisite config failed',
                message: String(error),
            });
            ServiceContainer.cradle.localLogger.log('info', `Error moving wordpress-multi.conf ${siteId}: ${error}`);
        }
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
                data = data.replace("{{root}}", rootPath);
                data = data.replace("{{image_url}}", imageURL);
                fileSystem.writeFile(confPath, data, (error) => {
                    if (error)
                        throw error;
                    ServiceContainer.cradle.localLogger.log('info', `site.conf updated for ${siteId}`);
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
            ServiceContainer.cradle.localLogger.log('info', `Error moving site.conf ${siteId}: ${error}`);
        }
    }));
}
exports.default = default_1;
//# sourceMappingURL=main.js.map