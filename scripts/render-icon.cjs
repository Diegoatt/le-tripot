// Renders build/icon.svg to build/icon.png (1024 px) with Electron. Run: npx electron scripts/render-icon.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.whenReady().then(async () => {
  const dir = path.join(__dirname, '..', 'build');
  const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await win.loadURL('about:blank');
  // A canvas is not limited by the window or screen size.
  const dataUrl = await win.webContents.executeJavaScript(`new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 1024;
      c.getContext('2d').drawImage(img, 0, 0, 1024, 1024);
      ok(c.toDataURL('image/png'));
    };
    img.src = 'data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}';
  })`);
  fs.writeFileSync(path.join(dir, 'icon.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('icon.png written');
  app.quit();
});
