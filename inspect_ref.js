import { Jimp } from 'jimp';

import path from 'path';

async function inspectAndCrop() {
  const inputPath = path.resolve(process.cwd(), 'public/latest_ref.jpg');
  const image = await Jimp.read(inputPath);
  
  console.log('Image dimensions:', image.bitmap.width, 'x', image.bitmap.height);

  // Crop top hero artwork (from top down to just above the slot reels white box)
  // Let's create top_hero_seamless.jpg
  const heroHeight = Math.floor(image.bitmap.height * 0.495); // ~49.5% of total height
  
  const heroImage = image.clone().crop({ x: 0, y: 0, w: image.bitmap.width, h: heroHeight });
  const heroOutputPath = path.resolve(process.cwd(), 'public/top_hero_seamless.jpg');
  await heroImage.write(heroOutputPath);
  console.log('Saved top_hero_seamless.jpg (height:', heroHeight, ')');
}

inspectAndCrop().catch(console.error);
