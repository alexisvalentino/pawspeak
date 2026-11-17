/**
 * Build a signed release APK.
 *
 * Signing credentials are read from the environment and never written to the repository:
 *
 *   PAWSPEAK_KEYSTORE       absolute path to the .jks (keep it OUTSIDE the repo)
 *   PAWSPEAK_STORE_PASSWORD
 *   PAWSPEAK_KEY_PASSWORD
 *   PAWSPEAK_KEY_ALIAS      defaults to "pawspeak"
 *
 * Without PAWSPEAK_KEYSTORE the release build is produced unsigned -- useful for verifying
 * that R8 did not break anything, but not installable.
 *
 * Usage:
 *   node scripts/build-android-release.mjs
 */
import {spawn} from 'node:child_process';
import {access, copyFile, mkdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRoot = path.join(projectRoot, 'android');
const isWindows = process.platform === 'win32';
const buildEnv = {...process.env};
const localAppData = process.env.LOCALAPPDATA;

if (localAppData) buildEnv.GRADLE_USER_HOME ??= path.join(localAppData, 'PawSpeakGradle');

const sdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT
  ?? (localAppData ? path.join(localAppData, 'Android', 'Sdk') : undefined);
if (sdkRoot) {
  buildEnv.ANDROID_HOME = sdkRoot;
  buildEnv.ANDROID_SDK_ROOT = sdkRoot;
}

const bundledJdk21 = localAppData ? path.join(localAppData, 'PawSpeak', 'JDK21') : undefined;
if (bundledJdk21) {
  try {
    await access(path.join(bundledJdk21, 'bin', isWindows ? 'java.exe' : 'java'));
    buildEnv.JAVA_HOME = bundledJdk21;
  } catch { /* keep the user's configured Java */ }
}

const javaBin = buildEnv.JAVA_HOME && path.join(buildEnv.JAVA_HOME, 'bin');
const platformTools = sdkRoot && path.join(sdkRoot, 'platform-tools');
buildEnv.PATH = [javaBin, platformTools, process.env.PATH].filter(Boolean)
  .join(isWindows ? ';' : ':');

// Refuse to proceed if the keystore lives inside the repository.
const keystore = process.env.PAWSPEAK_KEYSTORE;
if (keystore) {
  const resolved = path.resolve(keystore);
  if (resolved.startsWith(projectRoot + path.sep)) {
    console.error('Refusing to build: PAWSPEAK_KEYSTORE points inside the repository.');
    console.error('Move the keystore outside the project (e.g. ~/.pawspeak-keys/) so it cannot be committed.');
    process.exit(1);
  }
  if (!process.env.PAWSPEAK_KEY_PASSWORD) {
    console.error('Refusing to build: PAWSPEAK_KEY_PASSWORD is required when signing.');
    process.exit(1);
  }
} else {
  console.warn('PAWSPEAK_KEYSTORE is not set: building an UNSIGNED release APK.');
  console.warn('It cannot be installed on a device until you sign it.');
}

const build = spawn(isWindows ? (process.env.ComSpec ?? 'cmd.exe') : './gradlew',
  isWindows ? ['/d', '/s', '/c', 'gradlew.bat assembleRelease'] : ['assembleRelease'], {
  cwd: androidRoot,
  stdio: 'inherit',
  windowsHide: true,
  env: buildEnv,
});

const exitCode = await new Promise((resolve, reject) => {
  build.once('error', reject);
  build.once('exit', code => resolve(code ?? 1));
});
if (exitCode !== 0) process.exit(exitCode);

const releaseDir = path.join(projectRoot, 'release');
await mkdir(releaseDir, {recursive: true});
const apkOutputDir = path.join(androidRoot, 'app', 'build', 'outputs', 'apk', 'release');
const candidates = await Promise.all(['app-release.apk', 'app-release-unsigned.apk'].map(async name => {
  const file = path.join(apkOutputDir, name);
  try { return {file, modified: (await stat(file)).mtimeMs}; }
  catch { return null; }
}));
const latestApk = candidates.filter(Boolean).sort((a, b) => b.modified - a.modified)[0];
if (!latestApk) {
  console.error(`Gradle did not produce a release APK in ${apkOutputDir}`);
  process.exit(1);
}
const suffix = latestApk.file.endsWith('app-release-unsigned.apk') ? 'release-unsigned' : 'release';
const target = path.join(releaseDir, `PawSpeak-${suffix}.apk`);
await copyFile(latestApk.file, target);
console.log(`Release APK copied to ${target}`);
