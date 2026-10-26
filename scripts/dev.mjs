import {spawn} from 'node:child_process';
const children=['server:dev','dev:client'].map(script=>spawn('npm',['run',script],{stdio:'inherit'}));
let stopping=false;const stop=()=>{if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');};
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
for(const child of children)child.on('exit',()=>stop());
