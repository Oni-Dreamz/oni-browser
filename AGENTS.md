# Oni Browser Project Guidelines & Agent Instructions

## Build & Release Artifacts Maintenance
- **Single Active Version in `dist/`**: The `dist/` directory must only preserve artifacts for the **current active version** specified in `package.json`:
  - `Oni-Browser-Setup-<currentVersion>.exe`
  - `Oni-Browser-Setup-<currentVersion>.exe.blockmap`
  - `Oni Browser Standalone.exe`
  - `latest.yml`
  - `win-unpacked/`
- **Automatic Cleanup of Older Versions**: Whenever a new version is built (e.g., advancing from `1.0.1` to `1.0.2`, `1.0.3`, etc.), all older setup executables (e.g., `Oni-Browser-Setup-<oldVersion>.exe`) and their associated `.blockmap` files must be purged immediately so outdated setups never accumulate in `dist/`.
- **Cleanup Automation**:
  - `scripts/clean-dist.js` automates the removal of any non-current versions.
  - `package.json` configures `"afterAllArtifactBuild": "scripts/clean-dist.js"` so electron-builder executes this cleanup automatically.
  - Build scripts in `package.json` (`npm run build`, `npm run build:installer`, `npm run build:portable`, `npm run build:all`) invoke `scripts/build.js` which always verifies cleanup.

## DRM & Widevine VMP Signing (Mandatory for Netflix / Premium Streaming)
- **Verified Media Path (VMP) Enforcement**: Premium streaming services (specifically Netflix) mandate Google Widevine Level 3 VMP. Unsigned or development-only binaries will successfully download manifests, negotiate licenses, and buffer media, but will silently freeze with `Total Frames: 0`, `Rendering state: Waiting for decoder`, and fail with **Error Code E100**.
- **Automated VMP Signing in `afterSign`**: All production packages built by `electron-builder` must be signed via `castlabs-evs` (`python -m castlabs_evs.vmp sign-pkg "<appOutDir>"`), configured in [`scripts/afterSign.js`](file:///o:/Oni%20Lab/Oni%20Browser/scripts/afterSign.js) (and [`scripts/afterPack.js`](file:///o:/Oni%20Lab/Oni%20Browser/scripts/afterPack.js)) so the VMP signature is applied after Windows `signtool.exe` completes.
- **Verification Rule**: Never release or test packaged binaries for streaming DRM without running `python -m castlabs_evs.vmp verify-pkg "<appOutDir>"` to guarantee the signature reports `Signature is valid: streaming`.
