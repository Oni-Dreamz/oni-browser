const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function (context) {
  const appOutDir = context.appOutDir;
  if (!appOutDir) return;

  // Clean up any lingering electron.exe so castlabs_evs targets only the main app binary
  const electronExe = path.join(appOutDir, 'electron.exe');
  const electronSig = path.join(appOutDir, 'electron.exe.sig');
  if (fs.existsSync(electronExe)) {
    try { fs.unlinkSync(electronExe); } catch (_) {}
  }
  if (fs.existsSync(electronSig)) {
    try { fs.unlinkSync(electronSig); } catch (_) {}
  }

  // Sign the packaged binary with castLabs EVS / Google Widevine production VMP
  try {
    console.log(`[afterPack] Signing package with castLabs EVS VMP at ${appOutDir}...`);
    execSync(`python -m castlabs_evs.vmp sign-pkg "${appOutDir}"`, { stdio: 'inherit' });
    console.log('[afterPack] Successfully applied castLabs Widevine VMP signature.');
  } catch (e) {
    console.warn(`[afterPack] castLabs EVS signing notice: ${e.message}`);
  }
};
