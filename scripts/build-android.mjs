import {spawn} from 'node:child_process';
import {access, copyFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRoot = path.join(projectRoot, 'android');
const isWindows = process.platform === 'win32';
const buildEnv = {...process.env};
const localAppData = process.env.LOCALAPPDATA;
if (localAppData) {
  buildEnv.GRADLE_USER_HOME ??= path.join(localAppData, 'PawSpeakGradle');
}
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
  } catch { /* Keep the user's configured Java if the portable JDK is absent. */ }
}
const javaBin = buildEnv.JAVA_HOME && path.join(buildEnv.JAVA_HOME, 'bin');
const platformTools = sdkRoot && path.join(sdkRoot, 'platform-tools');
buildEnv.PATH = [javaBin, platformTools, process.env.PATH].filter(Boolean)
  .join(isWindows ? ';' : ':');

const build = spawn(isWindows ? (process.env.ComSpec ?? 'cmd.exe') : './gradlew',
  isWindows ? ['/d', '/s', '/c', 'gradlew.bat assembleDebug'] : ['assembleDebug'], {
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
await copyFile(
  path.join(androidRoot, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
  path.join(releaseDir, 'PawSpeak-debug.apk'),
);
console.log(`Debug APK copied to ${path.join(releaseDir, 'PawSpeak-debug.apk')}`);
