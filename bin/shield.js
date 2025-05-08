#!/usr/bin/env node

// Archivo wrapper que asegura que se utilice la bandera experimental-json-modules
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

// Obtener la ruta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ruta al CLI real
const cliPath = resolve(__dirname, '../src/cli.js');

// Verificar que el archivo existe
if (!existsSync(cliPath)) {
  console.error(`Error: No se pudo encontrar el CLI en: ${cliPath}`);
  process.exit(1);
}

// Ejecutar el CLI con la bandera experimental-json-modules
const childProcess = spawn(
  process.execPath, 
  ['--experimental-json-modules', cliPath, ...process.argv.slice(2)],
  { stdio: 'inherit' }
);

childProcess.on('exit', (code) => {
  process.exit(code);
});

// Manejar señales para pasarlas al proceso hijo
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => {
    if (!childProcess.killed) {
      childProcess.kill(signal);
    }
  });
}); 