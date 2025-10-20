import { build } from 'vite';

async function run() {
  try {
    // Use Vite's programmatic API; it will load vite.config.js from CWD
    await build();
    // eslint-disable-next-line no-console
    console.log('Vite build completed successfully.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Vite build failed:', err);
    process.exit(1);
  }
}

run();
