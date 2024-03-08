// build.js
import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['src/index.ts'], // Your main TypeScript file
  bundle: true,
  minify: true,
  platform: 'node', // or 'browser', depending on your target
  outdir: 'dist', // Output directory
  sourcemap: true, // Optional, for debugging
  target: 'es2020', // Adjust based on your target environment
}).catch(() => process.exit(1));