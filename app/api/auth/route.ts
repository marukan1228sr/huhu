import {env} from 'cloudflare:workers';
import {COOKIE,getFamilyUser,hash,equal,randomToken,passwordHash,issueSession} from '../../auth';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
export async function GET(req:Request){
 const u=await getFamilyUser();const first=await env.DB.prepare('SELECT id FROM users LIMIT 1').first();
 const invite=new URL(req.url).searchParams.get('invite');
 const valid=invite?await env.DB.prepare('SELECT rooms.id FROM rooms WHERE invite=? AND (SELECT COUNT(*) FROM members WHERE members.room=rooms.id)<2').bind(invite).first():null;
 return json({user:u,hasUsers:!!first,setupConfigured:!!env.SETUP_KEY&&env.SETUP_KEY.length>=24,inviteValid:!!valid});
}
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'アクセスできません'},403);
 if(Number(req.headers.get('content-length'))>8192)return json({error:'入力が長すぎます'},413);
 let b:any;try{b=await req.json()}catch{return json({error:'入力を確認してください'},400)}
 if(b.action==='logout'){
  const token=req.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(token)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token)).run();
  return json({ok:true},200,`${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${new URL(req.url).protocol==='https:'?'; Secure':''}`);
 }
 const ip=req.headers.get('cf-connecting-ip')||'local';const window=Math.floor(Date.now()/(15*60*1000));
 const key=await hash(ip);const counter=await env.DB.prepare('INSERT INTO login_limits (key,window,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_limits.window=excluded.window THEN login_limits.attempts+1 ELSE 1 END,window=excluded.window RETURNING attempts').bind(key,window).first<{attempts:number}>();
 if(counter!.attempts>12)return json({error:'試行回数が多いため、15分ほど待ってから再試行してください'},429);
 const email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
 if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)||password.length>128)return json({error:'メールアドレスとパスワードを確認してください'},400);
 let userId:string;
 if(b.action==='login'){
  const row=await env.DB.prepare('SELECT id,salt,password_hash FROM users WHERE email=?').bind(email).first<any>();
  const digest=await passwordHash(password,row?.salt||'homeward-dummy-salt');
  if(!row||!await equal(digest,row.password_hash))return json({error:'メールアドレスまたはパスワードが違います'},401);
  userId=row.id;
 }else if(['setup','register','reset'].includes(b.action)){
  if(password.length<12)return json({error:'パスワードは12文字以上にしてください'},400);
  const name=String(b.name||'').trim().slice(0,30),salt=randomToken(),digest=await passwordHash(password,salt);
  if(b.action==='setup'||b.action==='reset'){
   if(!env.SETUP_KEY||env.SETUP_KEY.length<24||!await equal(String(b.setupKey||''),env.SETUP_KEY))return json({error:'初期設定キーが違うか、Cloudflareで未設定です'},403);
  }
  if(b.action==='reset'){
   const row=await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first<any>();
   if(!row)return json({error:'入力を確認してください'},400);
   await env.DB.batch([env.DB.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').bind(salt,digest,row.id),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(row.id)]);
   userId=row.id;
  }else{
   if(!name)return json({error:'表示名を入力してください'},400);
   const id=crypto.randomUUID();let queries:D1PreparedStatement[];
   if(b.action==='setup'){
    const room=crypto.randomUUID();
    queries=[env.DB.prepare('INSERT INTO users SELECT ?,1,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM users)').bind(id,email,name,salt,digest),env.DB.prepare('INSERT INTO rooms SELECT ?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=?)').bind(room,crypto.randomUUID(),id),env.DB.prepare('INSERT INTO members SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=?)').bind(id,room,name,id)];
   }else{
    const room=await env.DB.prepare('SELECT id FROM rooms WHERE invite=? AND (SELECT COUNT(*) FROM members WHERE members.room=rooms.id)<2').bind(String(b.invite||'')).first<any>();
    if(!room)return json({error:'招待リンクが無効、または参加済みです'},403);
    queries=[env.DB.prepare('INSERT INTO users SELECT ?,2,?,?,?,? WHERE (SELECT COUNT(*) FROM users)<2 AND (SELECT COUNT(*) FROM members WHERE room=?)<2').bind(id,email,name,salt,digest,room.id),env.DB.prepare('INSERT INTO members SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=?)').bind(id,room.id,name,id)];
   }
   try{const result=await env.DB.batch(queries);if(!result[0].meta.changes)return json({error:'登録済み、または二人が参加済みです'},409)}catch{return json({error:'このメールアドレスは登録済み、または二人が参加済みです'},409)}
   userId=id;
  }
 }else return json({error:'操作を確認してください'},400);
 await env.DB.prepare('DELETE FROM login_limits WHERE key=? OR window<?').bind(key,window-2).run();
 return json({ok:true},200,await issueSession(userId,req));
}
