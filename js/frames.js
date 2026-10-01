import { loadImage } from './assets.js';

export async function addFrame(canvas, frame, layouts, status) {
  const key = frame.src;
  const layout = layouts?.frames?.[key];
  try {
    const element = await loadImage(frame.src);
    const image = new fabric.Image(element, { left: 0, top: 0, originX: 'left', originY: 'top', selectable: true, objectCaching: true });
    image.scaleToWidth(canvas.getWidth());
    if (image.getScaledHeight() > canvas.getHeight()) image.scaleToHeight(canvas.getHeight());
    image.set({ left: (canvas.getWidth() - image.getScaledWidth()) / 2, top: (canvas.getHeight() - image.getScaledHeight()) / 2, catalogType: 'frame', catalogName: frame.name, catalogId: key, photoSlots: frame.photoSlots, isFrame: true });
    image.setCoords();
    canvas.add(image);
    if (!Array.isArray(layout?.slots) || layout.slots.length < frame.photoSlots) status(`“${frame.name}” has ${frame.photoSlots} photo slot${frame.photoSlots === 1 ? '' : 's'}, but needs complete layout data before photos can be placed in every slot.`);
    return image;
  } catch (error) { status(error.message); return null; }
}

export async function addPhotoToSlot(canvas, imageUrl, frameObject, slotGeometry) {
  if (!slotGeometry || !frameObject) return null;
  const element = await new Promise((resolve, reject) => { const image = new Image(); image.crossOrigin = 'anonymous'; image.onload = () => resolve(image); image.onerror = reject; image.src = imageUrl; });
  const imageElement = new fabric.Image(element);
  const { x: nx, y: ny, width: nw, height: nh } = slotGeometry;
  if (![nx, ny, nw, nh].every(Number.isFinite) || nx < 0 || ny < 0 || nw <= 0 || nh <= 0 || nx + nw > 1 || ny + nh > 1) throw new Error('Frame slot geometry must fit inside the normalized canvas.');
  const x = nx * canvas.getWidth();
  const y = ny * canvas.getHeight();
  const width = nw * canvas.getWidth();
  const height = nh * canvas.getHeight();
  const scale = Math.max(width / imageElement.width, height / imageElement.height);
  const rotation = Number(slotGeometry.rotation) || 0;
  const radius = Math.max(0, Number(slotGeometry.radius) || 0) * Math.min(canvas.getWidth(), canvas.getHeight());
  imageElement.set({ originX: 'center', originY: 'center', left: x + width / 2, top: y + height / 2, scaleX: scale, scaleY: scale, angle: rotation, clipPath: new fabric.Rect({ left: x + width / 2, top: y + height / 2, width, height, rx: radius, ry: radius, angle: rotation, originX: 'center', originY: 'center', absolutePositioned: true }), catalogType: 'frame-photo', catalogName: 'Frame photo' });
  canvas.add(imageElement);
  canvas.sendToBack(imageElement);
  canvas.bringForward(frameObject);
  canvas.setActiveObject(imageElement);
  canvas.requestRenderAll();
  return imageElement;
}

export function framePreviewUrl(frame) { return assetUrl(frame.src); }
