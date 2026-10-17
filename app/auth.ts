import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
export const COOKIE='homeward_session';
export const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export async function hash(value:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))}
export function randomToken(){return hex(crypto.getRandomValues(new Uint8Array(32)).buffer)}
export async function equal(a:string,b:string){const x=await hash(a),y=await hash(b);let d=0;for(let i=0;i<x.length;i++)d|=x.charCodeAt(i)^y.charCodeAt(i);return d===0}
export async function passwordHash(password:string,salt:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256));
}
export async function getFamilyUser(){
 const h=await headers();const token=h.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 if(!token||!(/^[a-f0-9]{64}$/.test(token)))return null;
 const u=await env.DB.prepare('SELECT users.id,users.email,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires>?').bind(await hash(token),Date.now()).first<{id:string;email:string;name:string}>();
 return u?{userId:u.id,email:u.email,displayName:u.name}:null;
}
export async function issueSession(userId:string,req:Request){
 const token=randomToken(),age=30*24*3600;
 await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),env.DB.prepare('INSERT INTO sessions VALUES (?,?,?)').bind(await hash(token),userId,Date.now()+age*1000)]);
 return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${new URL(req.url).protocol==='https:'?'; Secure':''}`;
}
