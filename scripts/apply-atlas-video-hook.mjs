import fs from 'node:fs';
import path from 'node:path';

const project = path.resolve(process.argv[2] || 'telugustates/Hugo-Project');

function patch({file, marker, anchor, replacement}) {
  const source = path.join(project, file);
  let text = fs.readFileSync(source, 'utf8');
  if (text.includes(marker)) {
    console.log(`Video adapter already present in ${file}.`);
    return;
  }
  const occurrences = text.split(anchor).length - 1;
  if (occurrences !== 1) {
    throw new Error(`Expected exactly one source anchor in ${source}; found ${occurrences}. Review upstream changes before applying the video adapter.`);
  }
  text = text.replace(anchor, replacement);
  fs.writeFileSync(source, text);
  console.log(`Applied video adapter to ${file}`);
}

patch({
  file: 'static/js/public-home.js',
  marker: 'window.__atlasVideoControl = Object.freeze({',
  anchor: `  const v = await world();\n  if (token !== seq) return;\n  if (!v) {`,
  replacement: `  const v = await world();
  if (token !== seq) return;
  if (v) {
    // Non-geometric adapter for the video driver. It calls the atlas's own
    // camera, resident, district, and authored-place APIs; it adds no geometry.
    window.__atlasVideoControl = Object.freeze({
      overview: () => v.overview(),
      zoom: (factor) => v.zoom(Number(factor)),
      coordinate: (longitude, latitude) => {
        const lon = Number(longitude), lat = Number(latitude), box = a.project.bbox_wgs84;
        if (!Number.isFinite(lon) || !Number.isFinite(lat) || lon < box[0] || lon > box[2] || lat < box[1] || lat > box[3]) throw new Error("Coordinate is outside the Atlas bounds.");
        return v.coordinate(lon, lat);
      },
      place: (id, view = "ground") => {
        const stop = stops.find((item) => item.id === String(id));
        if (!stop) throw new Error("Unknown authored Atlas place: " + id);
        return v.guide(stop.id, String(view));
      },
      district: (idOrName) => {
        const target = String(idOrName).trim().toLowerCase();
        const district = a.districts.find((item) => String(item.id) === target || item.name.toLowerCase() === target);
        if (!district) throw new Error("Unknown atlas district: " + idOrName);
        v.inspect(district);
        return district.name;
      },
      resident: async (handle, kind = "gate") => {
        const record = await lookup(normalize(handle));
        if (!record) throw new Error("Atlas has no matching resident record; the private routing value was not logged.");
        v.visit(record, kind === "acre" ? "acre" : "gate");
        return record;
      },
      focus: () => v.focus(),
    });
  }
  if (!v) {`,
});

patch({
  file: 'static/js/world.js',
  marker: 'window.__atlasVideoPrivacy === true && L?.group',
  anchor: `    if (now - lastHud > (mode === "ground" ? 180 : 240)) hud(now);\n    renderer.render(scene, cam);`,
  replacement: `    if (now - lastHud > (mode === "ground" ? 180 : 240)) hud(now);
    // Video capture never records an Instagram handle or nameboard, even while
    // the camera is flying into a newly loaded tile.
    if (window.__atlasVideoPrivacy === true && L?.group)
      L.group.traverse((object) => {
        if (object.userData.role === "username-nameboard") object.visible = false;
      });
    renderer.render(scene, cam);`,
});
