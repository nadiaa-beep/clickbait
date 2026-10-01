const worlds = [
  { id: 'pastel', name: 'Pastel Kawaii', icon: '🌸', blurb: 'Soft pinks, dreamy paper and little things that sparkle.' },
  { id: 'y2k', name: 'Y2K Kawaii', icon: '💿', blurb: 'Denim days, digital cameras and early-2000s color.' },
  { id: 'desi', name: 'Desi World', icon: '🪔', blurb: 'Warm old-town light, mellow color and a nostalgic glow.' },
  { id: 'grunge', name: 'Grunge Kawaii', icon: '🖤', blurb: 'Moody layers, photocopies and a little beautiful chaos.' },
  { id: 'shoujo', name: 'Shoujo Kawaii', icon: '🌹', blurb: 'Romantic details, manga moods and delicate sparkle.' },
  { id: 'floral', name: 'Floral Dream', icon: '🌼', blurb: 'Botanical colors, soft petals and garden-daydream energy.' }
];

const grid = document.querySelector('#worldGrid, .world-grid');
if (grid) {
  if (!grid.children.length) grid.innerHTML = worlds.map(world => `<a class="world-card" data-world="${world.id}" href="editor.html?world=${world.id}"><span class="world-icon">${world.icon}</span><span class="start-mark">↗</span><h3>${world.name}</h3><p>${world.blurb}</p><span class="world-mark" aria-hidden="true">${world.icon}</span></a>`).join('');
  worlds.forEach(world => {
    const card = grid.querySelector(`.world-${world.id}`) || grid.querySelector(`[data-world="${world.id}"]`);
    if (!card) return;
    card.dataset.world = world.id;
    card.setAttribute('role', 'link');
    card.tabIndex = 0;
    card.setAttribute('aria-label', `Open ${world.name} editor`);
    const navigate = () => { location.href = `editor.html?world=${world.id}`; };
    const enter = card.querySelector('.enter-world');
    if (enter) {
      const prompt = document.createElement('span');
      prompt.className = enter.className;
      prompt.innerHTML = enter.innerHTML;
      prompt.setAttribute('aria-hidden', 'true');
      enter.replaceWith(prompt);
    }
    card.addEventListener('click', navigate);
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(); } });
  });
}
const menuButton = document.querySelector('#menuBtn');
menuButton?.addEventListener('click', () => {
  const nav = document.querySelector('#navLinks');
  const open = nav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('#navLinks a').forEach(link => link.addEventListener('click', () => document.querySelector('#navLinks')?.classList.remove('is-open')));
