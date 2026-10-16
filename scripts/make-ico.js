const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico').default;

app.whenReady().then(async () => {
  try {
    const rawPath = path.join(__dirname, '..', 'assets', 'icon.png');
    const image = nativeImage.createFromPath(rawPath);
    console.log('Image dimensions:', image.getSize());
    
    // Resize to standard 256x256 for clean icon
    const resized = image.resize({ width: 256, height: 256 });
    const realPngPath = path.join(__dirname, '..', 'assets', 'app-icon.png');
    fs.writeFileSync(realPngPath, resized.toPNG());
    console.log('Wrote true PNG to:', realPngPath);

    const icoPath = path.join(__dirname, '..', 'assets', 'icon.ico');
    const icoBuf = await pngToIco(realPngPath);
    fs.writeFileSync(icoPath, icoBuf);
    console.log('Successfully created icon.ico at:', icoPath);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    app.quit();
  }
});
