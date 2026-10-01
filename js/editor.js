import { assetUrl, loadCatalog, loadImage, loadWorldBackgrounds, worldAssets } from './assets.js';
import { FONT_LIST, ensureFont } from './fonts.js';
import { FILTERS, createImageFilters } from './filters.js';
import { addFrame, addPhotoToSlot } from './frames.js';
import { HistoryManager } from './history.js';

const WORLD_NAMES = { pastel: 'Pastel Kawaii', y2k: 'Y2K Kawaii', desi: 'Desi World', grunge: 'Grunge Kawaii', shoujo: 'Shoujo Kawaii', floral: 'Floral Dream' };
const WORLD_ICONS = { pastel: '🌸', y2k: '💿', desi: '🪔', grunge: '🖤', shoujo: '🌹', floral: '🌼' };
const TEXT_COLORS = [
  ['White','#ffffff'],['Black','#17151b'],['Red','#e04b53'],['Green','#32885a'],['Blue','#3977cf'],
  ['Yellow','#f2d84d'],['Baby Blue','#a7d8f0'],['Buttermilk Yellow','#f5e8a5'],['Baby Pink','#f4b9cc'],['Lavender','#c9b3e6'],
  ['Navy','#202e64'],['Maroon','#762e42'],['Burgundy','#7f1734'],['Grey','#929198'],['Magenta','#d444a4']
];
const catalogWorldIds = ['pastel','y2k','desi','grunge','shoujo','floral'];
const root = document.body;
const drawer = document.querySelector('#drawer');
const drawerInner = document.querySelector('#drawerInner');
const canvasStage = document.querySelector('#canvasStage');
let canvas;
let catalog;
let history;
let activeWorld = new URLSearchParams(location.search).get('world')?.toLowerCase();
let activeTool = null;
let activeCrop = null;
let lastPhotoFilterTarget = null;
let layouts = { frames: {} };
let currentInventory = [];

function status(message) { const el = document.querySelector('#canvasStatus'); if (el) el.textContent = message; }
function safeName(value, max = 52) { const text = String(value ?? 'Untitled').replace(/\s+/g, ' ').trim(); return text.length > max ? `${text.slice(0, max - 1)}…` : text; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]); }

async function init() {
  await ensureFabricLoaded();
  if (!window.fabric) { status('Fabric.js did not load. Check the local server, then reload.'); return; }
  if (!catalogWorldIds.includes(activeWorld)) activeWorld = 'pastel';
  root.dataset.theme = activeWorld;
  document.querySelector('#worldName').textContent = WORLD_NAMES[activeWorld];
  renderSwitcher();
  canvas = new fabric.Canvas('designCanvas', { backgroundColor: '#ffffff', preserveObjectStacking: true, selection: true, stopContextMenu: true, fireRightClick: false, enableRetinaScaling: true });
  canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
  await fitCanvas();
  new ResizeObserver(fitCanvas).observe(canvasStage);
  try { const response = await fetch(new URL('../frame-layouts.json', import.meta.url)); if (response.ok) layouts = await response.json(); } catch (error) { console.warn('Frame layout data is not available.', error); }
  history = new HistoryManager(canvas, status);
  history.capture();
  wireToolbar();
  wireCanvas();
  wireModals();
  wireKeyboard();
  try { catalog = await loadCatalog(); } catch (error) { status(`Asset catalog could not load: ${error.message}`); }
  renderLayers();
}

function ensureFabricLoaded() {
  if (window.fabric) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../vendor/fabric.min.js', import.meta.url).href;
    script.onload = () => window.fabric ? resolve() : reject(new Error('Fabric.js loaded without exposing its browser API.'));
    script.onerror = () => reject(new Error('Could not load the local Fabric.js library.'));
    document.head.appendChild(script);
  });
}

async function fitCanvas() {
  if (!canvas || !canvasStage) return;
  const box = canvasStage.getBoundingClientRect();
  const scale = Math.max(.15, Math.min((box.width - 48) / 900, (box.height - 48) / 650, 1));
  canvas.setZoom(1);
  const width = `${900 * scale}px`;
  const height = `${650 * scale}px`;
  canvas.setDimensions({ width, height }, { cssOnly: true });
  canvas.wrapperEl.style.width = width;
  canvas.wrapperEl.style.height = height;
  canvas.calcOffset();
  canvas.requestRenderAll();
}

function renderSwitcher() {
  const names = { pastel:'Pastel', y2k:'Y2K', desi:'Desi', grunge:'Grunge', shoujo:'Shoujo', floral:'Floral' };
  document.querySelector('#switcher').innerHTML = catalogWorldIds.map(id => `<button type="button" data-world="${id}" class="${id === activeWorld ? 'active' : ''}">${WORLD_ICONS[id]} ${names[id]}</button>`).join('');
  document.querySelector('#switcher').addEventListener('click', event => {
    const button = event.target.closest('[data-world]');
    if (!button) return;
    activeWorld = button.dataset.world;
    canvas.isDrawingMode = false;
    root.dataset.theme = activeWorld;
    document.querySelector('#worldName').textContent = WORLD_NAMES[activeWorld];
    document.querySelectorAll('#switcher button').forEach(item => item.classList.toggle('active', item === button));
    closeDrawer();
    status(`${WORLD_NAMES[activeWorld]} selected. Your canvas composition is unchanged.`);
  });
}

function wireToolbar() {
  document.querySelector('#toolbar').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.tool) { activeTool === button.dataset.tool ? closeDrawer() : openDrawer(button.dataset.tool); return; }
    switch (button.dataset.action) {
      case 'upload': document.querySelector('#photoInput').click(); break;
      case 'uploadSticker': document.querySelector('#stickerInput').click(); break;
      case 'rotate': rotateSelection(); break;
      case 'crop': beginCrop(); break;
      case 'delete': deleteSelection(); break;
      case 'doodles': toggleDoodles(); break;
    }
  });
  document.querySelector('#photoInput').addEventListener('change', event => addUploads(event.target.files, 'photo'));
  document.querySelector('#stickerInput').addEventListener('change', event => addUploads(event.target.files, 'sticker'));
  document.querySelector('#undoBtn').addEventListener('click', () => history?.undo());
  document.querySelector('#redoBtn').addEventListener('click', () => history?.redo());
  document.querySelector('#deleteBtn').addEventListener('click', deleteSelection);
  document.querySelector('#whiteCanvasBtn').addEventListener('click', () => { canvas.setBackgroundImage(null); canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas)); status('White canvas restored.'); history.schedule(); });
  document.querySelector('#emptyCanvasBtn').addEventListener('click', () => { if (!confirm('Clear all objects and reset to a white canvas?')) return; canvas.clear(); canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas)); status('Canvas cleared.'); history.capture(); renderLayers(); });
  document.querySelector('#openLayers').addEventListener('click', () => openDrawer('layers'));
}

function wireCanvas() {
  canvas.on('selection:created', selectionChanged);
  canvas.on('selection:updated', selectionChanged);
  canvas.on('selection:cleared', selectionChanged);
  canvas.on('object:modified', () => { renderLayers(); renderInspector(); });
  canvas.on('object:added', () => { renderLayers(); renderInspector(); });
  canvas.on('object:removed', () => { renderLayers(); renderInspector(); });
  canvas.on('object:scaling', ({ target }) => {
    if (!target) return;
    target.set({ scaleX: Math.max(.05, Math.min(8, target.scaleX)), scaleY: Math.max(.05, Math.min(8, target.scaleY)) });
  });
  canvas.on('path:created', () => { status('Doodle added. Undo is available.'); });
  canvas.on('mouse:down', () => { if (canvas.isDrawingMode) status('Drawing on your canvas…'); });
}

function wireModals() {
  document.querySelector('#previewBtn').addEventListener('click', showPreview);
  document.querySelector('#previewExportBtn').addEventListener('click', () => document.querySelector('#exportModal').hidden = false);
  document.querySelector('#backToEdit').addEventListener('click', () => document.querySelector('#previewOverlay').hidden = true);
  document.querySelector('#exportBtn').addEventListener('click', () => document.querySelector('#exportModal').hidden = false);
  document.querySelector('#downloadBtn').addEventListener('click', downloadImage);
  document.querySelectorAll('[data-close-export]').forEach(button => button.addEventListener('click', () => document.querySelector('#exportModal').hidden = true));
  document.querySelector('#exportModal').addEventListener('click', event => { if (event.target.id === 'exportModal') event.currentTarget.hidden = true; });
  document.querySelectorAll('[data-close-crop]').forEach(button => button.addEventListener('click', cancelCrop));
  document.querySelector('#applyCrop').addEventListener('click', applyCrop);
}

function wireKeyboard() {
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (activeCrop) cancelCrop(); else if (activeTool) closeDrawer(); return; }
    if (event.target.matches('input,textarea,select,[contenteditable="true"]')) return;
    if ((event.key === 'Delete' || event.key === 'Backspace') && !activeCrop) { event.preventDefault(); deleteSelection(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? history?.redo() : history?.undo(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); history?.redo(); }
  });
}

function openDrawer(tool) {
  if (tool !== 'doodles' && canvas?.isDrawingMode) canvas.isDrawingMode = false;
  activeTool = tool;
  root.classList.add('drawer-open');
  drawer.classList.add('open');
  document.querySelectorAll('.tool-btn[data-tool]').forEach(button => button.classList.toggle('active', button.dataset.tool === tool));
  renderInventory(tool);
}
function closeDrawer() {
  activeTool = null;
  root.classList.remove('drawer-open');
  drawer.classList.remove('open');
  document.querySelectorAll('.tool-btn').forEach(button => button.classList.remove('active'));
  drawerInner.innerHTML = '';
  fitCanvas();
}

function showInventoryHeader(title, text = '') {
  drawerInner.innerHTML = `<div class="inventory-head"><h2>${title}</h2><button type="button" data-close-drawer aria-label="Close panel">×</button></div>${text ? `<p class="inventory-note">${text}</p>` : ''}`;
  drawerInner.querySelector('[data-close-drawer]').addEventListener('click', closeDrawer);
}

async function renderInventory(tool) {
  if (!catalog && ['stickers','backgrounds','frames','quotes'].includes(tool)) {
    showInventoryHeader(tool[0].toUpperCase() + tool.slice(1));
    drawerInner.insertAdjacentHTML('beforeend', '<p class="loading-message">Loading your world’s collection…</p>');
    try { catalog = await loadCatalog(); } catch (error) { drawerInner.lastChild.textContent = error.message; return; }
  }
  if (['stickers','backgrounds','frames','quotes'].includes(tool)) return renderAssetInventory(tool);
  if (tool === 'fonts') return renderFonts();
  if (tool === 'filters') return renderFilters();
  if (tool === 'text') return renderTextPanel();
  if (tool === 'layers') return renderLayerPanel();
}

async function renderAssetInventory(tool) {
  const world = activeWorld;
  const data = worldAssets(catalog, world);
  const titles = { stickers: 'Stickers', backgrounds: 'Backgrounds', frames: 'Frames', quotes: 'Quote stickers' };
  const field = { stickers: 'stickers', backgrounds: 'backgrounds', frames: 'frames', quotes: 'quotes' }[tool];
  const notes = { stickers: `One ${WORLD_NAMES[world]} sticker collection — click any item to add it.`, backgrounds: 'Choose an image to set it as the canvas background.', frames: 'Real frame assets from this world. Slot geometry is supplied separately.', quotes: 'Quote images from the current world. Click one to add it to the canvas.' };
  showInventoryHeader(titles[tool], notes[tool]);
  let items = data[field];
  if (tool === 'backgrounds') {
    drawerInner.insertAdjacentHTML('beforeend', '<p class="loading-message">Scanning this world’s background folder…</p>');
    try {
      const result = await loadWorldBackgrounds(world, data.backgrounds);
      if (activeTool !== tool || activeWorld !== world) return;
      items = result.backgrounds;
      if (result.unsupported.length) {
        console.warn(`Ignored unsupported background files in ${world}:`, result.unsupported);
        status(`${result.unsupported.length} unsupported file${result.unsupported.length === 1 ? '' : 's'} ignored in ${WORLD_NAMES[world]} backgrounds.`);
      }
    } catch (error) {
      console.warn(`Could not scan the ${world} background folder; showing catalog entries.`, error);
      status(`Could not refresh ${WORLD_NAMES[world]} backgrounds: ${error.message}`);
    }
    if (activeTool !== tool || activeWorld !== world) return;
    drawerInner.querySelector('.loading-message')?.remove();
  }
  currentInventory = items;
  drawerInner.insertAdjacentHTML('beforeend', `<input class="inventory-search" id="assetSearch" type="search" placeholder="Search ${titles[tool].toLowerCase()}…" aria-label="Search ${titles[tool].toLowerCase()}"><div class="asset-grid" id="assetGrid"></div>`);
  const render = (query = '') => {
    const filtered = currentInventory.filter(item => !query || `${item.name} ${item.photoSlots ?? ''}`.toLowerCase().includes(query.toLowerCase()));
    const grid = drawerInner.querySelector('#assetGrid');
    if (!filtered.length) { grid.innerHTML = '<p class="empty-inventory">Nothing found for that search.</p>'; return; }
    grid.innerHTML = filtered.map(item => `<button class="asset-card" type="button" data-index="${currentInventory.indexOf(item)}" title="${escapeHtml(safeName(item.name,120))}"><img loading="lazy" data-src="${assetUrl(item.src)}" alt="${escapeHtml(safeName(item.name,70))}"><span class="asset-name">${escapeHtml(safeName(item.name))}</span>${tool === 'frames' ? `<span class="asset-meta">${item.photoSlots} photo${item.photoSlots === 1 ? '' : 's'}</span>` : ''}</button>`).join('');
    grid.querySelectorAll('img[data-src]').forEach(img => {
      img.addEventListener('error', () => { img.alt = 'Preview unavailable'; img.classList.add('asset-error'); img.removeAttribute('src'); }, { once: true });
      if ('IntersectionObserver' in window) lazyObserver.observe(img); else img.src = img.dataset.src;
    });
  };
  render();
  drawerInner.querySelector('#assetSearch').addEventListener('input', event => render(event.target.value));
  drawerInner.querySelector('#assetGrid').addEventListener('click', async event => {
    const card = event.target.closest('[data-index]');
    if (!card) return;
    const item = currentInventory[Number(card.dataset.index)];
    if (!item) return;
    if (tool === 'stickers') await addCatalogImage(item, 'sticker');
    else if (tool === 'quotes') await addCatalogImage(item, 'quote');
    else if (tool === 'backgrounds') await setBackground(item);
    else if (tool === 'frames') {
      const frameObject = await addFrame(canvas, item, layouts, status);
      const layout = layouts?.frames?.[item.src];
      if (frameObject && layout?.slots?.length) showFrameSlotChooser(frameObject, item, layout);
    }
  });
}

function showFrameSlotChooser(frameObject, frame, layout) {
  drawerInner.querySelector('#frameSlotChooser')?.remove();
  const slots = Array.isArray(layout.slots) ? layout.slots.slice(0, frame.photoSlots) : [];
  const chooser = document.createElement('div');
  chooser.id = 'frameSlotChooser';
  chooser.className = 'frame-slot-chooser';
  chooser.innerHTML = `<p class="inventory-note">${escapeHtml(safeName(frame.name))} · add a photo to a defined slot:</p>${slots.map((_, index) => `<button class="pill-btn" type="button" data-fill-slot="${index}">＋ Photo ${index + 1}</button>`).join('')}`;
  drawerInner.prepend(chooser);
  chooser.addEventListener('click', async event => {
    const button = event.target.closest('[data-fill-slot]');
    if (!button) return;
    const slot = slots[Number(button.dataset.fillSlot)];
    const picker = document.createElement('input');
    picker.type = 'file'; picker.accept = 'image/jpeg,image/png,image/webp';
    picker.addEventListener('change', async () => {
      const file = picker.files?.[0];
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size > 24 * 1024 * 1024) { status('Choose a JPG, PNG, or WEBP image up to 24 MB.'); return; }
      try {
        await addPhotoToSlot(canvas, URL.createObjectURL(file), frameObject, slot);
        canvas.requestRenderAll(); history.capture(); status(`Photo added to slot ${Number(button.dataset.fillSlot) + 1}.`);
      } catch (error) { status(`Could not load the slot photo: ${error.message}`); }
    }, { once: true });
    picker.click();
  });
}

const lazyObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { const img = entry.target; img.src = img.dataset.src; img.removeAttribute('data-src'); lazyObserver.unobserve(img); } }), { root: document.querySelector('#drawerInner'), rootMargin: '100px' }) : null;

function renderFonts() {
  showInventoryHeader('Fonts', 'One combined font list for every world. Click a name to apply it to selected text.');
  drawerInner.insertAdjacentHTML('beforeend', `<input class="inventory-search" id="fontSearch" type="search" placeholder="Search 30 fonts…"><div id="fontList"></div>`);
  const list = drawerInner.querySelector('#fontList');
  const draw = query => {
    const fonts = FONT_LIST.filter(font => `${font.name} ${font.world}`.toLowerCase().includes(query.toLowerCase()));
    list.innerHTML = fonts.map(font => `<button class="font-card" type="button" data-font="${font.name}">${font.name}<small>${font.world}</small></button>`).join('') || '<p class="empty-inventory">No fonts match.</p>';
    list.querySelectorAll('[data-font]').forEach(button => button.style.fontFamily = `"${button.dataset.font}",sans-serif`);
  };
  draw('');
  drawerInner.querySelector('#fontSearch').addEventListener('input', event => draw(event.target.value));
  list.addEventListener('click', async event => {
    const button = event.target.closest('[data-font]');
    const object = canvas.getActiveObject();
    if (!button) return;
    if (!(object instanceof fabric.IText || object instanceof fabric.Textbox)) { status('Select a text object before choosing a font.'); return; }
    const font = FONT_LIST.find(item => item.name === button.dataset.font);
    if (!await ensureFont(font)) { status(`The ${font.name} font could not be loaded.`); return; }
    object.set('fontFamily', font.name); canvas.requestRenderAll(); canvas.fire('object:modified', { target: object });
    status(`${font.name} applied.`);
  });
}

function renderFilters() {
  showInventoryHeader(`${WORLD_NAMES[activeWorld]} filters`, 'Choose a look to adjust the selected photo. Text and stickers are left untouched.');
  const entries = FILTERS[activeWorld];
  drawerInner.insertAdjacentHTML('beforeend', `<div class="filter-list"><button class="filter-card" type="button" data-filter-reset><span class="filter-sample" style="--sample:#fff">◒</span><span>Original</span></button>${entries.map(([name, values], index) => `<button class="filter-card" type="button" data-filter-index="${index}"><span class="filter-sample" style="--sample:${filterTint(values)}">◒</span><span>${name}</span></button>`).join('')}</div>`);
  drawerInner.querySelector('.filter-list').addEventListener('click', event => {
    const button = event.target.closest('[data-filter-index]');
    const resetButton = event.target.closest('[data-filter-reset]');
    if (!button && !resetButton) return;
    const object = getFilterTarget();
    if (!object) { status('Add or select an uploaded photo or a photo in a defined frame slot to apply a filter.'); return; }
    if (resetButton) {
      applyPhotoFiltersPreservingGeometry(object, []);
      canvas.requestRenderAll(); canvas.fire('object:modified', { target: object });
      status('Original appearance restored. Photo geometry and crop are unchanged.');
      return;
    }
    const entry = entries[Number(button.dataset.filterIndex)];
    applyPhotoFiltersPreservingGeometry(object, createImageFilters(entry[1]));
    canvas.requestRenderAll(); canvas.fire('object:modified', { target: object });
    status(`“${entry[0]}” applied to the photo. Stickers and text are unchanged.`);
  });
}
function filterTint(filters) { return filters.find(([type]) => type === 'BlendColor')?.[1] || (filters.some(([type]) => type === 'Grayscale') ? '#777' : '#dfa4bf'); }

function renderTextPanel() {
  showInventoryHeader('Text', 'Add editable words to your canvas. Double-click the text to type directly.');
  drawerInner.insertAdjacentHTML('beforeend', `<div class="property-group"><label for="newText">Your text</label><textarea id="newText" rows="3" placeholder="Type something pretty…"></textarea></div><button class="download-btn" id="addText">＋ Add text</button><div class="property-group"><label>Text color</label><div class="color-grid">${TEXT_COLORS.map(([name,color]) => `<button class="color-swatch" type="button" title="${name}" aria-label="${name}" data-color="${color}" style="background:${color}"></button>`).join('')}</div></div><p class="inventory-note">Select a text object, then use the right panel for size and alignment.</p>`);
  drawerInner.querySelector('#addText').addEventListener('click', addText);
  drawerInner.querySelector('.color-grid').addEventListener('click', event => { const color = event.target.closest('[data-color]')?.dataset.color; const object = canvas.getActiveObject(); if (!color) return; if (!(object instanceof fabric.IText || object instanceof fabric.Textbox)) { status('Select text first, or add text above.'); return; } object.set('fill', color); canvas.requestRenderAll(); canvas.fire('object:modified', { target: object }); });
}

function renderLayerPanel() {
  showInventoryHeader('Layers', 'The top item is the topmost item on your canvas.');
  drawerInner.insertAdjacentHTML('beforeend', '<div id="fullLayerList"></div>');
  const list = drawerInner.querySelector('#fullLayerList');
  const draw = () => {
    const objects = canvas.getObjects().slice().reverse();
    list.innerHTML = objects.length ? objects.map((object, index) => `<div class="layer-row ${canvas.getActiveObject() === object ? 'selected' : ''}" data-object-index="${objects.length - 1 - index}"><span class="layer-name" title="Select">${escapeHtml(safeName(object.catalogName || object.text || (object.isFrame ? 'Frame' : object.catalogType === 'sticker' ? 'Sticker' : object.type),30))}</span><button type="button" data-layer="up" title="Bring forward">↑</button><button type="button" data-layer="down" title="Send backward">↓</button><button type="button" data-layer="delete" title="Delete">×</button></div>`).join('') : '<p class="empty-inventory">Your canvas has no layers yet.</p>';
  };
  draw();
  list.addEventListener('click', event => {
    const row = event.target.closest('[data-object-index]'); if (!row) return;
    const object = canvas.getObjects()[Number(row.dataset.objectIndex)]; if (!object) return;
    const action = event.target.closest('[data-layer]')?.dataset.layer;
    if (action === 'up') canvas.bringForward(object);
    else if (action === 'down') canvas.sendBackwards(object);
    else if (action === 'delete') { canvas.remove(object); }
    else { canvas.setActiveObject(object); }
    canvas.requestRenderAll(); renderLayers(); renderInspector(); draw(); history.schedule();
  });
}

async function addCatalogImage(item, type) {
  try {
    const element = await loadImage(item.src);
    const image = new fabric.Image(element, { originX: 'center', originY: 'center', left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, catalogType: type, catalogName: item.name, catalogId: item.src, selectable: true, objectCaching: true });
    const scale = type === 'quote' ? Math.min(240 / image.width, 190 / image.height, 1) : Math.min(180 / image.width, 180 / image.height, 1);
    image.scale(scale);
    canvas.add(image); canvas.setActiveObject(image); canvas.requestRenderAll();
    status(`${type === 'quote' ? 'Quote' : 'Sticker'} added. Add as many as you like.`);
    return image;
  } catch (error) { status(error.message); return null; }
}

async function setBackground(item) {
  try {
    const imageElement = await loadImage(item.src);
    const image = new fabric.Image(imageElement, { originX: 'left', originY: 'top', left: 0, top: 0, selectable: false, evented: false, objectCaching: true, catalogType: 'background', catalogName: item.name });
    const scale = Math.max(canvas.getWidth() / image.width, canvas.getHeight() / image.height);
    image.set({ scaleX: scale, scaleY: scale, left: (canvas.getWidth() - image.width * scale) / 2, top: (canvas.getHeight() - image.height * scale) / 2 });
    canvas.setBackgroundImage(image, canvas.renderAll.bind(canvas));
    canvas.backgroundColor = 'rgba(0,0,0,0)'; canvas.requestRenderAll();
    status(`“${safeName(item.name)}” set as the canvas background.`); history.schedule();
  } catch (error) { status(error.message); }
}

async function addUploads(fileList, type) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const maxSize = 24 * 1024 * 1024;
  let added = 0;
  for (const file of files) {
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) { status(`${file.name}: choose JPG, PNG, or WEBP images.`); continue; }
    if (file.size > maxSize) { status(`${file.name}: files must be 24 MB or smaller.`); continue; }
    const url = URL.createObjectURL(file);
    try {
      await new Promise((resolve, reject) => fabric.Image.fromURL(url, image => {
        if (!image) { reject(new Error(`Could not read ${file.name}.`)); return; }
        const factor = Math.min(650 / image.width, 480 / image.height, 1);
        image.set({ originX: 'center', originY: 'center', left: canvas.getWidth() / 2 + added * 18, top: canvas.getHeight() / 2 + added * 18, scaleX: factor, scaleY: factor, catalogType: type, catalogName: file.name, selectable: true, objectCaching: true });
        canvas.add(image); canvas.setActiveObject(image); resolve();
      }, { crossOrigin: 'anonymous' }));
      added++;
    } catch (error) { status(error.message); }
  }
  canvas.requestRenderAll();
  if (added) status(`${added} ${type === 'sticker' ? 'sticker' : 'photo'}${added === 1 ? '' : 's'} added. Drag, resize, rotate or crop ${type === 'photo' ? 'a photo' : 'it'}.`);
  history.capture();
  document.querySelector(type === 'photo' ? '#photoInput' : '#stickerInput').value = '';
}

async function addText() {
  const field = drawerInner.querySelector('#newText');
  const value = field?.value.trim();
  if (!value) { status('Type something first.'); field?.focus(); return; }
  const object = new fabric.Textbox(value, { left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: 'center', originY: 'center', width: 320, fontSize: 48, fontFamily: 'Quicksand', fill: '#372d3b', textAlign: 'center', editable: true, splitByGrapheme: true, minWidth: 45, objectCaching: false, catalogType: 'text' });
  await ensureFont(FONT_LIST[0]);
  canvas.add(object); canvas.setActiveObject(object); object.enterEditing(); object.selectAll(); canvas.requestRenderAll(); field.value = '';
  status('Text added. Type to edit, then click away.');
}

function rotateSelection() {
  const object = canvas.getActiveObject(); if (!object) { status('Select an object to rotate.'); return; }
  object.rotate(((object.angle || 0) + 90) % 360); object.setCoords(); canvas.requestRenderAll(); canvas.fire('object:modified', { target: object }); status('Rotated 90°.');
}
function deleteSelection() {
  const object = canvas.getActiveObject(); if (!object) { status('Select an object to delete.'); return; }
  canvas.remove(object); canvas.discardActiveObject(); canvas.requestRenderAll(); status('Selected object deleted.');
}
function toggleDoodles() {
  canvas.isDrawingMode = !canvas.isDrawingMode;
  if (canvas.isDrawingMode) { canvas.freeDrawingBrush = new fabric.PencilBrush(canvas); canvas.freeDrawingBrush.color = root.dataset.doodleColor || '#d76f9d'; canvas.freeDrawingBrush.width = 4; openDrawer('doodles'); renderDoodlePanel(); status('Doodle mode is on. Draw directly on the canvas.'); }
  else { closeDrawer(); status('Doodle mode is off.'); }
}
function renderDoodlePanel() {
  showInventoryHeader('Doodles', 'Draw freely on your canvas. Choose a color and brush size.');
  drawerInner.insertAdjacentHTML('beforeend', `<div class="property-group"><label>Stroke color</label><div class="color-grid">${TEXT_COLORS.slice(0,10).map(([,color]) => `<button class="color-swatch" type="button" style="background:${color}" data-brush-color="${color}"></button>`).join('')}</div></div><div class="property-group"><label>Brush size <span id="brushSizeLabel">4</span></label><input id="brushSize" type="range" min="1" max="32" value="4"></div><button class="download-btn" id="finishDoodle">Done drawing</button>`);
  drawerInner.querySelector('[data-brush-color]').classList.add('active');
  drawerInner.querySelector('.color-grid').addEventListener('click', event => { const button = event.target.closest('[data-brush-color]'); if (!button) return; canvas.freeDrawingBrush.color = button.dataset.brushColor; });
  drawerInner.querySelector('#brushSize').addEventListener('input', event => { canvas.freeDrawingBrush.width = Number(event.target.value); drawerInner.querySelector('#brushSizeLabel').textContent = event.target.value; });
  drawerInner.querySelector('#finishDoodle').addEventListener('click', () => { canvas.isDrawingMode = false; closeDrawer(); });
}

function selectionChanged() {
  const object = canvas.getActiveObject();
  if (isFilterablePhoto(object)) lastPhotoFilterTarget = object;
  document.querySelector('#deleteBtn').disabled = !object;
  renderInspector(); renderLayers();
}
function isFilterablePhoto(object) {
  return object instanceof fabric.Image && ['photo','frame-photo'].includes(object.catalogType);
}
function getFilterTarget() {
  const selected = canvas.getActiveObject();
  if (isFilterablePhoto(selected)) {
    lastPhotoFilterTarget = selected;
    return selected;
  }
  if (lastPhotoFilterTarget && canvas.getObjects().includes(lastPhotoFilterTarget)) return lastPhotoFilterTarget;
  lastPhotoFilterTarget = canvas.getObjects().slice().reverse().find(isFilterablePhoto) || null;
  return lastPhotoFilterTarget;
}
function applyPhotoFiltersPreservingGeometry(image, filters) {
  const geometry = {};
  for (const key of ['left', 'top', 'width', 'height', 'scaleX', 'scaleY', 'angle', 'flipX', 'flipY', 'originX', 'originY', 'cropX', 'cropY', 'skewX', 'skewY']) geometry[key] = image[key];
  image.filters = filters;
  image.applyFilters();
  image.set(geometry);
  image.setCoords();
}
function renderLayers() {
  const target = document.querySelector('#layerMiniList'); if (!target || !canvas) return;
  const objects = canvas.getObjects().slice().reverse().slice(0,7);
  target.innerHTML = objects.map(object => `<div class="mini-layer ${canvas.getActiveObject() === object ? 'active' : ''}" data-select-layer="${canvas.getObjects().indexOf(object)}"><span>${escapeHtml(safeName(object.catalogName || object.text || object.catalogType || object.type,24))}</span><span>${object.visible === false ? '◌' : '●'}</span></div>`).join('') || '<p class="panel-hint">No objects yet.</p>';
  target.querySelectorAll('[data-select-layer]').forEach(row => row.addEventListener('click', () => { const object = canvas.getObjects()[Number(row.dataset.selectLayer)]; if (object) canvas.setActiveObject(object); canvas.requestRenderAll(); selectionChanged(); }));
}
function renderInspector() {
  const panel = document.querySelector('#selectionPanel'); if (!panel || !canvas) return;
  const object = canvas.getActiveObject();
  if (!object) { panel.innerHTML = '<p class="panel-hint">Select something on your canvas to see its details.</p>'; return; }
  const isText = object instanceof fabric.IText || object instanceof fabric.Textbox;
  panel.innerHTML = `<div class="property-group"><label>Opacity <span data-opacity-value>${Math.round((object.opacity ?? 1) * 100)}%</span></label><input data-prop="opacity" type="range" min="5" max="100" value="${Math.round((object.opacity ?? 1) * 100)}"></div><div class="property-group"><label>Rotation</label><div class="property-row"><button data-rotate="-90">−90°</button><button data-rotate="90">+90°</button></div></div><div class="property-group"><label>Size</label><div class="property-row"><button data-scale=".9">−</button><button data-scale="1.1">+</button></div></div>${isText ? `<div class="property-group"><label>Font size · ${Math.round(object.fontSize)}px</label><input data-prop="fontSize" type="range" min="10" max="160" value="${Math.max(10,Math.min(160,Math.round(object.fontSize)))}"></div><div class="property-group"><label>Alignment</label><div class="property-row">${['left','center','right'].map(value => `<button class="${object.textAlign===value?'active':''}" data-align="${value}">${value[0].toUpperCase()}</button>`).join('')}</div></div><div class="property-group"><label>Text color</label><div class="color-grid">${TEXT_COLORS.map(([name,color]) => `<button class="color-swatch" style="background:${color}" title="${name}" aria-label="${name}" data-text-color="${color}"></button>`).join('')}</div></div>` : ''}<div class="property-row property-actions"><button data-duplicate>Duplicate</button><button data-bring-front>To front</button></div>`;
  panel.querySelector('[data-prop="opacity"]').addEventListener('input', event => { object.set('opacity', Number(event.target.value) / 100); panel.querySelector('[data-opacity-value]').textContent = `${event.target.value}%`; canvas.requestRenderAll(); });
  panel.querySelector('[data-prop="opacity"]').addEventListener('change', () => canvas.fire('object:modified', { target: object }));
  panel.querySelectorAll('[data-rotate]').forEach(button => button.addEventListener('click', () => { object.rotate(((object.angle || 0) + Number(button.dataset.rotate) + 360) % 360); object.setCoords(); canvas.requestRenderAll(); canvas.fire('object:modified', { target: object }); }));
  panel.querySelectorAll('[data-scale]').forEach(button => button.addEventListener('click', () => { const scale = Number(button.dataset.scale); object.scale(Math.max(.05,Math.min(8,object.scaleX*scale))); object.setCoords(); canvas.requestRenderAll(); canvas.fire('object:modified', { target: object }); }));
  panel.querySelector('[data-prop="fontSize"]')?.addEventListener('input', event => { object.set('fontSize', Number(event.target.value)); event.target.previousElementSibling.textContent = `Font size · ${event.target.value}px`; canvas.requestRenderAll(); });
  panel.querySelector('[data-prop="fontSize"]')?.addEventListener('change', () => canvas.fire('object:modified', { target: object }));
  panel.querySelectorAll('[data-align]').forEach(button => button.addEventListener('click', () => { object.set('textAlign', button.dataset.align); canvas.requestRenderAll(); canvas.fire('object:modified', { target: object }); renderInspector(); }));
  panel.querySelectorAll('[data-text-color]').forEach(button => button.addEventListener('click', () => { object.set('fill', button.dataset.textColor); canvas.requestRenderAll(); canvas.fire('object:modified', { target: object }); }));
  panel.querySelector('[data-duplicate]').addEventListener('click', () => object.clone(clone => { clone.set({ left: object.left + 24, top: object.top + 24 }); canvas.add(clone); canvas.setActiveObject(clone); canvas.requestRenderAll(); }));
  panel.querySelector('[data-bring-front]').addEventListener('click', () => { canvas.bringToFront(object); canvas.requestRenderAll(); canvas.fire('object:modified', { target: object }); });
}

function showPreview() {
  const mount = document.querySelector('#previewMount'); mount.innerHTML = '';
  const preview = canvas.toCanvasElement(1, { withoutTransform: true }); preview.style.width = 'min(70vw, 900px)'; preview.style.height = 'auto'; mount.appendChild(preview);
  document.querySelector('#previewOverlay').hidden = false;
}

async function beginCrop() {
  const object = canvas.getActiveObject();
  if (!(object instanceof fabric.Image) || object.isFrame) { status('Select a photo to crop.'); return; }
  const cropState = { object, original: { cropX: object.cropX || 0, cropY: object.cropY || 0, width: object.width, height: object.height, left: object.left, top: object.top, angle: object.angle, scaleX: object.scaleX, scaleY: object.scaleY }, display: null, dragController: null };
  activeCrop = cropState;
  const modal = document.querySelector('#cropModal');
  modal.hidden = false;
  await new Promise(resolve => requestAnimationFrame(resolve));
  if (activeCrop !== cropState) return;
  const canvasElement = document.querySelector('#cropCanvas');
  const cropPreview = document.querySelector('.crop-preview');
  const maxWidth = Math.min(cropPreview.clientWidth - 24, 540);
  const maxHeight = cropPreview.clientHeight - 24;
  const ratio = Math.min(maxWidth / object.width, maxHeight / object.height, 1);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    modal.hidden = true;
    activeCrop = null;
    status('Crop preview could not be measured. Resize the editor and try again.');
    return;
  }
  const width = Math.max(1, Math.round(object.width * ratio));
  const height = Math.max(1, Math.round(object.height * ratio));
  canvasElement.width = width; canvasElement.height = height; canvasElement.style.width = `${width}px`; canvasElement.style.height = `${height}px`;
  const context = canvasElement.getContext('2d');
  context.drawImage(object._element, object.cropX || 0, object.cropY || 0, object.width, object.height, 0, 0, width, height);
  const box = document.querySelector('#cropBox');
  cropState.display = { width, height, scaleX: width / object.width, scaleY: height / object.height, canvasElement, cropPreview, box, selection: { x: width * .1, y: height * .1, width: width * .8, height: height * .8 } };
  syncCropBox(cropState.display);
  wireCropBox(box, cropState.display);
}

function cropCanvasPoint(event, imageCanvas) {
  const bounds = imageCanvas.getBoundingClientRect();
  return { x: (event.clientX - bounds.left) * imageCanvas.width / bounds.width, y: (event.clientY - bounds.top) * imageCanvas.height / bounds.height };
}

function syncCropBox(display) {
  const { box, canvasElement, cropPreview, selection } = display;
  const imageBounds = canvasElement.getBoundingClientRect();
  const previewBounds = cropPreview.getBoundingClientRect();
  const scaleX = imageBounds.width / canvasElement.width;
  const scaleY = imageBounds.height / canvasElement.height;
  box.style.left = `${imageBounds.left - previewBounds.left + selection.x * scaleX}px`;
  box.style.top = `${imageBounds.top - previewBounds.top + selection.y * scaleY}px`;
  box.style.width = `${selection.width * scaleX}px`;
  box.style.height = `${selection.height * scaleY}px`;
}

function wireCropBox(box, display) {
  box.onpointerdown = event => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.target.closest('[data-crop-handle]')?.dataset.cropHandle || 'move';
    const point = cropCanvasPoint(event, display.canvasElement);
    const start = { ...display.selection, pointerX: point.x, pointerY: point.y };
    activeCrop.dragController?.abort();
    activeCrop.dragController = new AbortController();
    const { signal } = activeCrop.dragController;
    const minimum = Math.min(40, display.width, display.height);
    const move = moveEvent => {
      const current = cropCanvasPoint(moveEvent, display.canvasElement);
      const dx = current.x - start.pointerX;
      const dy = current.y - start.pointerY;
      let left = start.x, top = start.y, right = start.x + start.width, bottom = start.y + start.height;
      if (handle === 'move') {
        left = Math.max(0, Math.min(display.width - start.width, start.x + dx));
        top = Math.max(0, Math.min(display.height - start.height, start.y + dy));
        right = left + start.width;
        bottom = top + start.height;
      } else {
        if (handle.includes('w')) left = Math.max(0, Math.min(right - minimum, start.x + dx));
        if (handle.includes('e')) right = Math.min(display.width, Math.max(left + minimum, start.x + start.width + dx));
        if (handle.includes('n')) top = Math.max(0, Math.min(bottom - minimum, start.y + dy));
        if (handle.includes('s')) bottom = Math.min(display.height, Math.max(top + minimum, start.y + start.height + dy));
      }
      display.selection = { x: left, y: top, width: right - left, height: bottom - top };
      syncCropBox(display);
    };
    const finish = () => activeCrop?.dragController?.abort();
    window.addEventListener('pointermove', move, { signal });
    window.addEventListener('pointerup', finish, { once: true, signal });
    window.addEventListener('pointercancel', finish, { once: true, signal });
  };
}

function applyCrop() {
  if (!activeCrop) return;
  const { object, original, display } = activeCrop;
  const x = display.selection.x / display.scaleX;
  const y = display.selection.y / display.scaleY;
  const width = Math.min(original.width - x, display.selection.width / display.scaleX);
  const height = Math.min(original.height - y, display.selection.height / display.scaleY);
  if (width < 1 || height < 1) { status('Choose a larger crop area.'); return; }
  const dx = x + width/2 - original.width/2;
  const dy = y + height/2 - original.height/2;
  const radians = original.angle * Math.PI / 180;
  const worldDx = Math.cos(radians)*dx*original.scaleX - Math.sin(radians)*dy*original.scaleY;
  const worldDy = Math.sin(radians)*dx*original.scaleX + Math.cos(radians)*dy*original.scaleY;
  object.set({ cropX: original.cropX + x, cropY: original.cropY + y, width, height, left: original.left + worldDx, top: original.top + worldDy });
  if (object.filters?.length) object.applyFilters();
  object.setCoords(); canvas.requestRenderAll(); canvas.fire('object:modified', { target: object });
  activeCrop.dragController?.abort(); activeCrop = null; document.querySelector('#cropModal').hidden = true; status('Crop applied. Undo restores the original image.');
}
function cancelCrop() { if (!activeCrop) return; activeCrop.dragController?.abort(); activeCrop = null; document.querySelector('#cropModal').hidden = true; status('Crop cancelled.'); }

async function downloadImage() {
  const button = document.querySelector('#downloadBtn'); button.disabled = true; button.textContent = 'Preparing image…';
  try {
    const format = document.querySelector('#exportFormat').value;
    const multiplier = Number(document.querySelector('#exportQuality').value);
    const dataUrl = canvas.toDataURL({ format, quality: format === 'jpeg' ? .92 : 1, multiplier, enableRetinaScaling: false });
    const blob = await (await fetch(dataUrl)).blob();
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `clickbait-${activeWorld}-${new Date().toISOString().slice(0,10)}.${format === 'jpeg' ? 'jpg' : 'png'}`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    document.querySelector('#exportModal').hidden = true; status('Your image has been downloaded to your device.');
  } catch (error) { status(`Could not export the canvas: ${error.message}`); }
  finally { button.disabled = false; button.textContent = '⇩ Download Image'; }
}

init().catch(error => { console.error(error); status(`Editor could not start: ${error.message}`); });
