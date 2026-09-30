import fs from 'fs';
import path from 'path';

const dir = './src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Find all className="..." that contain 'sticky' and 'top-0'
  const regex = /className=["']([^"']*)["']/g;
  content = content.replace(regex, (match, classes) => {
    if (classes.includes('sticky') && classes.includes('top-0') && !classes.includes('safe-top')) {
      changed = true;
      return `className="safe-top ${classes}"`;
    }
    return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
