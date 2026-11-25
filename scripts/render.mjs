import crypto from 'crypto';
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
const mapData = { us: JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/us_lower48.json'))), world: JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/world110.json'))) };
const chrome = process.env.CHROME || '/usr/bin/google-chrome';
const N = Math.round(timeline.duration * timeline.fps);

async function openPlayer() {
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, protocolTimeout: 600000, args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-web-security'] });
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
  const [w, h] = timeline.vertical ? [1080, 1920] : timeline.size;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(timeline.fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-s', `${w}x${h}`, file + '.tmp.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = a; i < b; i++) {
    if (!ff.stdin.write(await grab(i))) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - a) % 480 === 0 && i > a) console.log(`[${path.basename(file)}] ${i - a}/${b - a}`);
  }
  ff.stdin.end(); const code = await new Promise(r => ff.on('close', r)); await browser.close();
  if (code !== 0) throw new Error('ffmpeg failed on ' + file);
  fs.renameSync(file + '.tmp.mp4', file);
}

if (process.argv.includes('--remux')) {      // new sound on a finished video, no frames rendered
  const out = path.join(build, 'video.mp4'), snd = fs.existsSync(path.join(build, 'mix.wav')) ? path.join(build, 'mix.wav') : path.join(build, 'narration.wav');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-i', snd, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', '-shortest', out + '.tmp.mp4'], { stdio: 'inherit' });
  if (r.status === 0) fs.renameSync(out + '.tmp.mp4', out); console.log('remuxed', out, 'with', path.basename(snd)); process.exit(r.status);
}
if (arg('--frames')) {
  const { browser, grab } = await openPlayer();
  for (const i of arg('--frames').split(',').map(Number)) fs.writeFileSync(path.join(build, `frame_${i}.jpg`), await grab(i));
  await browser.close();
} else {
  // Resumable: frames are cut into chunks at shot boundaries (~40 s each). Each chunk is its own file and its own fresh
  // browser; a chunk already on disk is skipped, so a stopped render picks up where it left off.
  const workers = Math.max(1, Number(arg('--workers') || Math.min(4, os.cpus().length)));
  const t0 = Date.now(), fps = timeline.fps, chunks = []; let a = 0;
  for (const sh of timeline.shots) { const end = Math.min(N, Math.round(sh.end * fps)); if (end - a >= fps * 40 || sh === timeline.shots.at(-1)) { if (end > a) chunks.push([a, end]); a = end; } }
  if (a < N) chunks.push([a, N]);
  // Each chunk file is named by a hash of the shots it covers (content + timing), so editing one shot re-renders only
  // the chunks that contain it. After changing drawing code, pass --fresh to re-render everything.
  if (process.argv.includes('--fresh')) fs.readdirSync(build).filter(f => /^chunk/.test(f)).forEach(f => fs.rmSync(path.join(build, f)));
  const hash = (a, b) => crypto.createHash('sha1').update(JSON.stringify([a, b, timeline.shots.filter(sh => sh.end * fps > a && sh.start * fps < b), timeline.size, fps])).digest('hex').slice(0, 10);
  const files = chunks.map(([a, b], k) => path.join(build, `chunk${String(k).padStart(3, '0')}-${hash(a, b)}.mp4`));
  const keep = new Set(files.map(f => path.basename(f)));
  fs.readdirSync(build).filter(f => /^chunk.*\.mp4$/.test(f) && !keep.has(f)).forEach(f => fs.rmSync(path.join(build, f)));
  const todo = chunks.map((c, k) => [...c, files[k]]).filter(([, , f]) => !fs.existsSync(f));
  console.log(`${chunks.length} chunks, ${chunks.length - todo.length} already done, ${workers} workers`);
  await Promise.all(Array.from({ length: workers }, async () => { while (todo.length) { const [a, b, f] = todo.shift(); await renderRange(a, b, f); } }));
  const list = path.join(build, 'parts.txt'); fs.writeFileSync(list, files.map(f => `file '${f}'`).join('\n'));
  const out = path.join(build, 'video.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', (fs.existsSync(path.join(build, 'mix.wav')) ? path.join(build, 'mix.wav') : path.join(build, 'narration.wav')),
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', '-shortest', out + '.tmp.mp4'], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('join failed'); process.exit(1); }
  fs.renameSync(out + '.tmp.mp4', out); fs.rmSync(list);
  console.log(`done: ${out} (${N} frames, ${chunks.length} chunks, ${workers} workers, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
