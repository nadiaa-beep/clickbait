const CATALOG_URL = new URL('../assets/catalog.json', import.meta.url);
let catalogPromise;

export async function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL).then(response => {
      if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
      return response.json();
    }).then(data => {
      if (!data?.worlds || typeof data.worlds !== 'object') throw new Error('The asset catalog has an unexpected structure.');
      return data;
    }).catch(error => { catalogPromise = null; throw error; });
  }
  return catalogPromise;
}

export function worldAssets(catalog, world) {
  const entry = catalog?.worlds?.[world];
  if (!entry) throw new Error(`No assets are listed for “${world}”.`);
  return {
    backgrounds: Array.isArray(entry.backgrounds) ? entry.backgrounds : [],
    frames: Array.isArray(entry.frames) ? entry.frames : [],
    quotes: Array.isArray(entry.quotes) ? entry.quotes : [],
    stickers: Array.isArray(entry.stickers) ? entry.stickers : []
  };
}

export async function loadWorldBackgrounds(world, catalogBackgrounds = []) {
  const endpoint = new URL(`../api/backgrounds/${encodeURIComponent(world)}`, import.meta.url);
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Background request failed (${response.status})`);
  const data = await response.json();
  if (data?.world !== world || !Array.isArray(data.backgrounds) || !Array.isArray(data.unsupported)) {
    throw new Error('The background service returned an unexpected response.');
  }

  const backgrounds = [];
  const seen = new Set();
  for (const item of [...catalogBackgrounds, ...data.backgrounds]) {
    if (!item || typeof item.src !== 'string') continue;
    const key = item.src.replace(/\\/g, '/').normalize('NFC').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    backgrounds.push(item);
  }
  return { backgrounds, unsupported: data.unsupported };
}

export function assetUrl(src) {
  // The catalog includes one real file whose entire basename is “.jpg”. Expose it through a safe URL alias.
  if (src === 'assets/desi/desi q/.jpg') return new URL('../__catalog-exception/desi-quote', import.meta.url).href;
  return new URL(`../${src.split('/').map(part => encodeURIComponent(part)).join('/')}`, import.meta.url).href;
}

export function loadImage(src, { crossOrigin = 'anonymous' } = {}) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = crossOrigin;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load asset: ${src}`));
    image.src = assetUrl(src);
  });
}
