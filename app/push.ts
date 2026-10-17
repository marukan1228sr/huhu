import {env} from 'cloudflare:workers';
import webpush from 'web-push';
export function validEndpoint(endpoint:string){
 try {const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(u.hostname.endsWith('.push.apple.com')||['fcm.googleapis.com','updates.push.services.mozilla.com'].includes(u.hostname)||u.hostname.endsWith('.notify.windows.com'))}catch{return false}
}
export async function notify(userIds:string[],payload:{title:string;body:string;url:string;tag?:string}){
 let registered=0,accepted=0,failed=0;
 for(const user of userIds){
  const subs=await env.DB!.prepare('SELECT endpoint,data FROM subscriptions WHERE user=?').bind(user).all<any>();registered+=subs.results.length;
  await Promise.all(subs.results.map(async sub=>{try{
   if(!validEndpoint(sub.endpoint))throw Error('Invalid endpoint');
   const request=webpush.generateRequestDetails(JSON.parse(sub.data),JSON.stringify(payload),{TTL:3600,urgency:'high',vapidDetails:{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY}});
   const response=await fetch(request.endpoint,{method:'POST',headers:request.headers as HeadersInit,body:new Uint8Array(request.body!),redirect:'error',signal:AbortSignal.timeout(12000)});
   if(response.status===404||response.status===410)await env.DB!.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(sub.endpoint).run();
   if(response.ok)accepted++;else failed++;
  }catch{failed++}}));
 }
 return {registered,accepted,failed};
}
