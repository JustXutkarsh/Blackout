import {execFileSync} from 'node:child_process';
import {writeFileSync,existsSync} from 'node:fs';
// Local Docker credentials only. Never use this script against a hosted project.
const s=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','inherit']}));
if(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(s.API_URL))throw Error('Local stack required');
const publicConfig=`VITE_SUPABASE_URL=${s.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${s.PUBLISHABLE_KEY||s.ANON_KEY}\n`;
const serverConfig=`SUPABASE_URL=${s.API_URL}\nSUPABASE_SECRET_KEY=${s.SECRET_KEY||s.SERVICE_ROLE_KEY}\nALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173\n`;
writeFileSync('.env.test',publicConfig+serverConfig,{mode:0o600});
if(!existsSync('.env'))writeFileSync('.env',publicConfig+serverConfig,{mode:0o600});else console.log('.env preserved; copy local values from .env.test if needed.');
console.log('Local account configuration saved in ignored files. Restart npm run dev.');
