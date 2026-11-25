// usage: node scripts/render.mjs episodes/demo-day1            → build/demo-day1/video.mp4
//        node scripts/render.mjs episodes/demo-day1 --frames 30,200  → still frames for review
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ep = path.basename(process.argv[2]);
const framesArg = process.argv.indexOf('--frames');
const build = path.join(ROOT, 'build', ep);
const timeline = JSON.parse(fs.readFileSync(path.join(build, 'timeline.json')));
const chrome = process.env.CHROME || '/usr/bin/google-chrome';

const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-web-security'] });
const page = await browser.newPage();
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto('file://' + path.join(ROOT, 'src/player.html'));
await page.waitForFunction('window.ready === true', { timeout: 30000 });
const N = await page.evaluate(tl => window.setup(tl), timeline);
const grab = async i => Buffer.from((await page.evaluate(i => window.frame(i), i)).split(',')[1], 'base64');

if (framesArg > 0) {
  for (const i of process.argv[framesArg + 1].split(',').map(Number)) fs.writeFileSync(path.join(build, `frame_${i}.jpg`), await grab(i));
} else {
  const [w, h] = timeline.size, out = path.join(build, 'video.mp4'), tmp = out.replace('.mp4', '.tmp.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(timeline.fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(build, 'narration.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-s', `${w}x${h}`, '-c:a', 'aac', '-b:a', '160k', '-shortest', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    if (!ff.stdin.write(await grab(i))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 240 === 0) console.log(`frame ${i}/${N}`);
  }
  ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
  if (code !== 0) { console.error('ffmpeg failed', code); process.exit(1); }
  fs.renameSync(tmp, out); console.log(`done: ${out} (${N} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
await browser.close();
