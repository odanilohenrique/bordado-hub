import React from 'react';
import {Composition} from 'remotion';
import {Teste} from './Teste';

export const Root: React.FC = () => (
	<Composition
		id="Teste"
		component={Teste}
		durationInFrames={90}
		fps={30}
		width={1280}
		height={720}
	/>
);
