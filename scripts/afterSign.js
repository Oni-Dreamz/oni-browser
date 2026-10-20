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

  // Sign the packaged binary with castLabs EVS / Google Widevine production VMP AFTER signtool completes
  console.log(`[afterSign] Signing package with castLabs EVS VMP at ${appOutDir}...`);
  try {
    execSync(`python -m castlabs_evs.vmp sign-pkg "${appOutDir}"`, { stdio: 'inherit' });
    execSync(`python -m castlabs_evs.vmp verify-pkg "${appOutDir}"`, { stdio: 'inherit' });
    console.log('[afterSign] Successfully applied and verified castLabs Widevine VMP signature.');
  } catch (e) {
    console.error(`[afterSign] FATAL: castLabs Widevine VMP signing failed: ${e.message}`);
    throw e;
  }
};
