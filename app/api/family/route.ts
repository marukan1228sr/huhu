import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {notify} from '../../push';
export const dynamic='force-dynamic';
const reply=(x:unknown,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){
 const u=await getChatGPTUser();if(!u)return reply({error:'ログインが必要です'},401);
 const db=env.DB!;const m=await db.prepare('SELECT * FROM members WHERE id=?').bind(u.userId).first<any>();
 if(!m)return reply({user:u.userId,room:null});
 const room=await db.prepare('SELECT * FROM rooms WHERE id=?').bind(m.room).first();
 const people=await db.prepare('SELECT members.id,members.name,(SELECT COUNT(*) FROM subscriptions WHERE subscriptions.user=members.id) AS devices FROM members WHERE room=?').bind(m.room).all();
 const rows=await db.prepare('SELECT * FROM entries WHERE room=? ORDER BY created ASC').bind(m.room).all<any>();
 return reply({user:u.userId,room,people:people.results,entries:rows.results.map(e=>({...e,...JSON.parse(e.data)}))});
}
export async function POST(req:Request){
 const u=await getChatGPTUser();if(!u)return reply({error:'ログインが必要です'},401);
 if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'アクセスできません'},403);
 const db=env.DB!;let b:any;try{b=await req.json()}catch{return reply({error:'入力を確認してください'},400)}
 const m=await db.prepare('SELECT * FROM members WHERE id=?').bind(u.userId).first<any>();
 if(b.action==='create'||b.action==='join'){
  if(m)return reply({error:'すでに部屋に参加しています'},400);
  const name=String(b.name||'').trim().slice(0,30);if(!name)return reply({error:'表示名を入力してください'},400);
  if(b.action==='create'){
   const id=crypto.randomUUID(),invite=crypto.randomUUID();
   await db.batch([db.prepare('INSERT INTO rooms VALUES (?,?)').bind(id,invite),db.prepare('INSERT INTO members VALUES (?,?,?)').bind(u.userId,id,name)]);
  }else{
   const r=await db.prepare('SELECT * FROM rooms WHERE invite=?').bind(String(b.invite)).first<any>();if(!r)return reply({error:'招待コードが見つかりません'},404);
   const result=await db.prepare('INSERT INTO members (id,room,name) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM members WHERE room=?)<2').bind(u.userId,r.id,name,r.id).run();
   if(!result.meta.changes)return reply({error:'この部屋は二人が参加済みです'},409);
  }return reply({ok:true});
 }
 if(!m)return reply({error:'先に部屋を作成してください'},403);
 if(b.action==='delete'){
  await db.prepare("DELETE FROM entries WHERE id=? AND room=? AND kind='event'").bind(String(b.id),m.room).run();return reply({ok:true});
 }
 const kind=b.kind;if(!['event','chat','return'].includes(kind))return reply({error:'内容を確認してください'},400);
 const text=String(b.text||'').trim().slice(0,2000);
 if(kind==='event'&&(!text||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)))return reply({error:'予定名と日付を入力してください'},400);
 if(kind==='chat'&&!text&&!b.image)return reply({error:'メッセージを入力してください'},400);
 if(b.image){const photo=await db.prepare("SELECT id FROM entries WHERE id=? AND room=? AND kind='photo'").bind(String(b.image),m.room).first();if(!photo)return reply({error:'写真を再選択してください'},400)}
 const data=JSON.stringify({text,date:String(b.date||''),time:String(b.time||'').slice(0,5),note:String(b.note||'').slice(0,2000),image:b.image||null});
 if(b.id&&kind==='event')await db.prepare("UPDATE entries SET data=? WHERE id=? AND room=? AND kind='event'").bind(data,String(b.id),m.room).run();
 else await db.prepare('INSERT INTO entries VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),m.room,u.userId,kind,data,Date.now()).run();
 let notification={registered:0,accepted:0,failed:0};
 if(kind==='return'||kind==='chat'){
  const others=await db.prepare('SELECT id FROM members WHERE room=? AND id<>?').bind(m.room,u.userId).all<any>();
  notification=await notify(others.results.map(p=>p.id),{title:kind==='return'?`${m.name} · 今から帰るよ！`:`${m.name}からのメッセージ`,body:(text||(b.image?'📷 写真が届きました':'今から帰るよ！')).slice(0,300),url:kind==='chat'?'/?view=chat':'/',tag:kind==='return'?`return-${u.userId}`:crypto.randomUUID()});
 }
 return reply({ok:true,notification});
}
