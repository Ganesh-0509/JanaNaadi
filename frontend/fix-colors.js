import fs from 'fs';
import path from 'path';

const dirs = [
  'c:\\Users\\nanda\\Desktop\\JanaNaadi\\frontend\\src\\pages',
  'c:\\Users\\nanda\\Desktop\\JanaNaadi\\frontend\\src\\components'
];

const darkBgs = [
  'bg-gradient-saffron',
  'bg-[#E76F2E]',
  'bg-[#DC2626]',
  'bg-[#EF4444]',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-slate-700',
  'bg-slate-800',
  'bg-slate-900',
  'bg-[#3E2C23]'
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Convert generic bg-slate-800 and such to light theme equivalent if they aren't part of buttons
    if (line.includes('bg-slate-800') || line.includes('bg-slate-900') || line.includes('bg-[#3E2C23]')) {
        if (!line.includes('button') && !line.includes('hover:')) {
            lines[i] = lines[i].replace(/bg-slate-(800|900)/g, 'bg-[#FAF5ED]');
            lines[i] = lines[i].replace(/bg-\[#3E2C23\]/g, 'bg-[#FAF5ED]');
        }
    }

    if (line.includes('text-white')) {
      let hasDarkBg = darkBgs.some(bg => line.includes(bg));
      if (!hasDarkBg && !line.includes('bg-gradient')) {
        lines[i] = lines[i].replace(/text-white/g, 'text-[#3E2C23]');
      }
    }
    
    if (line.includes('border-white/')) {
        lines[i] = lines[i].replace(/border-white\/(5|10|20)/g, 'border-[#3E2C23]/10');
    }
    if (line.includes('text-white/')) {
        lines[i] = lines[i].replace(/text-white\/(40|50|60)/g, 'text-[#6B5E57]');
    }
  }

  const newContent = lines.join('\n');
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        processFile(path.join(dir, file));
      }
    });
  }
});
console.log('Color fix complete.');
