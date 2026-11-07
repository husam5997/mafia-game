'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const port=39000+Math.floor(Math.random()*4000);
const url=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:String(port)},stdio:'ignore'});
async function waitForServer(){for(let x=0;x<80;x++){try{const r=await fetch(url+'/api/version');if(r.ok)return;}catch{} await new Promise(r=>setTimeout(r,60));}throw Error('Server did not start');}
async function act(o){const res=await fetch(url+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)});const payload=await res.json();if(!res.ok)throw Error(payload.error);return payload;}
(async()=>{
 await waitForServer();
 const version=await (await fetch(url+'/api/version')).json();assert.equal(version.version,'1.3.2');
 const html=await (await fetch(url+'/')).text();assert.match(html,/<title>Mafia Lobby/);assert.match(html,/og:image/);assert.equal((html.match(/<script src=/g)||[]).length,1);
 const formResp=await fetch(url+'/app.js');assert.match(formResp.headers.get('cache-control')||'',/no-store/);
 const htmlResp=await fetch(url+'/');assert.match(htmlResp.headers.get('cache-control')||'',/no-store/);
 const formJs=await formResp.text();assert.match(formJs,/formspreeId:\s*'xjyydrbj'/);assert.match(formJs,/ML_TRANSLATIONS/);assert.match(formJs,/https:\/\/formspree\.io\/f\/\$\{id\}/);assert.match(formJs,/_subject:'Mafia Lobby/);
 const host=await act({type:'create',name:'Host',avatar:{}});
 const guests=[];for(let i=1;i<=4;i++)guests.push(await act({type:'join',code:host.code,name:'Guest '+i,avatar:{}}));
 let st=await act({...host,type:'settings',settings:{capacity:18,mafia:1,doctors:1,detective:true,night:125,discussion:300,vote:60}});
 assert.equal(st.settings.capacity,18);assert.equal(st.settings.night,125);
 const last=await act({...guests[3],type:'state'});
 st=await act({...host,type:'kick',target:last.myId});assert.equal(st.players.length,4);
 let invalid=await fetch(url+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...guests[3],type:'state'})});assert.equal(invalid.status,410);
 guests[3]=await act({type:'join',code:host.code,name:'Replacement',avatar:{}});
 st=await act({...host,type:'start'});assert.equal(st.phase,'reveal');
 for(const g of [host,...guests])await act({...g,type:'ready'});
 st=await act({...host,type:'state'});assert.equal(st.phase,'night');
 assert(!st.players.some(x=>Object.hasOwn(x,'role')),'Secret roles leaked to other players');
 await act({...host,type:'leave'});
 st=await act({...guests[0],type:'state'});assert.notEqual(st.hostId,st.players[0].id);
 for(const route of ['/robots.txt','/sitemap.xml','/favicon.svg','/favicon-32.png','/social-preview.jpg'])assert.equal((await fetch(url+route)).status,200,route);
 console.log('PASS: version, Formspree configuration, AJAX submission source, static metadata, multiplayer smoke flows and asset routes');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>child.kill());
