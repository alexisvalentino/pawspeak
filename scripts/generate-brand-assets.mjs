import {access, mkdir, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = path.join(projectRoot, 'public', 'pawspeak-mascot-logo.png');
const logoPng = await sharp(logoPath).png().toBuffer();
const brandBlue = '#8dddf8';
const brandCream = '#fff9ef';
const publicIconsDir = path.join(projectRoot, 'public', 'icons');
await mkdir(publicIconsDir, {recursive: true});

async function renderSourceLogo(size) {
  return sharp(logoPng).resize(size, size, {fit: 'fill', kernel: 'lanczos3'}).png().toBuffer();
}

async function renderLogo(size) {
  const sourceLogo = await renderSourceLogo(size);
  return sharp({create: {width: size, height: size, channels: 4, background: brandBlue}})
    .composite([{input: sourceLogo, left: 0, top: 0}])
    .removeAlpha().png().toBuffer();
}

async function renderPaddedLogo(size, scale, background) {
  const logoSize = Math.round(size * scale);
  const logo = await renderSourceLogo(logoSize);
  const offset = Math.round((size - logoSize) / 2);
  const image = sharp({create: {width: size, height: size, channels: 4, background}})
    .composite([{input: logo, left: offset, top: offset}]);
  return (typeof background === 'object' && background.alpha === 0 ? image : image.removeAlpha())
    .png().toBuffer();
}

async function savePublicIcon(filename, size) {
  await writeFile(path.join(publicIconsDir, filename), await renderLogo(size));
}

await Promise.all([
  savePublicIcon('icon-192.png', 192),
  savePublicIcon('icon-512.png', 512),
  writeFile(path.join(publicIconsDir, 'icon-512-maskable.png'),
    await renderPaddedLogo(512, 0.72, brandBlue)),
  ...[120, 152, 167, 180].map(size => savePublicIcon(`apple-touch-icon-${size}.png`, size)),
]);

const faviconImages = await Promise.all([16, 32, 48].map(async size => ({size, image: await renderLogo(size)})));
const icoHeader = Buffer.alloc(6 + faviconImages.length * 16);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(faviconImages.length, 4);
let imageOffset = icoHeader.length;
const icoEntries = faviconImages.map(({size, image}, index) => {
  const entryOffset = 6 + index * 16;
  icoHeader.writeUInt8(size === 256 ? 0 : size, entryOffset);
  icoHeader.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
  icoHeader.writeUInt8(0, entryOffset + 2);
  icoHeader.writeUInt8(0, entryOffset + 3);
  icoHeader.writeUInt16LE(1, entryOffset + 4);
  icoHeader.writeUInt16LE(32, entryOffset + 6);
  icoHeader.writeUInt32LE(image.length, entryOffset + 8);
  icoHeader.writeUInt32LE(imageOffset, entryOffset + 12);
  imageOffset += image.length;
  return image;
});
await writeFile(path.join(projectRoot, 'public', 'favicon.ico'), Buffer.concat([icoHeader, ...icoEntries]));

const androidResDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
try {
  await access(androidResDir);
  const androidDensities = [
    {folder: 'mipmap-mdpi', icon: 48, foreground: 108},
    {folder: 'mipmap-hdpi', icon: 72, foreground: 162},
    {folder: 'mipmap-xhdpi', icon: 96, foreground: 216},
    {folder: 'mipmap-xxhdpi', icon: 144, foreground: 324},
    {folder: 'mipmap-xxxhdpi', icon: 192, foreground: 432},
  ];
  await Promise.all(androidDensities.map(async ({folder, icon, foreground}) => {
    const directory = path.join(androidResDir, folder);
    await access(directory);
    const [launcher, launcherRound, adaptiveForeground] = await Promise.all([
      renderLogo(icon), renderLogo(icon),
      renderPaddedLogo(foreground, 0.6, {r: 0, g: 0, b: 0, alpha: 0}),
    ]);
    await Promise.all([
      writeFile(path.join(directory, 'ic_launcher.png'), launcher),
      writeFile(path.join(directory, 'ic_launcher_round.png'), launcherRound),
      writeFile(path.join(directory, 'ic_launcher_foreground.png'), adaptiveForeground),
    ]);
  }));

  await Promise.all((await readdir(androidResDir, {withFileTypes: true}))
    .filter(entry => entry.isDirectory() && entry.name.startsWith('drawable'))
    .map(async entry => {
      const splashPath = path.join(androidResDir, entry.name, 'splash.png');
      try {
        await access(splashPath);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
        return;
      }
      const {width, height} = await sharp(splashPath).metadata();
      if (!width || !height) return;
      const iconSize = Math.round(Math.min(width, height) * 0.34);
      const logo = await renderSourceLogo(iconSize);
      await sharp({create: {width, height, channels: 4, background: '#fff9ef'}})
        .composite([{input: logo, left: Math.round((width - iconSize) / 2), top: Math.round((height - iconSize) / 2)}])
        .png().toFile(splashPath);
    }));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const iosAppIconSet = path.join(projectRoot, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
try {
  await access(iosAppIconSet);
  await writeFile(path.join(iosAppIconSet, 'AppIcon-512@2x.png'), await renderLogo(1024));
  const iosSplashSet = path.join(projectRoot, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
  const iosSplashFiles = ['splash-2732x2732-2.png', 'splash-2732x2732-1.png', 'splash-2732x2732.png'];
  await Promise.all(iosSplashFiles.map(async filename => {
    const splashPath = path.join(iosSplashSet, filename);
    const {width, height} = await sharp(splashPath).metadata();
    if (!width || !height) return;
    const iconSize = Math.round(Math.min(width, height) * 0.34);
    const logo = await renderSourceLogo(iconSize);
    await sharp({create: {width, height, channels: 4, background: '#fff9ef'}})
      .composite([{input: logo, left: Math.round((width - iconSize) / 2), top: Math.round((height - iconSize) / 2)}])
      .png().toFile(splashPath);
  }));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

console.log('Generated favicon, PWA, iOS, Android launcher, and splash assets from public/pawspeak-mascot-logo.png.');
