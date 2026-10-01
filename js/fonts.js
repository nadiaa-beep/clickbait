import { assetUrl } from './assets.js';

export const FONT_LIST = [
  { name: 'Quicksand', path: 'assets/fonts/pastel/Quicksand/Quicksand-VariableFont_wght.ttf', world: 'Pastel' },
  { name: 'Nunito', path: 'assets/fonts/pastel/Nunito/Nunito-VariableFont_wght.ttf', world: 'Pastel' },
  { name: 'Playfair Display', path: 'assets/fonts/pastel/Playfair_Display/PlayfairDisplay-VariableFont_wght.ttf', world: 'Pastel' },
  { name: 'Bodoni Moda', path: 'assets/fonts/pastel/Bodoni_Moda/BodoniModa-VariableFont_opsz,wght.ttf', world: 'Pastel' },
  { name: 'Playwrite CA Guides', path: 'assets/fonts/pastel/Playwrite_CA_Guides/PlaywriteCAGuides-Regular.ttf', world: 'Pastel' },
  { name: 'Baloo 2', path: 'assets/fonts/y2k/Baloo_2/Baloo2-VariableFont_wght.ttf', world: 'Y2K' },
  { name: 'Cherry Bomb One', path: 'assets/fonts/y2k/Cherry_Bomb_One/CherryBombOne-Regular.ttf', world: 'Y2K' },
  { name: 'Cherry Cream Soda', path: 'assets/fonts/y2k/Cherry_Cream_Soda/CherryCreamSoda-Regular.ttf', world: 'Y2K' },
  { name: 'Fredoka', path: 'assets/fonts/y2k/Fredoka/Fredoka-VariableFont_wdth,wght.ttf', world: 'Y2K' },
  { name: 'Lilita One', path: 'assets/fonts/y2k/Lilita_One/LilitaOne-Regular.ttf', world: 'Y2K' },
  { name: 'Bangers', path: 'assets/fonts/desi/Bangers/Bangers-Regular.ttf', world: 'Desi' },
  { name: 'Berkshire Swash', path: 'assets/fonts/desi/Berkshire_Swash/BerkshireSwash-Regular.ttf', world: 'Desi' },
  { name: 'Laila', path: 'assets/fonts/desi/Laila/Laila-Regular.ttf', world: 'Desi' },
  { name: 'Rozha One', path: 'assets/fonts/desi/Rozha_One/RozhaOne-Regular.ttf', world: 'Desi' },
  { name: 'Tiro Bangla', path: 'assets/fonts/desi/Tiro_Bangla/TiroBangla-Regular.ttf', world: 'Desi' },
  { name: 'Cinzel', path: 'assets/fonts/grunge/Cinzel/Cinzel-VariableFont_wght.ttf', world: 'Grunge' },
  { name: 'Cormorant Garamond', path: 'assets/fonts/grunge/Cormorant_Garamond/CormorantGaramond-VariableFont_wght.ttf', world: 'Grunge' },
  { name: 'IM Fell English', path: 'assets/fonts/grunge/IM_Fell_English/IMFellEnglish-Regular.ttf', world: 'Grunge' },
  { name: 'Special Elite', path: 'assets/fonts/grunge/Special_Elite/SpecialElite-Regular.ttf', world: 'Grunge' },
  { name: 'UnifrakturCook', path: 'assets/fonts/grunge/UnifrakturCook/UnifrakturCook-Bold.ttf', world: 'Grunge' },
  { name: 'Chewy', path: 'assets/fonts/shoujo/Chewy/Chewy-Regular.ttf', world: 'Shoujo' },
  { name: 'Dancing Script', path: 'assets/fonts/shoujo/Dancing_Script/DancingScript-VariableFont_wght.ttf', world: 'Shoujo' },
  { name: 'Lobster Two', path: 'assets/fonts/shoujo/Lobster_Two/LobsterTwo-Regular.ttf', world: 'Shoujo' },
  { name: 'Mochiy Pop One', path: 'assets/fonts/shoujo/Mochiy_Pop_One/MochiyPopOne-Regular.ttf', world: 'Shoujo' },
  { name: 'Sniglet', path: 'assets/fonts/shoujo/Sniglet/Sniglet-Regular.ttf', world: 'Shoujo' },
  { name: 'Indie Flower', path: 'assets/fonts/floral/Indie_Flower/IndieFlower-Regular.ttf', world: 'Floral' },
  { name: 'Italianno', path: 'assets/fonts/floral/Italianno/Italianno-Regular.ttf', world: 'Floral' },
  { name: 'Libre Baskerville', path: 'assets/fonts/floral/Libre_Baskerville/LibreBaskerville-VariableFont_wght.ttf', world: 'Floral' },
  { name: 'Playball', path: 'assets/fonts/floral/Playball/Playball-Regular.ttf', world: 'Floral' },
  { name: 'Playwrite IT Trad', path: 'assets/fonts/floral/Playwrite_IT_Trad/PlaywriteITTrad-VariableFont_wght.ttf', world: 'Floral' }
];

const loaded = new Set();
export async function ensureFont(font) {
  if (loaded.has(font.name)) return true;
  try {
    const face = new FontFace(font.name, `url("${assetUrl(font.path)}")`);
    await face.load();
    document.fonts.add(face);
    loaded.add(font.name);
    return true;
  } catch (error) {
    console.warn(`Font ${font.name} could not be loaded.`, error);
    return false;
  }
}
