const { spawnSync } = require('child_process');
const path = require('path');

const targetArg = process.argv[2] || '--all';
const cliPath = path.join(__dirname, '../node_modules/electron-builder/cli.js');

function runBuild(target) {
  console.log(`[Build] Packaging target: ${target}...`);
  const res = spawnSync(process.execPath, ['--use-system-ca', cliPath, '--win', target], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

if (targetArg === '--installer' || targetArg === 'nsis') {
  runBuild('nsis');
} else if (targetArg === '--portable' || targetArg === 'portable') {
  runBuild('portable');
} else {
  runBuild('nsis');
  runBuild('portable');
}

// Automatically clean older versions after build completes
const cleanDist = require('./clean-dist.js');
cleanDist();
