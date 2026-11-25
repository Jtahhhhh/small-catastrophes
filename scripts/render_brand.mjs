import puppeteer from 'puppeteer-core';
import fs from 'fs';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-web-security'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('ERR:', e.message));

await page.goto('file://' + process.cwd() + '/src/brand.html');
await page.waitForFunction('window.ready === true', { timeout: 20000 });
fs.mkdirSync('build/brand', { recursive: true });
const save = (url, p) => fs.writeFileSync(p, Buffer.from(url.split(',')[1], 'base64'));
save(await page.evaluate(() => window.drawLogo(800)), 'build/brand/logo_800.png');
save(await page.evaluate(() => window.drawBanner(false)), 'build/brand/youtube_banner_2560x1440.png');
save(await page.evaluate(() => window.drawBanner(true)), 'build/brand/youtube_banner_guides.png');
save(await page.evaluate(() => window.drawFbCover(false)), 'build/brand/facebook_cover_1640x624.png');
save(await page.evaluate(() => window.drawFbCover(true)), 'build/brand/facebook_cover_guides.png');
await browser.close();
