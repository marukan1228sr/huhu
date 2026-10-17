import vinext from 'vinext';
import {defineConfig} from 'vite';
import {cloudflare} from '@cloudflare/vite-plugin';
export default defineConfig(()=>{
 process.env.CLOUDFLARE_CF_FETCH_ENABLED??='false';
 process.env.WRANGLER_SEND_METRICS??='false';
 return {plugins:[vinext(),cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false})]};
});
