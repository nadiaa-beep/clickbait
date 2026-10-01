export const FILTERS = {
  pastel: [
    ['Bright', [['Brightness', .16]]], ['Contrasty', [['Contrast', .14]]], ['Whimsy', [['Saturation', .2], ['Brightness', .06]]], ['2020 Aesthetic', [['Saturation', .12], ['Contrast', .05]]], ['Nostalgic', [['Sepia', 0]]], ['Golden Hour', [['BlendColor', '#f3a84d', .17]]], ['Dreamy', [['Blur', .25], ['Brightness', .1]]], ['Pastel', [['Saturation', -.2], ['Brightness', .1]]], ['Sunlit', [['Brightness', .13], ['BlendColor', '#ffd375', .1]]], ['Soft', [['Contrast', -.12], ['Saturation', -.08]]]
  ],
  y2k: [
    ['Bluish', [['BlendColor', '#519fd8', .2]]], ['Ashy', [['Saturation', -.45], ['Brightness', .04]]], ['Cosmos', [['BlendColor', '#593b86', .17], ['Contrast', .1]]], ['Stars', [['Contrast', .18], ['Brightness', .03]]], ['Blue', [['HueRotation', -.12]]], ['Grey', [['Saturation', -.8]]], ['Year 2000', [['Contrast', .17], ['Saturation', .14]]], ['Old Digicam', [['Noise', .08], ['Contrast', .16]]], ['Video Cam', [['Saturation', -.17], ['Contrast', .1]]], ['Retro', [['Sepia', 0]]]
  ],
  desi: [
    ['Gulabi Dusk', [['BlendColor', '#b56f77', .16]]], ['Old Town Glow', [['Sepia', 0], ['Brightness', .06]]], ['Bronze Evening', [['BlendColor', '#9a6433', .2]]], ['Lantern Light', [['Brightness', .12], ['BlendColor', '#ffc16b', .12]]], ['Sunehri Fade', [['Saturation', -.12], ['Brightness', .08]]], ['Amber Courtyard', [['BlendColor', '#c78643', .14]]], ['Faded Postcard', [['Contrast', -.13], ['Saturation', -.18]]], ['Monsoon Blue', [['BlendColor', '#597f91', .17]]], ['Rose Attar', [['BlendColor', '#bb7a86', .14]]], ['Old Film', [['Noise', .07], ['Contrast', .1]]]
  ],
  grunge: [
    ['Shadow Tape', [['Contrast', .22], ['Brightness', -.1]]], ['Darkroom', [['Brightness', -.18], ['Contrast', .18]]], ['Static Night', [['Noise', .15], ['Saturation', -.4]]], ['Noir Noise', [['Grayscale', 0], ['Contrast', .2], ['Noise', .1]]], ['Faded Rebel', [['Saturation', -.48], ['Contrast', -.1]]], ['Photocopy', [['Grayscale', 0], ['Contrast', .42]]], ['Cold Concrete', [['BlendColor', '#607080', .18]]], ['Muddy Film', [['Sepia', 0], ['Contrast', .08]]], ['Punk Flash', [['Contrast', .28], ['Saturation', .14]]], ['Washed Out', [['Brightness', .16], ['Saturation', -.35]]]
  ],
  shoujo: [
    ['Sakura Haze', [['BlendColor', '#e99fb2', .16]]], ['Rose Soft', [['Saturation', .08], ['Brightness', .08]]], ['Manga Glow', [['Contrast', .18], ['Brightness', .06]]], ['Blush Memory', [['BlendColor', '#d88b9c', .13]]], ['Dream Letter', [['Contrast', -.12], ['Brightness', .1]]], ['Petal Film', [['HueRotation', .03], ['Saturation', .12]]], ['Warm Ribbon', [['BlendColor', '#efc19e', .12]]], ['Moonlit Pink', [['Brightness', .08], ['BlendColor', '#8b8dc2', .1]]], ['Soft Focus', [['Blur', .25], ['Brightness', .05]]], ['Vintage Diary', [['Sepia', 0], ['Contrast', -.08]]]
  ],
  floral: [
    ['Petal Light', [['Brightness', .1], ['Saturation', .1]]], ['Garden Glow', [['BlendColor', '#cfb977', .12]]], ['Daisy Haze', [['Brightness', .12], ['Contrast', -.08]]], ['Bloom Soft', [['Saturation', -.08], ['Brightness', .08]]], ['Rose Morning', [['BlendColor', '#df9b99', .14]]], ['Sage Garden', [['BlendColor', '#718b6a', .14]]], ['Wildflower', [['Saturation', .17], ['Contrast', .05]]], ['Golden Pollen', [['BlendColor', '#e7b654', .14]]], ['Rainwashed', [['BlendColor', '#91adc1', .1], ['Contrast', -.05]]], ['Pressed Flowers', [['Sepia', 0], ['Saturation', -.18]]]
  ]
};

export function createImageFilters(definitions) {
  const filters = [];
  for (const [kind, value, alpha] of definitions) {
    const F = window.fabric?.Image?.filters;
    if (!F) continue;
    try {
      if (kind === 'BlendColor') filters.push(new F.BlendColor({ color: value, mode: 'tint', alpha }));
      else if (kind === 'HueRotation') filters.push(new F.HueRotation({ rotation: value }));
      else if (kind === 'Brightness') filters.push(new F.Brightness({ brightness: value }));
      else if (kind === 'Contrast') filters.push(new F.Contrast({ contrast: value }));
      else if (kind === 'Saturation') filters.push(new F.Saturation({ saturation: value }));
      else if (kind === 'Blur') filters.push(new F.Blur({ blur: value }));
      else if (kind === 'Noise') filters.push(new F.Noise({ noise: value * 100 }));
      else if (kind === 'Pixelate') filters.push(new F.Pixelate({ blocksize: value || 6 }));
      else if (kind === 'Grayscale') filters.push(new F.Grayscale());
      else if (kind === 'Sepia') filters.push(new F.Sepia());
    } catch (error) { console.warn(`Filter ${kind} is unavailable in this Fabric build.`, error); }
  }
  return filters;
}
