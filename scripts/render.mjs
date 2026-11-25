// usage: node scripts/render.mjs episodes/<name> [--workers 2]   → build/<name>/video.mp4
//        node scripts/render.mjs episodes/<name> --frames 30,200 → still frames for review
// Parallel mode splits the frame range across N headless browsers, encodes one segment each,
// then joins the segments with the concat demuxer (no re-encode) and adds the narration.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ep = path.basename(process.argv[2]);
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const build = path.join(ROOT, 'build', ep);
const timeline = JSON.parse(fs.readFileSync(path.join(build, 'timeline.json')));
const mapData = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/us_lower48.json')));
const chrome = process.env.CHROME || '/usr/bin/google-chrome';
const N = Math.round(timeline.duration * timeline.fps);

async function openPlayer() {
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-web-security'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + path.join(ROOT, 'src/player.html'));
  await page.waitForFunction('window.ready === true', { timeout: 30000 });
  await page.evaluate((tl, md) => window.setup(tl, md), timeline, mapData);
  const grab = async i => Buffer.from((await page.evaluate(i => window.frame(i), i)).split(',')[1], 'base64');
  return { browser, grab };
}

async function renderRange(a, b, file) {
  const { browser, grab } = await openPlayer();
  const [w, h] = timeline.size;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(timeline.fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-s', `${w}x${h}`, file + '.tmp.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = a; i < b; i++) {
    if (!ff.stdin.write(await grab(i))) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - a) % 480 === 0) console.log(`[${path.basename(file)}] ${i - a}/${b - a}`);
  }
  ff.stdin.end(); const code = await new Promise(r => ff.on('close', r)); await browser.close();
  if (code !== 0) throw new Error('ffmpeg failed on ' + file);
  fs.renameSync(file + '.tmp.mp4', file);
}

if (arg('--frames')) {
  const { browser, grab } = await openPlayer();
  for (const i of arg('--frames').split(',').map(Number)) fs.writeFileSync(path.join(build, `frame_${i}.jpg`), await grab(i));
  await browser.close();
} else {
  const workers = Math.max(1, Number(arg('--workers') || Math.min(4, os.cpus().length)));
  const t0 = Date.now(), seg = Math.ceil(N / workers), parts = [];
  for (let k = 0; k < workers; k++) { const a = k * seg, b = Math.min(N, a + seg); if (a < b) parts.push([a, b, path.join(build, `part${k}.mp4`)]); }
  await Promise.all(parts.map(([a, b, f]) => renderRange(a, b, f)));
  const list = path.join(build, 'parts.txt'); fs.writeFileSync(list, parts.map(p => `file '${p[2]}'`).join('\n'));
  const out = path.join(build, 'video.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', path.join(build, 'narration.wav'),
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', out + '.tmp.mp4'], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('join failed'); process.exit(1); }
  fs.renameSync(out + '.tmp.mp4', out); parts.forEach(p => fs.rmSync(p[2])); fs.rmSync(list);
  console.log(`done: ${out} (${N} frames, ${workers} workers, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
