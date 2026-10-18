const fs = require('fs');
const path = require('path');

function cleanDist() {
  const pkgPath = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version;

  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    return [];
  }

  const currentInstallerName = `Oni-Browser-Setup-${currentVersion}.exe`;
  const currentBlockmapName = `Oni-Browser-Setup-${currentVersion}.exe.blockmap`;

  const files = fs.readdirSync(distDir);
  const removed = [];

  for (const file of files) {
    const isInstaller = /^Oni-Browser-Setup-.*\.exe$/i.test(file);
    const isBlockmap = /^Oni-Browser-Setup-.*\.exe\.blockmap$/i.test(file);
    const isUninstaller = /__uninstaller\.exe$/i.test(file);

    if (isInstaller && file !== currentInstallerName) {
      fs.unlinkSync(path.join(distDir, file));
      console.log(`[Clean Dist] Removed obsolete installer: ${file}`);
      removed.push(file);
    } else if (isBlockmap && file !== currentBlockmapName) {
      fs.unlinkSync(path.join(distDir, file));
      console.log(`[Clean Dist] Removed obsolete blockmap: ${file}`);
      removed.push(file);
    } else if (isUninstaller) {
      fs.unlinkSync(path.join(distDir, file));
      console.log(`[Clean Dist] Removed temporary uninstaller: ${file}`);
      removed.push(file);
    }
  }

  if (removed.length === 0) {
    console.log(`[Clean Dist] dist folder is clean (current version: v${currentVersion}).`);
  } else {
    console.log(`[Clean Dist] Cleaned ${removed.length} outdated file(s). Active version: v${currentVersion}.`);
  }

  return removed;
}

// Support electron-builder afterAllArtifactBuild hook
module.exports = async function (context) {
  cleanDist();
  return [];
};

if (require.main === module) {
  cleanDist();
}
