export class HistoryManager {
  constructor(canvas, onChange, limit = 25) {
    this.canvas = canvas;
    this.onChange = onChange;
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
    this.timer = null;
    this.restoring = false;
    this.boundCapture = () => this.schedule();
    ['object:added', 'object:modified', 'object:removed', 'path:created'].forEach(name => canvas.on(name, this.boundCapture));
  }
  schedule() {
    if (this.restoring) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.capture(), 250);
  }
  capture() {
    try {
      const json = JSON.stringify(this.canvas.toJSON(['catalogType', 'catalogName', 'catalogId', 'photoSlots', 'isFrame']));
      if (json.length > 8_000_000) { this.onChange('This edit is too large for session undo history.'); return; }
      if (this.undoStack.at(-1) === json) return;
      this.undoStack.push(json);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.redoStack.length = 0;
      this.updateButtons();
    } catch (error) { console.warn('Could not save an undo snapshot.', error); }
  }
  async restore(json) {
    this.restoring = true;
    try {
      await new Promise((resolve, reject) => this.canvas.loadFromJSON(json, resolve, (_object, error) => error && reject(error)));
      this.canvas.requestRenderAll();
    } finally { this.restoring = false; this.updateButtons(); }
  }
  async undo() {
    clearTimeout(this.timer);
    if (this.undoStack.length < 2) return;
    this.redoStack.push(this.undoStack.pop());
    await this.restore(this.undoStack.at(-1));
  }
  async redo() {
    const json = this.redoStack.pop();
    if (!json) return;
    this.undoStack.push(json);
    await this.restore(json);
  }
  updateButtons() {
    const undo = document.querySelector('#undoBtn');
    const redo = document.querySelector('#redoBtn');
    if (undo) undo.disabled = this.undoStack.length < 2;
    if (redo) redo.disabled = this.redoStack.length === 0;
  }
}
