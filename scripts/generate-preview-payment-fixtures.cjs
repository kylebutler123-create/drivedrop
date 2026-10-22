#!/usr/bin/env node
'use strict';

// Offline upload fixtures only: no database, provider, browser, or network calls.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

async function main() {
  if (process.argv.length !== 4 || process.argv[2] !== '--output') {
    throw new Error('Usage: node scripts/generate-preview-payment-fixtures.cjs --output <directory>');
  }
  const root = path.resolve(__dirname, '..');
  const destination = path.resolve(process.argv[3]);
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'docs/fixtures/preview-payment-qa22/fixtures.json'), 'utf8'));
  if (manifest.environment !== 'preview' || manifest.status !== 'PREPARED_NOT_EXECUTED') throw new Error('Expected the prepared preview fixture manifest');
  await fs.mkdir(destination, {recursive: true});
  const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const assets = [];
  for (const asset of manifest.assets) {
    if (!/^[a-z-]+\.png$/.test(asset.filename)) throw new Error('Invalid fixture filename');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
      <rect width="1200" height="600" fill="#ffffff"/>
      <rect x="10" y="10" width="1180" height="580" rx="12" fill="none" stroke="#a12715" stroke-width="8"/>
      <g font-family="DejaVu Sans, sans-serif" fill="#172033">
        <text x="55" y="100" font-size="48" font-weight="bold" fill="#a12715">TEST ONLY - SYNTHETIC PREVIEW</text>
        <text x="55" y="190" font-size="38" font-weight="bold">${escape(asset.title)}</text>
        <text x="55" y="285" font-size="24">${escape(asset.detail)}</text>
        <text x="55" y="370" font-size="25">DriveDrop QA22 E2E - upload and ownership testing</text>
        <text x="55" y="445" font-size="24">Not proof of identity, insurance, collection or delivery.</text>
        <text x="55" y="525" font-size="24" font-weight="bold">DO NOT USE FOR REAL ACCOUNTS OR FINANCIAL EVIDENCE</text>
      </g>
    </svg>`;
    const bytes = await sharp(Buffer.from(svg)).png({compressionLevel: 9}).toBuffer();
    if (bytes.length > 900000) throw new Error('Fixture exceeds the smallest applicable upload limit');
    await fs.writeFile(path.join(destination, asset.filename), bytes, {flag: 'wx'});
    assets.push({filename: asset.filename, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  await fs.writeFile(path.join(destination, 'generated-manifest.json'), JSON.stringify({run: manifest.run, environment: manifest.environment, assets}, null, 2) + '\n', {flag: 'wx'});
  process.stdout.write(JSON.stringify({generated: assets.length, environment: manifest.environment, assets}, null, 2) + '\n');
}
main().catch(error => {process.stderr.write(error.message + '\n'); process.exitCode = 1;});
