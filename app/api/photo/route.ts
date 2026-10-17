import {env} from 'cloudflare:workers';
import {getFamilyUser} from '../../auth';
export async function POST(req:Request){
 const u=await getFamilyUser();if(!u)return new Response('Unauthorized',{status:401});
 if(req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
 const m=await env.DB.prepare('SELECT * FROM members WHERE id=?').bind(u.userId).first<any>();if(!m)return new Response('Forbidden',{status:403});
 if(Number(req.headers.get('content-length'))>1200000)return new Response('写真が大きすぎます。小さな写真を選んでください',{status:413});
 const form=await req.formData();const file=form.get('file');if(!(file instanceof File)||file.size>1000000||!['image/jpeg','image/png','image/webp'].includes(file.type))return new Response('写真はJPEG・PNG・WebPで1MB以下にしてください',{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const id=crypto.randomUUID();await env.DB.batch([env.DB.prepare('INSERT INTO photos VALUES (?,?,?,?)').bind(id,m.room,file.type,btoa(binary)),env.DB.prepare('INSERT INTO entries VALUES (?,?,?,?,?,?)').bind(id,m.room,u.userId,'photo','{}',Date.now())]);return Response.json({id});
}
export async function GET(req:Request){
 const u=await getFamilyUser();if(!u)return new Response('Unauthorized',{status:401});const id=new URL(req.url).searchParams.get('id');
 const photo=await env.DB.prepare('SELECT photos.body,photos.content_type FROM photos JOIN members ON members.room=photos.room WHERE members.id=? AND photos.id=?').bind(u.userId,id).first<{body:string;content_type:string}>();if(!photo)return new Response('Not found',{status:404});
 const bytes=Uint8Array.from(atob(photo.body),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':photo.content_type,'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
}
