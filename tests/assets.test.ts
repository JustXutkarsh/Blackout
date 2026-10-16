import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('bundled PBR maps have verified source, redistribution license and matching checksums',()=>{
  const manifest=JSON.parse(readFileSync('public/assets/manifest.json','utf8'));
  assert.equal(manifest.assets.length,5);
  for(const asset of manifest.assets){assert.equal(asset.license,'CC0-1.0');assert.ok(asset.source.startsWith('https://polyhaven.com/a/'));assert.ok(Object.keys(asset.creator).length);for(const file of asset.files){assert.ok(existsSync('public/'+file.path));const data=readFileSync('public/'+file.path);assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256);assert.equal(data.readUInt16BE(0),0xffd8);}}
});
