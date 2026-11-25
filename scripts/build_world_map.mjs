// Rebuilds assets/data/world110.json from Natural Earth 1:110m (npm i --no-save world-atlas@2 topojson-client@3).
import fs from 'fs'; import * as topo from './node_modules/topojson-client/src/index.js';
const t = JSON.parse(fs.readFileSync('./node_modules/world-atlas/countries-110m.json'));
const fc = topo.feature(t, t.objects.countries); const polys = [], owner = [], names = [];
for (const f of fc.features) { const name = f.properties.name; if (name === 'Antarctica') continue; const id = names.push(name) - 1;
  const rings = f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map(p => p[0]);
  for (let r of rings) { if (r.length < 4) continue;
    // skip rings crossing the antimeridian (Russia/Fiji slivers) to avoid streaks
    const cross = r.some((p, i) => i && Math.abs(p[0] - r[i - 1][0]) > 180);
    if (cross) { r = r.map(([x, y]) => [x < -100 ? 180 : x, y]); if (r.every(p => p[0] === 180)) continue; }
    polys.push(r.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])); owner.push(id); } }
fs.writeFileSync('assets/data/world110.json', JSON.stringify({ note: 'Country outlines, Natural Earth 1:110m via world-atlas (public domain).', names, polys, owner }));
console.log(names.length, polys.length, ['India','Nigeria','Sweden','United States of America'].map(n=>names.indexOf(n)));
