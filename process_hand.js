import { Jimp } from 'jimp';

async function makeTransparent() {
  const inputPath = 'C:/Users/om shanti/.gemini/antigravity-ide/brain/6657a03f-884a-4eb3-8fed-4f7a86bd9044/pointing_hand_3d_1790162463147.png';
  const outputPath = 'c:/Users/om shanti/Documents/ZalandoPro_App/public/pointing_hand.png';

  const image = await Jimp.read(inputPath);
  const width = image.bitmap.width;
  const height = image.bitmap.height;

  image.scan(0, 0, width, height, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    // Calculate brightness / distance from pure black
    const brightness = (r + g + b) / 3;
    
    // If pixel is black/near black background (brightness < 20)
    if (brightness < 25) {
      this.bitmap.data[idx + 3] = 0; // Transparent
    } else if (brightness < 45) {
      // Feather / anti-alias edge pixels
      const alpha = Math.floor(((brightness - 25) / 20) * 255);
      this.bitmap.data[idx + 3] = Math.min(this.bitmap.data[idx + 3], alpha);
    }
  });

  await image.write(outputPath);
  console.log('Successfully saved transparent pointing hand to', outputPath);
}

makeTransparent().catch(console.error);
