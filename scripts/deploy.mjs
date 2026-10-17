import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const cli=fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url));
const childEnv={...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'};
function run(args,capture=false){
 const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8',stdio:capture?['ignore','pipe','pipe']:'inherit',env:childEnv});
 if(r.error)throw r.error;
 if(r.status!==0){if(capture)process.stderr.write(r.stderr||'Cloudflare command failed.\n');process.exit(r.status||1)}
 return r.stdout;
}
// Publish first so Cloudflare creates or inherits the Worker's DB binding.
run(['deploy']);
const source=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
const original=source.d1_databases.find(b=>b.binding==='DB');
let databaseId=original?.database_id;
let accountId=process.env.CLOUDFLARE_ACCOUNT_ID||source.account_id;
const token=process.env.CLOUDFLARE_API_TOKEN;
// Read the actual published binding: deploy may inherit an existing D1 without
// writing its database_id back to the source or generated Vite configuration.
if(!databaseId&&accountId&&token){
 const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(source.name)}/settings`,{headers:{Authorization:`Bearer ${token}`}});
 const data=await response.json();
 if(!response.ok||!data.success)throw Error('公開済みWorkerのDB接続先を取得できませんでした。ビルドトークンのWorkers読み取り権限を確認してください。');
 databaseId=data.result.bindings?.find(b=>b.type==='d1'&&b.name==='DB')?.id;
}
// OAuth-based local deployments can resolve the explicitly configured DB name.
if(!databaseId){
 const list=JSON.parse(run(['d1','list','--json'],true));
 const matches=list.filter(db=>db.name===original?.database_name);
 if(matches.length===1)databaseId=matches[0].uuid;
}
if(!databaseId)throw Error('DBの接続先IDを取得できませんでした。Cloudflareのhuhu→Bindings→DBを確認してください。');
mkdirSync('.wrangler',{recursive:true});
const configPath=path.resolve('.wrangler/homeward-migrations.json');
writeFileSync(configPath,JSON.stringify({name:source.name,compatibility_date:source.compatibility_date,...(accountId?{account_id:accountId}:{}),d1_databases:[{binding:'DB',database_name:original?.database_name||'huhu-family',database_id:databaseId,migrations_dir:path.resolve('drizzle')}]},null,2));
run(['d1','migrations','apply','DB','--remote','--config',configPath]);
console.log('HOMEWARD: deployment and database migrations completed.');
