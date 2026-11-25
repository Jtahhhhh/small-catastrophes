// Thumbnail (1280×720 JPEG) from the episode's "thumbnail" spec, plus the channel watermark (150×150 PNG).
// usage: node scripts/thumbnail.mjs episodes/<ep>   → build/<ep>/thumbnail.jpg, assets/brand/watermark.png
import fs from 'fs'; import path from 'path'; import puppeteer from 'puppeteer-core';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ep = path.basename(process.argv[2]), build = path.join(ROOT, 'build', ep);
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'episodes', ep, 'script.json')));
const timeline = JSON.parse(fs.readFileSync(path.join(build, 'timeline.json')));
const mapData = { us: JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/us_lower48.json'))), world: JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/data/world110.json'))) };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-web-security'] });
const page = await browser.newPage(); await page.goto('file://' + path.join(ROOT, 'src/player.html'));
await page.waitForFunction('window.ready === true'); await page.evaluate('document.fonts.ready');
await page.evaluate((tl, md) => window.setup(tl, md), timeline, mapData);
const save = (url, f) => fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
for (const [k, spec] of (Array.isArray(script.thumbnail) ? script.thumbnail : [script.thumbnail]).entries())
  save(await page.evaluate(s => window.thumbnail(s), spec), path.join(build, k ? `thumbnail_${k + 1}.jpg` : 'thumbnail.jpg'));
save(await page.evaluate(() => window.logoPNG(150)), path.join(ROOT, 'assets/brand/watermark.png'));
await browser.close(); console.log('thumbnail(s) in', build, '+ assets/brand/watermark.png');
