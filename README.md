# Project Base LocalWP Addon.
A helper addon for LocalWP.

<img width="675" alt="image" src="https://user-images.githubusercontent.com/26359210/204556505-72c969a7-eeb0-4e1b-9499-0cae33ce8288.png">


## Features

### Multisite Config fixer.
Updates the nginx config to support our project base multisite setup.

### Root Path.
Adds a input field to change the projects root path. Often legacy projects requires you to have a root path like this: "{{root}}/web" etc.

Absolute path should also work. like this: "/Users/username/Sites/project-name/web"

### Remote Images through NGINX config.
This allows you to type in the production url and it will use that url to fetch images.

## Installation

* Download the zip file from the releases page.
* Go to LocalWP and press the "Addons" tab in the sidebar.
* Press the "Installed" tab.
* Then click the "Install from disk" button at the top right.
* Activate and relaunch localWP.

## Development

* Use Node v16
* `npm install` installs dependencies.
* `npm start` Starts the renderer process.
* `npm start:main` Starts the main.ts process.

### Useful Links

- @getflywheel/local provides type definitions for Local's Add-on API.
	- Node Module: https://www.npmjs.com/package/@getflywheel/local-components
	- GitHub Repo: https://github.com/getflywheel/local-components

- @getflywheel/local-components provides reusable React components to use in your Local add-on.
	- Node Module: https://www.npmjs.com/package/@getflywheel/local
	- GitHub Repo: https://github.com/getflywheel/local-addon-api
	- Style Guide: https://getflywheel.github.io/local-components
