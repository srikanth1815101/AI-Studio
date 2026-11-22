import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'};
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const FONT = 'Inter, ui-sans-serif, system-ui, Arial, sans-serif';
const smooth = (frame, start, end) => interpolate(frame, [start, end], [0, 1], {...clamp, easing: ease});
const countAt = (frame, total) => Math.round(interpolate(frame, [130, 870], [0, Math.max(0, Number(total) || 0)], {...clamp, easing: Easing.out(Easing.cubic)}));
const safeColor = (value) => /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#ffc542';
const redactPrivateHandles = (value) => String(value || '').replace(/@[A-Za-z0-9._]+/g, 'private account');
const activeShotAt = (frame, shots) => {
  let start = 0;
  for (const shot of Array.isArray(shots) ? shots : []) {
    const end = start + Number(shot.durationSeconds || 0) * 30;
    if (frame < end) return {shot, start};
    start = end;
  }
  return null;
};

function CaptureRequired() {
  return <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 42%,#52785f 0%,#294a3b 48%,#162f27 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT,color:'#fffdf2',textAlign:'center',padding:90}}>
    <div style={{maxWidth:820,border:'1px solid rgba(255,255,255,.3)',borderRadius:32,padding:'54px 48px',background:'rgba(10,31,23,.4)',boxShadow:'0 28px 90px rgba(0,0,0,.25)'}}>
      <div style={{fontSize:21,letterSpacing:5,fontWeight:850,color:'#f6c84f'}}>REAL ATLAS FOOTAGE ONLY</div>
      <div style={{fontSize:62,fontWeight:950,lineHeight:1.04,marginTop:24}}>Capture the 3D world first.</div>
      <div style={{fontSize:27,lineHeight:1.45,opacity:.82,marginTop:24}}>Run the local Hugo atlas, then <b>npm run atlas:capture</b>. This video intentionally does not invent terrain, roads, parcels, or houses.</div>
    </div>
  </AbsoluteFill>;
}

function GlassCard({children, style = {}}) {
  return <div style={{background:'rgba(14,36,28,.79)',border:'1px solid rgba(255,255,255,.33)',boxShadow:'0 12px 42px rgba(0,0,0,.25)',backdropFilter:'blur(14px)',borderRadius:23,color:'#fffdf2',fontFamily:FONT,...style}}>{children}</div>;
}

function TopHud({frame, district, districtTelugu, locationLabel, accent, totalFollowers, newHomes, state}) {
  const appear = smooth(frame, 0, 22);
  const count = countAt(frame, newHomes);
  return <div style={{position:'absolute',top:72,left:54,right:54,opacity:appear,fontFamily:FONT,color:'#fffdf3',textAlign:'center',textShadow:'0 3px 14px rgba(0,0,0,.52)'}}>
    <div style={{fontSize:20,fontWeight:850,letterSpacing:5}}>TELUGU STATES <span style={{opacity:.66}}>·</span> COMMUNITY ATLAS</div>
    <GlassCard accent={accent} style={{display:'inline-flex',alignItems:'center',gap:13,marginTop:17,padding:'10px 21px',fontSize:25,fontWeight:800}}>
      {locationLabel ? <span>{locationLabel}</span> : <><span>{districtTelugu || district}</span><span style={{opacity:.55}}>·</span><span>{district}</span>{state && <><span style={{opacity:.45}}>·</span><span style={{fontSize:18,opacity:.82}}>{state}</span></>}</>}
    </GlassCard>
    {Number(newHomes) > 0 && <div style={{margin:'16px auto 0',display:'flex',alignItems:'baseline',justifyContent:'center',gap:12}}>
      <span style={{fontSize:83,lineHeight:1,fontWeight:950,letterSpacing:-4,color:accent,WebkitTextStroke:'1px rgba(27,28,18,.35)'}}>{count}</span>
      <span style={{fontSize:27,fontWeight:900,letterSpacing:1}}>NEW HOMES</span>
    </div>}
    {Number(totalFollowers) > 0 && <div style={{marginTop:7,fontSize:18,fontWeight:750,letterSpacing:2}}>{Number(totalFollowers).toLocaleString('en-IN')} {Number(totalFollowers) === 1 ? 'RESIDENT' : 'RESIDENTS'} IN THE WORLD</div>}
  </div>;
}

function Hook({frame, text}) {
  const opacity = interpolate(frame, [0, 18, 124, 160], [0, 1, 1, 0], clamp);
  return <div style={{position:'absolute',left:70,right:70,top:575,opacity,textAlign:'center',fontFamily:FONT,color:'#fffdf3',fontWeight:950,fontSize:50,lineHeight:1.12,textShadow:'0 5px 22px rgba(0,0,0,.78)'}}>{redactPrivateHandles(text || 'A real home in a real district.')}</div>;
}

function ShotCaption({frame, shots, accent}) {
  const active = activeShotAt(frame, shots);
  const current = active?.shot;
  if (!current?.title) return null;
  const title = redactPrivateHandles(current.title);
  const enter = smooth(frame, active.start, active.start + 18);
  return <div style={{position:'absolute',left:62,right:62,bottom:330,opacity:enter,textAlign:'center',fontFamily:FONT,color:'#fffdf2',textShadow:'0 3px 14px rgba(0,0,0,.72)',transform:`translateY(${(1-enter)*20}px)`}}>
    <GlassCard accent={accent} style={{display:'inline-block',maxWidth:860,padding:'14px 22px',fontSize:title.length > 48 ? 22 : 27,lineHeight:1.16,fontWeight:850,overflowWrap:'anywhere'}}>{title}</GlassCard>
  </div>;
}

function EndCard({frame, closingLine, accent}) {
  const opacity = smooth(frame, 1040, 1074);
  if (!opacity) return null;
  return <div style={{position:'absolute',left:45,right:45,bottom:154,opacity,transform:`translateY(${(1-opacity)*28}px)`}}>
    <GlassCard accent={accent} style={{textAlign:'center',padding:'27px 25px 29px',border:`2px solid ${accent}`,background:'rgba(16,42,31,.91)'}}>
      <div style={{fontSize:18,fontWeight:850,letterSpacing:4,color:accent}}>YOUR DISTRICT. YOUR HOME.</div>
      <div style={{fontSize:34,fontWeight:950,lineHeight:1.14,marginTop:11}}>{redactPrivateHandles(closingLine || 'Comment your district to get a home.')}</div>
      <div style={{fontSize:18,fontWeight:700,marginTop:14,opacity:.8}}>Follow the build · Build the atlas together</div>
    </GlassCard>
  </div>;
}

function Footer({frame, accent}) {
  const opacity = smooth(frame, 20, 50) * (1 - smooth(frame, 1110, 1180) * .4);
  const progress = interpolate(frame, [40, 1160], [0, 1], clamp);
  return <div style={{position:'absolute',left:62,right:62,bottom:57,opacity,fontFamily:FONT,color:'#fffdf2',textShadow:'0 2px 10px rgba(0,0,0,.6)'}}>
    <div style={{display:'flex',justifyContent:'space-between',fontSize:15,fontWeight:850,letterSpacing:3}}><span>TELUGU STATES ATLAS</span><span>FOLLOW THE BUILD</span></div>
    <div style={{height:4,marginTop:13,background:'rgba(255,255,255,.35)',borderRadius:8}}><div style={{width:`${progress*100}%`,height:'100%',background:accent,borderRadius:8}} /></div>
  </div>;
}

export const CommunityShort = (props) => {
  const frame = useCurrentFrame();
  const accent = safeColor(props.accentColor);
  const footage = typeof props.mapFootage === 'string' ? props.mapFootage.trim() : '';
  const activeLocation = activeShotAt(frame, props.atlasShots)?.shot;
  return <AbsoluteFill style={{background:'#18352b',overflow:'hidden',fontFamily:FONT}}>
    {footage ? <OffthreadVideo src={staticFile(footage)} muted playbackRate={1} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} /> : <CaptureRequired />}
    <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(7,27,20,.45) 0%,transparent 30%,transparent 67%,rgba(7,25,19,.4) 100%)',pointerEvents:'none'}} />
    <TopHud frame={frame} district={props.district} districtTelugu={props.districtTelugu} locationLabel={activeLocation?.locationLabel} state={props.state} accent={accent} totalFollowers={props.totalFollowers} newHomes={props.newHomes} />
    <Hook frame={frame} text={props.openingLine} />
    <ShotCaption frame={frame} shots={props.atlasShots} accent={accent} />
    <EndCard frame={frame} closingLine={props.closingLine} accent={accent} />
    <Footer frame={frame} accent={accent} />
  </AbsoluteFill>;
};
