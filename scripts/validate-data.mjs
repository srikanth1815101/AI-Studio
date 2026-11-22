import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || 'video-data.json';
const requireFootage = process.argv.includes('--require-footage');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];
for (const field of ['district', 'openingLine', 'closingLine']) {
  if (typeof data[field] !== 'string' || !data[field].trim()) errors.push(`${field} must be a non-empty string`);
}
for (const field of ['newHomes', 'totalFollowers']) {
  if (!Number.isInteger(Number(data[field])) || Number(data[field]) < 0) errors.push(`${field} must be a non-negative integer`);
}
if (data.accentColor && !/^#[0-9a-fA-F]{6}$/.test(data.accentColor)) errors.push('accentColor must be a six-digit hex colour');
const actions = new Set(['overview', 'district', 'place', 'resident', 'acre', 'coordinate', 'zoom']);
if (!Array.isArray(data.atlasShots) || data.atlasShots.length < 2) errors.push('atlasShots must contain at least two real-Atlas camera shots');
else {
  let seconds = 0;
  for (const [index, shot] of data.atlasShots.entries()) {
    if (!actions.has(shot.action)) errors.push(`atlasShots[${index}].action must be one of ${[...actions].join(', ')}`);
    const duration = Number(shot.durationSeconds);
    if (!Number.isFinite(duration) || duration <= 0) errors.push(`atlasShots[${index}].durationSeconds must be greater than zero`);
    else seconds += duration;
    if (shot.action === 'district' && !shot.district) errors.push(`atlasShots[${index}] needs a district name/id`);
    if (shot.action === 'place' && !shot.id) errors.push(`atlasShots[${index}] needs an authored place id`);
    if (['resident', 'acre'].includes(shot.action) && !shot.handle) errors.push(`atlasShots[${index}] needs an Atlas resident handle`);
    if (shot.enterHouse && shot.action !== 'resident') errors.push(`atlasShots[${index}].enterHouse is only valid with a resident gate shot`);
    if (shot.action === 'coordinate' && (!Number.isFinite(Number(shot.longitude)) || !Number.isFinite(Number(shot.latitude)))) errors.push(`atlasShots[${index}] needs longitude and latitude`);
    if (shot.action === 'zoom' && (!Number.isFinite(Number(shot.factor)) || Number(shot.factor) <= 0)) errors.push(`atlasShots[${index}].factor must be greater than zero`);
    if (shot.settings) {
      const allowed = {season: ['auto', 'retreat', 'winter', 'summer', 'monsoon'], weather: ['auto', 'Clear', 'Cloudy', 'Light rain', 'Rain', 'Heavy rain'], time: ['shared4', 'shared2', 'shared6', 'golden', 'day', 'dusk', 'live'], quality: ['auto', 'low', 'medium', 'high']};
      for (const [key, value] of Object.entries(shot.settings)) if (allowed[key] && !allowed[key].includes(value)) errors.push(`atlasShots[${index}].settings.${key} is unsupported`);
    }
  }
  if (Math.abs(seconds - 40) > 0.001) errors.push(`atlasShots duration must total 40 seconds, currently ${seconds}`);
}
if (data.atlasQuality && !['high', 'medium', 'low', 'auto'].includes(data.atlasQuality)) errors.push('atlasQuality must be high, medium, low, or auto');
if (data.atlasSettings) {
  const allowed = {season: ['auto', 'retreat', 'winter', 'summer', 'monsoon'], weather: ['auto', 'Clear', 'Cloudy', 'Light rain', 'Rain', 'Heavy rain'], time: ['shared4', 'shared2', 'shared6', 'golden', 'day', 'dusk', 'live']};
  for (const [key, values] of Object.entries(allowed)) if (data.atlasSettings[key] && !values.includes(data.atlasSettings[key])) errors.push(`atlasSettings.${key} is unsupported`);
}
if (requireFootage && !data.mapFootage) errors.push('No real Atlas capture set. Run `npm run atlas:serve` and `npm run atlas:capture` before rendering.');
if (data.mapFootage) {
  const footage = path.join('public', data.mapFootage);
  if (!fs.existsSync(footage)) errors.push(`mapFootage not found at ${footage}; run atlas:capture or correct the path`);
}
if (errors.length) {
  console.error(`Invalid video brief (${file}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`Video brief OK: ${file} · ${data.district} · ${data.atlasShots.length} real-world camera shots · ${data.atlasShots.reduce((n, shot) => n + Number(shot.durationSeconds), 0)} seconds`);
