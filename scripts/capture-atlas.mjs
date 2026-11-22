import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import puppeteer from 'puppeteer-core';

const root = path.resolve(import.meta.dirname, '..');
const dataPath = path.resolve(process.argv[2] || path.join(root, 'video-data.json'));
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const shots = data.atlasShots;
const redactPrivateHandles = (value) => String(value || '').replace(/@[A-Za-z0-9._]+/g, '[private account]');
const totalSeconds = Array.isArray(shots) ? shots.reduce((sum, shot) => sum + Number(shot.durationSeconds || 0), 0) : 0;
if (!Array.isArray(shots) || shots.length === 0 || Math.abs(totalSeconds - 40) > 0.001) {
  throw new Error(`atlasShots must be a non-empty list totaling exactly 40 seconds (currently ${totalSeconds}s).`);
}

const outputName = data.mapFootage || 'atlas-camera.webm';
const relativeOutput = outputName.replaceAll('\\', '/').replace(/^public\//, '');
if (relativeOutput.startsWith('/') || relativeOutput.split('/').includes('..')) throw new Error('mapFootage must be a safe filename inside public/.');
const outputPath = path.join(root, 'public', relativeOutput);
const temporaryOutputPath = `${outputPath}.partial`;
fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.rmSync(temporaryOutputPath, {force: true});

function findBrowser() {
  const choices = [
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome',
  ].filter(Boolean);
  const roots = [path.join(root, 'node_modules/.remotion'), path.join(os.homedir(), '.cache/remotion'), path.join(os.homedir(), '.cache/puppeteer'), path.join(os.homedir(), '.cache/ms-playwright')];
  for (const base of roots) {
    if (!fs.existsSync(base)) continue;
    const stack = [base];
    while (stack.length) {
      const dir = stack.pop();
      let entries = [];
      try { entries = fs.readdirSync(dir, {withFileTypes: true}); } catch { continue; }
      for (const item of entries) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) stack.push(full);
        else if (item.isFile() && /^(chrome-headless-shell|chrome|chromium)$/.test(item.name)) choices.push(full);
      }
    }
  }
  return choices.find((candidate) => fs.existsSync(candidate));
}
const executablePath = findBrowser();
if (!executablePath) {
  throw new Error('Chrome/Chromium is required. Set CHROME_BIN, or install a Chromium browser and retry. The atlas capture refuses to fake or low-resolution render the 3D world.');
}

const siteUrl = process.env.ATLAS_URL || data.atlasURL || 'http://127.0.0.1:1313/';
const startShot = shots.find((shot) => ['place', 'resident'].includes(shot.action));
let startHash = '#/field/village/far';
if (startShot?.action === 'place') startHash = `#/field/${encodeURIComponent(startShot.id)}/${encodeURIComponent(startShot.view || 'far')}`;
if (startShot?.action === 'resident') startHash = `#/u/${encodeURIComponent(startShot.handle)}`;
const startUrl = new URL(siteUrl);
startUrl.hash = startHash;

const settings = {
  third: true,
  relief: 2,
  season: 'auto',
  weather: 'Clear',
  reduceFlash: true,
  time: 'golden',
  hour: 17,
  quality: 'high',
  life: false,
  motion: false,
  walker: 'woman',
  left: false,
  hideMini: true,
  hideCompact: true,
  invert: false,
  recenter: true,
  haptics: false,
  saver: false,
  gain: 0,
  ...(data.atlasSettings || {}),
  // Capture is a render job, not a mobile-preview pass. Never accept a low-tier setting.
  quality: data.atlasQuality || 'high',
  saver: false,
};
const errors = [];
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist'],
});
let page;
let stream;
try {
  const context = await browser.createBrowserContext();
  page = await context.newPage();
  await page.setViewport({width: 1080, height: 1920, deviceScaleFactor: 1, isMobile: false});
  await page.evaluateOnNewDocument((prefs) => {
    window.__atlasVideoPrivacy = true;
    try { localStorage.setItem('atlas-field-v5', JSON.stringify(prefs)); } catch {}
  }, settings);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  console.log(`Opening real atlas at ${startUrl.origin}${startUrl.pathname} (private route omitted from logs)`);
  await page.goto(startUrl.href, {waitUntil: 'domcontentloaded', timeout: 120000});
  await page.waitForFunction(() => Boolean(window.__atlasVideoControl && window.atlasWalk?.snapshot), {timeout: 180000});
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#world .flight-deck canvas');
    return canvas && canvas.width > 0 && canvas.height > 0 && window.atlasWalk?.snapshot?.().frames > 20;
  }, {timeout: 180000});
  if (await page.evaluate(() => Boolean(window.__atlasMapFallback))) throw new Error('The Atlas 3D renderer fell back to the 2D map. Use a WebGL2-capable browser/GPU and retry.');

  const getSnapshot = () => page.evaluate(() => {
    const canvas = document.querySelector('#world .flight-deck canvas');
    const s = window.atlasWalk.snapshot();
    return {
      canvas: canvas ? [canvas.width, canvas.height] : null,
      fps: s.fps,
      tier: s.tier,
      detectedTier: s.detectedTier,
      quality: s.settings?.quality,
      frames: s.frames,
      loadedTiles: s.loadedTiles?.length || 0,
      houses: s.houses || 0,
      camera: s.camera || [],
      focus: s.orbit || null,
      stop: s.stop,
    };
  });
  const first = await getSnapshot();
  if (first.canvas?.[0] !== 1080 || first.canvas?.[1] !== 1920 || first.tier !== 2) {
    throw new Error(`Refusing a soft/low-resolution capture: WebGL buffer=${first.canvas?.join('×') || 'missing'}, tier=${first.tier}, detected=${first.detectedTier}. Need a hardware-accelerated 1080×1920 capture context.`);
  }
  await delay(2000);
  const benchmark = await getSnapshot();
  const renderFps = (benchmark.frames - first.frames) / 2;
  if (benchmark.canvas?.[0] !== 1080 || benchmark.canvas?.[1] !== 1920 || benchmark.tier !== 2 || renderFps < 27) {
    throw new Error(`Refusing a soft/stuttering capture: WebGL ${benchmark.canvas?.join('×')}, tier=${benchmark.tier}, measured=${renderFps.toFixed(1)} fps. Need a hardware-accelerated 1080×1920 browser sustaining at least 27 fps.`);
  }
  console.log(`Atlas ready: ${first.canvas.join('×')} WebGL buffer, quality=${first.quality}, tier=${first.tier}, ${first.loadedTiles} terrain tiles, ${renderFps.toFixed(1)} fps.`);

  const waitForStableWorld = async (minimumMs = 1200) => {
    const deadline = Date.now() + 60000;
    let last = null;
    let stable = 0;
    const started = Date.now();
    while (Date.now() < deadline) {
      const current = await getSnapshot();
      if (current.canvas?.[0] !== 1080 || current.canvas?.[1] !== 1920 || current.tier !== 2) {
        throw new Error(`Atlas quality dropped during camera move: buffer=${current.canvas?.join('×')}, tier=${current.tier}. Aborting instead of recording a blurred pass.`);
      }
      const movement = last && current.camera.length === last.camera.length
        ? current.camera.reduce((sum, value, i) => sum + Math.abs(value - last.camera[i]), 0)
        : Infinity;
      const ready = current.frames > (last?.frames || 0) && current.loadedTiles > 0 && movement < 0.28;
      stable = ready ? stable + 1 : 0;
      if (stable >= 3 && Date.now() - started >= minimumMs) return current;
      last = current;
      await delay(350);
    }
    throw new Error(`Atlas camera/terrain did not settle in 60 seconds. Last snapshot: ${JSON.stringify(last)}`);
  };
  const applyShotSettings = async (shotSettings = {}) => {
    if (!Object.keys(shotSettings).length) return;
    await page.evaluate((values) => {
      const sheet = document.querySelector('#world .world-sheet');
      const menu = document.querySelector('#world #world-menu');
      const wasHidden = sheet?.hidden ?? true;
      if (wasHidden) menu?.click();
      const selectors = {season:'#season', weather:'#sim-weather', time:'#light', quality:'#quality'};
      for (const [key, selector] of Object.entries(selectors)) {
        if (values[key] === undefined) continue;
        const input = document.querySelector(`#world ${selector}`);
        if (!input || !Array.from(input.options).some((option) => option.value === String(values[key]))) throw new Error(`Unsupported Atlas ${key} setting: ${values[key]}`);
        if (input.value !== String(values[key])) {
          input.value = String(values[key]);
          input.dispatchEvent(new Event('change', {bubbles:true}));
        }
      }
      if (wasHidden && sheet && !sheet.hidden) document.querySelector('#world #hide-sheet')?.click();
    }, shotSettings);
  };
  const enterHouseIfRequested = async (shot) => {
    if (!shot.enterHouse) return;
    await page.waitForFunction(() => window.atlasWalk?.snapshot?.().doorAction === true, {timeout: 30000});
    await page.evaluate(() => document.querySelector('#world #use-door')?.click());
    await page.waitForFunction(() => Boolean(window.atlasWalk?.snapshot?.().room), {timeout: 30000});
  };
  const runAction = async (shot) => {
    await applyShotSettings(shot.settings);
    return page.evaluate(async (scene) => {
      const api = window.__atlasVideoControl;
      if (!api) throw new Error('Atlas camera bridge is not ready.');
      switch (scene.action) {
        case 'overview': return api.overview();
        case 'district': return api.district(scene.district);
        case 'place': return api.place(scene.id, scene.view || 'ground');
        case 'resident': return api.resident(scene.handle, scene.kind || 'gate');
        case 'acre': return api.resident(scene.handle, 'acre');
        case 'coordinate': return api.coordinate(scene.longitude, scene.latitude);
        case 'zoom': return api.zoom(scene.factor);
        default: throw new Error(`Unsupported atlas shot action: ${scene.action}`);
      }
    }, shot);
  };

  // Prewarm each authored destination. Terrain/house assets remain cached when
  // the camera flies between shots, so the final pass does not film tile pop-in.
  for (const [index, shot] of shots.entries()) {
    await runAction(shot);
    let snapshot = await waitForStableWorld(Math.max(800, Number(shot.settleSeconds || 1) * 1000));
    await enterHouseIfRequested(shot);
    if (shot.enterHouse) snapshot = await waitForStableWorld(1000);
    console.log(`Prewarmed ${index + 1}/${shots.length}: ${redactPrivateHandles(shot.title || shot.action)} · ${snapshot.houses} house(s) · ${snapshot.loadedTiles} tile(s) · ${snapshot.fps?.toFixed?.(1) || '?'} fps`);
  }
  await runAction(shots[0]);
  await waitForStableWorld(Number(shots[0].settleSeconds || 1) * 1000);
  await enterHouseIfRequested(shots[0]);

  stream = fs.createWriteStream(temporaryOutputPath);
  await page.exposeFunction('__atlasWriteChunk', async (base64) => {
    const buffer = Buffer.from(base64, 'base64');
    if (!stream.write(buffer)) await new Promise((resolve) => stream.once('drain', resolve));
  });
  await page.evaluate(async () => {
    const canvas = document.querySelector('#world .flight-deck canvas');
    if (!canvas || canvas.width !== 1080 || canvas.height !== 1920) throw new Error('Atlas canvas is not 1080×1920.');
    const capture = canvas.captureStream(30);
    window.__atlasCaptureStream = capture;
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm;codecs=vp8';
    const recorder = new MediaRecorder(capture, {mimeType, videoBitsPerSecond: 24_000_000});
    window.__atlasRecordQueue = Promise.resolve();
    recorder.ondataavailable = (event) => {
      if (!event.data.size) return;
      window.__atlasRecordQueue = window.__atlasRecordQueue.then(async () => {
        const bytes = new Uint8Array(await event.data.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        await window.__atlasWriteChunk(btoa(binary));
      });
    };
    window.__atlasRecorder = recorder;
    recorder.start(500);
  });

  const holdShot = async (seconds) => {
    const end = Date.now() + Number(seconds) * 1000;
    let probe = await getSnapshot();
    let probeAt = Date.now();
    while (Date.now() < end) {
      await delay(Math.min(700, end - Date.now()));
      const current = await getSnapshot();
      if (current.canvas?.[0] !== 1080 || current.canvas?.[1] !== 1920 || current.tier !== 2) {
        throw new Error(`Capture quality dropped mid-shot: ${JSON.stringify(current)}. The partial video has been discarded.`);
      }
      const elapsed = (Date.now() - probeAt) / 1000;
      if (elapsed >= 1.8) {
        const fps = (current.frames - probe.frames) / elapsed;
        if (fps < 25) throw new Error(`3D render fell to ${fps.toFixed(1)} fps mid-shot; refusing a stuttering final video.`);
        probe = current;
        probeAt = Date.now();
      }
    }
  };
  for (const [index, shot] of shots.entries()) {
    const segmentStarted = Date.now();
    if (index > 0) await runAction(shot);
    await enterHouseIfRequested(shot);
    const remaining = Number(shot.durationSeconds) * 1000 - (Date.now() - segmentStarted);
    if (remaining <= 0) throw new Error(`Atlas action for shot ${index + 1} exceeded its ${shot.durationSeconds}s edit window; shorten prewarm-dependent actions or lengthen that beat.`);
    console.log(`Recording ${index + 1}/${shots.length}: ${redactPrivateHandles(shot.title || shot.action)} (${shot.durationSeconds}s)`);
    await holdShot(remaining / 1000);
  }
  await page.evaluate(async () => {
    const recorder = window.__atlasRecorder;
    if (recorder?.state === 'recording') {
      const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve, {once: true}));
      recorder.stop();
      await stopped;
      for (const track of window.__atlasCaptureStream?.getTracks?.() || []) track.stop();
    }
    await window.__atlasRecordQueue;
  });
  await new Promise((resolve, reject) => stream.end((error) => error ? reject(error) : resolve()));
  stream = null;

  const stat = fs.statSync(temporaryOutputPath);
  if (stat.size < 100_000) throw new Error(`Atlas capture is unexpectedly small (${stat.size} bytes).`);
  fs.renameSync(temporaryOutputPath, outputPath);
  data.mapFootage = relativeOutput;
  fs.writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Saved ${path.relative(root, outputPath)} (${(stat.size / 1_000_000).toFixed(1)} MB); updated ${path.relative(root, dataPath)}. Next: npm run render`);
  if (errors.length) console.warn(`Browser reported ${errors.length} console/page error(s); review these before publishing:\n- ${errors.slice(0, 12).join('\n- ')}`);
} catch (error) {
  if (stream) stream.destroy();
  fs.rmSync(temporaryOutputPath, {force: true});
  throw error;
} finally {
  await browser.close();
}
