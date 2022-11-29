import fs from 'fs-extra';
import path from 'path';
import SiteInfoExtender from './SiteInfoExtender';


const packageJSON = fs.readJsonSync(path.join(__dirname, '../package.json'));
const addonName = packageJSON['productName'];
const addonID = packageJSON['slug'];

export default function (context) {
	const { React, hooks } = context;

	/**
	 * Stylesheets.
	 */
	const stylesheetPath = path.resolve(__dirname, '../style.css');
	hooks.addContent('stylesheets', () => <link rel="stylesheet" key="dekode-styleesheet" href={stylesheetPath} />);

	/**
	 * Add fields to the Overview tab
	 */
	hooks.addContent('SiteInfoOverview_TableList', (site) => <SiteInfoExtender key="siteinfo" site={site} />);
}
