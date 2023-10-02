import {
	TableListRow,
	TextButton,
	BasicInput,
	Text,
} from '@getflywheel/local-components';

import React, { useEffect, useState, useReducer } from 'react';
import { ipcRenderer } from 'electron';

const SiteInfoExtender = ({ site }) => {
	const [state, setState] = useReducer((s, a) => ({ ...s, ...a }), {
		rootPath: '{{root}}',
		imageURL: `http://${site.domain}`,
		updating: false,
	});

	const { rootPath, imageURL, updating } = state;

	useEffect(() => {
		if (site.id) {
			setState({
				rootPath: site?.rootPath || '{{root}}',
				imageURL: site?.imageURL || `http://${site.domain}`,
				updating: false,
			});
		}
	}, [site.id]);

	const saveCustomConfig = () => {
		setState({ updating: true });

		ipcRenderer.send(
			'update-custom-config',
			site.id,
			site.path,
			rootPath,
			imageURL
		);

		const timeout = setTimeout(() => {
			setState({ updating: false });
		}, 2000);
	};

	const saveMultiSiteConfig = () => {
		setState({ updating: true });

		ipcRenderer.send('update-multisite-config', site.id, site.path);

		const timeout = setTimeout(() => {
			setState({ updating: false });
		}, 2000);
	};

	const convertToMultiSite = () => {
		setState({ updating: true });

		ipcRenderer.send('update-multisite-config', site.id, site.path);

		ipcRenderer.send('convert-to-multisite', site.id);

		const timeout = setTimeout(() => {
			setState({ updating: false });
		}, 2000);
	};

	return (
		<>
			{site.multiSite && (
				<TableListRow key='fixmultisite' label=' '>
					<TextButton
						disabled={updating ? 'true' : ''}
						style={{ paddingLeft: 0, float: 'right' }}
						onClick={saveMultiSiteConfig}
					>
						Fix multisite config
					</TextButton>
				</TableListRow>
			)}
			{!site?.multiSite && (
				<TableListRow key='convertMultisite' label=' '>
					<TextButton
						disabled={updating ? 'true' : ''}
						style={{ paddingLeft: 0, float: 'right' }}
						onClick={convertToMultiSite}
					>
						Convert to multisite (subdir)
					</TextButton>
				</TableListRow>
			)}
			<TableListRow key='rootpath' label='Root Path'>
				<BasicInput
					value={rootPath}
					className='inputText'
					onChange={event => {
						// setRootPath(event.target.value);
						setState({ rootPath: event.target.value });
					}}
				/>
			</TableListRow>
			<TableListRow key='remote-images' label='Remote Image URL'>
				<BasicInput
					value={imageURL}
					className='inputText'
					onChange={event => {
						// setImageURL( event.target.value );
						setState({ imageURL: event.target.value });
					}}
				/>
				<Text size='caption'>
					Note: This will throw a 502 error if the url is invalid.
				</Text>
			</TableListRow>
			<TableListRow key='save' label=' '>
				<TextButton
					disabled={updating ? 'true' : ''}
					style={{ paddingLeft: 0, float: 'right' }}
					onClick={saveCustomConfig}
				>
					{updating ? 'Applied' : 'Apply'}
				</TextButton>
			</TableListRow>
		</>
	);
};

export default SiteInfoExtender;
