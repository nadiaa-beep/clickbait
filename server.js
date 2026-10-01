import express from 'express';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const WORLD_IDS = new Set(['pastel', 'y2k', 'desi', 'grunge', 'shoujo', 'floral']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
app.disable('x-powered-by');
app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/backgrounds/:world', async (req, res, next) => {
  const world = req.params.world.toLowerCase();
  if (!WORLD_IDS.has(world)) return res.status(404).json({ error: 'Unknown world.' });
  const folderName = `${world} b`;
  const folderPath = path.join(root, 'assets', world, folderName);
  try {
    const entries = await readdir(folderPath, { withFileTypes: true });
    const backgrounds = [];
    const unsupported = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(extension)) {
        unsupported.push({ name: entry.name, reason: `Unsupported image extension: ${extension || '(none)'}` });
        continue;
      }
      backgrounds.push({
        name: path.basename(entry.name, path.extname(entry.name)),
        src: path.posix.join('assets', world, folderName, entry.name)
      });
    }
    backgrounds.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    unsupported.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    return res.json({ world, backgrounds, unsupported });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(500).json({ error: `Background folder is missing for ${world}.` });
    return next(error);
  }
});
app.get('/__catalog-exception/desi-quote', (_req, res) => res.sendFile(path.join(root, 'assets', 'desi', 'desi q', '.jpg'), { dotfiles: 'allow' }));
app.get('/frame-layouts.json', (_req, res) => res.sendFile(path.join(root, 'frame-layouts.json')));
app.get('/vendor/fabric.min.js', (_req, res) => res.sendFile(path.join(root, 'node_modules', 'fabric', 'dist', 'fabric.min.js')));
for (const folder of ['assets', 'css', 'js', 'demo-assets']) {
  app.use(`/${folder}`, express.static(path.join(root, folder), { setHeaders(res) { res.setHeader('X-Content-Type-Options', 'nosniff'); } }));
}
app.get(['/', '/index.html'], (_req, res) => res.sendFile(path.join(root, 'index.html')));
app.get('/editor.html', (_req, res) => res.sendFile(path.join(root, 'editor.html')));

const port = Number(process.env.PORT) || 3000;
app.listen(port, '127.0.0.1', () => console.log(`Clickbait is ready at http://localhost:${port}`));
