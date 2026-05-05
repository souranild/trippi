const ts = require('typescript');
const fs = require('fs');

const code = fs.readFileSync('src/app/trip/[id]/page.tsx', 'utf8');
const sourceFile = ts.createSourceFile('page.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function walk(node) {
  if (node.kind === ts.SyntaxKind.JsxElement || node.kind === ts.SyntaxKind.JsxSelfClosingElement) {
    // console.log("Found JSX:", node.kind);
  }
  ts.forEachChild(node, walk);
}

const diagnostics = sourceFile.parseDiagnostics;
if (diagnostics && diagnostics.length > 0) {
  diagnostics.forEach(diag => {
    const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start);
    console.log(`Error at line ${line + 1}, col ${character + 1}: ${message}`);
  });
} else {
  console.log("No syntax errors found by TypeScript parser!");
}
