import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export const Teste: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const scale = spring({frame, fps, config: {damping: 12}});
	const opacity = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});

	return (
		<AbsoluteFill style={{background: '#0b1220', justifyContent: 'center', alignItems: 'center'}}>
			<h1 style={{color: 'white', fontFamily: 'Inter, sans-serif', fontSize: 96, opacity, transform: `scale(${scale})`}}>
				BordadoHUB
			</h1>
		</AbsoluteFill>
	);
};
