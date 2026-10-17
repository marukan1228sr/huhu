import handler from 'vinext/server/fetch-handler';
export default {
 async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
  try {
   const response=await handler.fetch(request,env,ctx);
   const headers=new Headers(response.headers);
   headers.set('X-Content-Type-Options','nosniff');
   headers.set('Referrer-Policy','same-origin');
   headers.set('X-Frame-Options','DENY');
   if(new URL(request.url).pathname.startsWith('/api/'))headers.set('Cache-Control','no-store');
   return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }catch {
   return Response.json({error:'準備中、または接続できません。少し待って再読み込みしてください。'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
 }
};
