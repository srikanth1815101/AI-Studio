import React from 'react';
import {Composition} from 'remotion';
import {CommunityShort} from './video/CommunityShort.jsx';
import defaultData from '../video-data.json';

export const RemotionRoot = () => (
  <Composition
    id="CommunityShort"
    component={CommunityShort}
    durationInFrames={1200}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={defaultData}
  />
);
