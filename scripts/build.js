const { execSync } = require('child_process');

const commands = [
  'npm run react-build',
  'npm run postbuild',
  'electron-builder --config electron-builder.yml'
];

for (const cmd of commands) {
  console.log(`\n>>> Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', shell: true });
  } catch (error) {
    console.error(`Error running: ${cmd}`);
    process.exit(1);
  }
}

console.log('\n✓ Build completed successfully');
