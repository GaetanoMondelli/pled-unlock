/*
  Simple helper to extract text from a PDF file using pdf-parse.
  Usage:
    node scripts/extract-patent.js "patent_english (2).pdf"

  Output:
    Writes patent_english_2.txt to repository root with the extracted text.
*/

const fs = require('fs');
const path = require('path');

async function main() {
  const inputPath = process.argv[2] || 'patent_english (2).pdf';
  const resolved = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(resolved)) {
    console.error(`Input file not found: ${resolved}`);
    process.exit(1);
  }

  let pdfParse;
  try {
    pdfParse = require('pdf-parse');
  } catch (e) {
    console.error('Missing dependency pdf-parse. Install with:\n  yarn add -D pdf-parse');
    process.exit(1);
  }

  try {
    const buffer = fs.readFileSync(resolved);
    const data = await pdfParse(buffer);
    const outPath = path.resolve(process.cwd(), 'patent_english_2.txt');
    fs.writeFileSync(outPath, data.text, 'utf8');
    console.log(`Extracted ${data.numpages || '?'} pages to ${outPath}`);
  } catch (err) {
    console.error('Failed to extract PDF text:', err);
    process.exit(1);
  }
}

main();
