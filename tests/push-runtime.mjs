import {createECDH,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const base='http://localhost:5174';
const login=await fetch(base+'/api/auth',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action:'login',email:'one@example.com',password:'local-test-password-482657'})});assert.equal(login.status,200);const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
const headers={Origin:base,'Content-Type':'application/json',Cookie:cookie};const ecdh=createECDH('prime256v1');ecdh.generateKeys();
// This unallocated provider URL cannot target a real subscription. A 404/410
// removes it and proves the Worker generated and transmitted a Web Push request.
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/homeward-unallocated-test-'+randomBytes(32).toString('hex'),keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
const reg=await fetch(base+'/api/push',{method:'POST',headers,body:JSON.stringify({subscription})});assert.equal(reg.status,200);
const test=await fetch(base+'/api/push',{method:'POST',headers,body:JSON.stringify({action:'test'})});const result=await test.json();console.log('Worker push result',result);assert(result.registered>=1);assert.equal(result.failed,result.registered);
const family=await (await fetch(base+'/api/family',{headers})).json();const self=family.people.find(p=>p.id===family.user);console.log('Expired test subscriptions after provider response:',self.devices);assert.equal(self.devices,0,'Expected a real 404/410 from the provider; crypto or transport may have failed before sending.');
console.log('PASS: Web Push encryption + VAPID signing in the Cloudflare runtime, provider rejection handling and expired subscription removal. Actual iPhone delivery remains untested.');
