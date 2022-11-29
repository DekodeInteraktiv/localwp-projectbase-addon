"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const SiteInfoExtender_1 = __importDefault(require("./SiteInfoExtender"));
const packageJSON = fs_extra_1.default.readJsonSync(path_1.default.join(__dirname, '../package.json'));
const addonName = packageJSON['productName'];
const addonID = packageJSON['slug'];
function default_1(context) {
    const { React, hooks } = context;
    /**
     * Stylesheets.
     */
    const stylesheetPath = path_1.default.resolve(__dirname, '../style.css');
    hooks.addContent('stylesheets', () => React.createElement("link", { rel: "stylesheet", key: "dekode-styleesheet", href: stylesheetPath }));
    /**
     * Add fields to the Overview tab
     */
    hooks.addContent('SiteInfoOverview_TableList', (site) => React.createElement(SiteInfoExtender_1.default, { key: "siteinfo", site: site }));
}
exports.default = default_1;
//# sourceMappingURL=renderer.js.map