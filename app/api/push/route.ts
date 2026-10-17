import {env} from 'cloudflare:workers';
import {getFamilyUser} from '../../auth';
import {notify,validEndpoint,vapidKeys} from '../../push';
export const dynamic='force-dynamic';
export async function GET(){const u=await getFamilyUser();if(!u)return new Response('Unauthorized',{status:401});return Response.json({publicKey:(await vapidKeys()).publicKey,configured:true},{headers:{'Cache-Control':'no-store'}})}
export async function POST(req:Request){
 const u=await getFamilyUser();if(!u)return new Response('Unauthorized',{status:401});if(req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
 const b=await req.json() as any;
 if(b.action==='test'){const result=await notify([u.userId],{title:'HOMEWARD · 通知テスト',body:'この通知が届けば、準備OK。帰宅連絡を受け取れます。',url:'/',tag:'test'},new URL(req.url).origin);return Response.json(result)}
 const sub=b.subscription;if(!sub||typeof sub.endpoint!=='string'||!validEndpoint(sub.endpoint)||typeof sub.keys?.p256dh!=='string'||typeof sub.keys?.auth!=='string'||sub.endpoint.length>4096||sub.keys.p256dh.length>256||sub.keys.auth.length>128)return Response.json({error:'通知の登録情報が正しくありません'},{status:400});
 if(b.action==='unsubscribe'){await env.DB!.prepare('DELETE FROM subscriptions WHERE endpoint=? AND user=?').bind(sub.endpoint,u.userId).run();return Response.json({ok:true})}
 await env.DB!.prepare('INSERT INTO subscriptions (endpoint,user,data) VALUES (?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user=excluded.user,data=excluded.data').bind(sub.endpoint,u.userId,JSON.stringify(sub)).run();
 return Response.json({ok:true});
}
