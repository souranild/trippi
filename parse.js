const fs = require('fs');
const babel = require('@babel/core');

const code = fs.readFileSync('src/app/trip/[id]/page.tsx', 'utf8');

try {
  babel.parseSync(code, {
    filename: 'page.tsx',
    presets: ['@babel/preset-typescript', '@babel/preset-react'],
  });
  console.log("Parsed successfully!");
} catch (e) {
  console.error("Syntax Error at line", e.loc?.line, "col", e.loc?.column);
  console.error(e.message);
}
