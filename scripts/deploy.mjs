import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
// The first deploy provisions D1. Until migrations finish, API requests fail
// closed with 503 and cannot register users or expose data.
for(const args of [['deploy'],['d1','migrations','apply','DB','--remote']]){
 const r=spawnSync(process.execPath,[cli,...args],{stdio:'inherit',env:{...process.env,CI:'true'}});
 if(r.error)throw r.error;
 if(r.status!==0)process.exit(r.status||1);
}
