import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {C, SCENES} from './config';
import {Background, Hud} from './components/ui';
import {loadFonts} from './fonts';
import {S1Hook} from './scenes/S1Hook';
import {S2Problem} from './scenes/S2Problem';
import {S3Connection} from './scenes/S3Connection';
import {S4Prompt} from './scenes/S4Prompt';
import {S5Katana} from './scenes/S5Katana';
import {S6Result} from './scenes/S6Result';
import {S7Workflow} from './scenes/S7Workflow';
import {S8Time} from './scenes/S8Time';
import {S9Final} from './scenes/S9Final';
import {rnd} from './utils';

loadFonts();

const ORDER: [keyof typeof SCENES, React.FC][] = [
  ['hook', S1Hook],
  ['problem', S2Problem],
  ['connection', S3Connection],
  ['prompt', S4Prompt],
  ['katana', S5Katana],
  ['result', S6Result],
  ['workflow', S7Workflow],
  ['time', S8Time],
  ['final', S9Final],
];

/** Short glitch slices on every scene cut. */
const CutGlitch: React.FC = () => {
  const f = useCurrentFrame();
  const cut = ORDER.map(([k]) => SCENES[k].from).find((c) => c > 0 && f >= c && f < c + 4);
  if (cut === undefined) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {new Array(6).fill(0).map((_, i) => {
        const y = rnd(`cg${f}${i}`) * 1920;
        const h = 6 + rnd(`ch${f}${i}`) * 50;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: y,
              height: h,
              background: i % 2 ? C.lime : 'rgba(244,244,244,0.6)',
              opacity: 0.35,
              transform: `translateX(${(rnd(`cx${f}${i}`) - 0.5) * 400}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}} lang="bg">
      <Background />
      {ORDER.map(([k, Comp]) => (
        <Sequence key={k} from={SCENES[k].from} durationInFrames={SCENES[k].dur} name={k}>
          <Comp />
        </Sequence>
      ))}
      <Hud />
      <CutGlitch />
    </AbsoluteFill>
  );
};
