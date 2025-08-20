#!/usr/bin/env node

// Archivo binario simplificado para CommonJS
const { spawn } = require('child_process');
const { resolve } = require('path');
const { existsSync } = require('fs');

// Ruta al CLI real
const cliPath = resolve(__dirname, '../src/cli.js');

// Verificar que el archivo existe
if (!existsSync(cliPath)) {
  console.error(`Error: No se pudo encontrar el CLI en: ${cliPath}`);
  process.exit(1);
}

// Ejecutar el CLI directamente (ya no necesitamos banderas experimentales)
const childProcess = spawn(
  process.execPath, 
  [cliPath, ...process.argv.slice(2)],
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