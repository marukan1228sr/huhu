import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
export async function POST(req:Request){
 const u=await getChatGPTUser();if(!u)return new Response('Unauthorized',{status:401});
 if(req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
 const m=await env.DB!.prepare('SELECT * FROM members WHERE id=?').bind(u.userId).first<any>();if(!m)return new Response('Forbidden',{status:403});
 if(Number(req.headers.get('content-length'))>9*1024*1024)return new Response('写真は8MB以下にしてください',{status:413});
 const form=await req.formData();const file=form.get('file');if(!(file instanceof File)||file.size>8*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))return new Response('JPEG・PNG・WebPの写真を8MB以下で選んでください',{status:400});
 const id=crypto.randomUUID();await env.BUCKET!.put(id,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});
 await env.DB!.prepare('INSERT INTO entries VALUES (?,?,?,?,?,?)').bind(id,m.room,u.userId,'photo','{}',Date.now()).run();return Response.json({id});
}
export async function GET(req:Request){
 const u=await getChatGPTUser();if(!u)return new Response('Unauthorized',{status:401});const id=new URL(req.url).searchParams.get('id');
 const p=await env.DB!.prepare("SELECT entries.id FROM entries JOIN members ON members.room=entries.room WHERE members.id=? AND entries.id=? AND entries.kind='photo'").bind(u.userId,id).first();if(!p)return new Response('Not found',{status:404});
 const file=await env.BUCKET!.get(id!);if(!file)return new Response('Not found',{status:404});return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
}
