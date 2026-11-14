import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
const directory = new URL('./', import.meta.url);
const process = spawn('node.exe', ['C:\\Users\\alexi\\vscode\\pawspeak\\node_modules\\vite\\bin\\vite.js', '--port', '3000', '--host', '0.0.0.0'], {
  detached: true,
  stdio: ['ignore', openSync(new URL('vite-persistent.log', directory), 'a'), openSync(new URL('vite-persistent-errors.log', directory), 'a')]
});
process.unref();
console.log(process.pid);