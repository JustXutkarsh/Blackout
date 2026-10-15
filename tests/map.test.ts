import {test} from 'node:test';
import assert from 'node:assert/strict';
import {worldToMap,Pings} from '../src/tactical-map';
const b={minX:-30,maxX:30,minZ:-25,maxZ:25};
test('map center, north-up axes and resizing preserve aspect ratio',()=>{assert.deepEqual(worldToMap({x:0,z:0},b,720,600),{x:360,y:300,scale:11.52});const n=worldToMap({x:0,z:-25},b,720,600);assert.equal(n.y,12);const east=worldToMap({x:30,z:0},b,720,600);assert.ok(east.x>360);const small=worldToMap({x:30,z:0},b,360,300);assert.ok(small.x<360&&small.x>180);assert.equal(small.y,150);});
test('non-symmetric world bounds map correctly',()=>{const p=worldToMap({x:20,z:40},{minX:10,maxX:30,minZ:20,maxZ:60},100,200,0);assert.equal(p.x,50);assert.equal(p.y,100);});
test('gunfire pings are bounded snapshots and expire at 1.5 active seconds',()=>{const p=new Pings(),pos={x:10,z:4};p.add(pos,2,1,-1);pos.x=100;assert.equal(p.items[0].x,11);p.tick(3.49);assert.equal(p.items.length,1);p.tick(3.5);assert.equal(p.items.length,0);for(let i=0;i<40;i++)p.add(pos,4);assert.equal(p.items.length,24);p.clear();assert.equal(p.items.length,0);});
