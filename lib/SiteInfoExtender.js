"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const local_components_1 = require("@getflywheel/local-components");
const react_1 = __importStar(require("react"));
const electron_1 = require("electron");
const SiteInfoExtender = ({ site }) => {
    // const [rootPath, setRootPath] = useState('{{root}}');
    // const [imageURL, setImageURL] = useState(`http://${site.domain}`);
    // const [updating, setUpdating] = useState(false);
    const [state, setState] = react_1.useReducer((s, a) => (Object.assign(Object.assign({}, s), a)), {
        rootPath: '{{root}}',
        imageURL: `http://${site.domain}`,
        updating: false,
    });
    const { rootPath, imageURL, updating, } = state;
    react_1.useEffect(() => {
        if (site.id) {
            // Update when switching sites.
            // setRootPath(site?.rootPath || '{{root}}');
            // setImageURL(site?.imageURL || `http://${site.domain}`);
            setState({
                rootPath: (site === null || site === void 0 ? void 0 : site.rootPath) || '{{root}}',
                imageURL: (site === null || site === void 0 ? void 0 : site.imageURL) || `http://${site.domain}`,
                updating: false,
            });
        }
    }, [site.id]);
    const saveCustomConfig = () => {
        setState({ updating: true });
        electron_1.ipcRenderer.send('update-custom-config', site.id, site.path, rootPath, imageURL);
        const timeout = setTimeout(() => {
            setState({ updating: false });
        }, 2000);
    };
    const saveMultiSiteConfig = () => {
        setState({ updating: true });
        electron_1.ipcRenderer.send('update-multisite-config', site.id, site.path);
        const timeout = setTimeout(() => {
            setState({ updating: false });
        }, 2000);
    };
    return (react_1.default.createElement(react_1.default.Fragment, null,
        site.multiSite &&
            react_1.default.createElement(local_components_1.TableListRow, { key: "fixmultisite", label: " " },
                react_1.default.createElement(local_components_1.TextButton, { disabled: updating ? "true" : "", style: { paddingLeft: 0, float: 'right' }, onClick: saveMultiSiteConfig }, "Fix multisite config")),
        react_1.default.createElement(local_components_1.TableListRow, { key: "rootpath", label: "Root Path" },
            react_1.default.createElement(local_components_1.BasicInput, { value: rootPath, className: "inputText", onChange: event => {
                    // setRootPath(event.target.value);
                    setState({ rootPath: event.target.value });
                } })),
        react_1.default.createElement(local_components_1.TableListRow, { key: "remote-images", label: "Remote Image URL" },
            react_1.default.createElement(local_components_1.BasicInput, { value: imageURL, className: "inputText", onChange: event => {
                    // setImageURL( event.target.value );
                    setState({ imageURL: event.target.value });
                } }),
            react_1.default.createElement(local_components_1.Text, { size: "caption" }, "Note: This will throw a 502 error if the url is invalid.")),
        react_1.default.createElement(local_components_1.TableListRow, { key: "save", label: " " },
            react_1.default.createElement(local_components_1.TextButton, { disabled: updating ? "true" : "", style: { paddingLeft: 0, float: 'right' }, onClick: saveCustomConfig }, updating ? 'Applied' : 'Apply'))));
};
exports.default = SiteInfoExtender;
//# sourceMappingURL=SiteInfoExtender.js.map