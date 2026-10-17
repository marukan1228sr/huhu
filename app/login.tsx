'use client';
import {useState,useEffect} from 'react';
import {House} from 'lucide-react';
export default function Login({children}:{children:React.ReactNode}){
 const [status,setStatus]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[mode,setMode]=useState('login'),[form,setForm]=useState({email:'',password:'',name:'',setupKey:''}),[invite,setInvite]=useState('');
 async function refresh(){try{const q=new URLSearchParams(location.search).get('invite')||'';setInvite(q);const r=await fetch('/api/auth?invite='+encodeURIComponent(q));if(!r.ok)throw Error('接続できませんでした');const d:any=await r.json();setStatus(d);setMode(!d.hasUsers?'setup':d.inviteValid?'register':'login');setError('')}catch{setError('初期設定中、または接続できません。Cloudflareのデプロイ完了後に再読み込みしてください。')}}
 useEffect(()=>{refresh()},[]);
 if(status?.user)return <>{children}</>;
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode,invite,...form})});const d:any=await r.json();if(!r.ok)throw Error(d.error||'登録できませんでした');location.reload()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="login-page"><section className="modal login-card"><a className="brand" href="/"><House size={30}/><span>HOMEWARD<small>ふたりの帰る場所</small></span></a><p className="eyebrow gold">CLOSE TO YOU, EVERY DAY.</p><h1>{mode==='setup'?'ふたりの場所をつくろう。':mode==='register'?'招待が届いています。':mode==='reset'?'パスワードを再設定':'おかえりなさい。'}</h1><p className="modal-description">{mode==='setup'?'まずあなたのアカウントを登録。奥さんは、登録後に招待できます。':mode==='register'?'表示名とログイン情報を登録して、同じスペースに参加します。':mode==='reset'?'Cloudflareで設定した初期設定キーが必要です。':'あなたのメールアドレスでログイン。帰宅連絡も、予定も、ここに。'}</p>
 {!status?<><p className="modal-description">{error||'接続しています…'}</p><button className="secondary" onClick={refresh}>再読み込み</button></>:<form onSubmit={submit}>
 {mode==='setup'&&!status.setupConfigured&&<div className="info-box">Cloudflareの設定で、秘密の環境変数「SETUP_KEY」を24文字以上で設定してから再読み込みしてください。</div>}
 {(mode==='setup'||mode==='register')&&<label>表示名<input autoComplete="nickname" required maxLength={30} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="呼び名"/></label>}
 <label>メールアドレス<input type="email" autoComplete="username" required maxLength={254} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
 <label>{mode==='reset'?'新しいパスワード':'パスワード'}<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:12} maxLength={128} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={mode==='login'?'':'12文字以上'}/></label>
 {(mode==='setup'||mode==='reset')&&<label>初期設定キー<input type="password" required autoComplete="off" value={form.setupKey} onChange={e=>setForm({...form,setupKey:e.target.value})}/></label>}
 {error&&<p className="login-error" role="alert">{error}</p>}
 <button className="primary" disabled={busy||(mode==='setup'&&!status.setupConfigured)}>{busy?'処理しています…':mode==='setup'?'登録して始める':mode==='register'?'登録して参加する':mode==='reset'?'パスワードを変更':'ログイン'}</button>
 {status.hasUsers&&<button type="button" className="delete login-switch" onClick={()=>{setMode(mode==='reset'?'login':'reset');setError('')}}>{mode==='reset'?'ログインに戻る':'パスワードを忘れた場合'}</button>}
 {mode==='register'&&<button type="button" className="secondary" onClick={()=>setMode('login')}>登録済みの方はログイン</button>}
 </form>}<p className="login-foot">夫婦だけの、小さなつながり。</p></section></div>
}
