import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Solo se ejecutan los tests del código fuente.
    // Se excluye `dist/` para no correr artefactos compilados (CommonJS),
    // que son incompatibles con la importación de Vitest.
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
  },
});
