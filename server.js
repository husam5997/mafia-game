'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, 'public');
const rooms = new Map();
const uid = () => crypto.randomBytes(18).toString('base64url');
const rand = n => crypto.randomInt(n);
const code = () => crypto.randomBytes(4).toString('hex').toUpperCase().slice(0,6);
const DEFAULT = { capacity: 12, mafia: 2, doctors: 1, detective: true, night: 90, discussion: 300, vote: 60 };
const clamp = (v,min,max,def) => Number.isFinite(Number(v)) ? Math.max(min,Math.min(max,Math.round(Number(v)))) : def;
const safeText = (x, max=30) => String(x||'').trim().slice(0,max).replace(/[<>]/g,'');
const members = r => r.players.filter(p=>!p.left);
const alive = r => members(r).filter(p=>p.alive);
const mafia = r => alive(r).filter(p=>p.role==='mafia');
const nonMafia = r => alive(r).filter(p=>p.role!=='mafia');
const byId = (r,id) => r.players.find(p=>p.id===id);
const privatePlayer = p => ({id:p.id,name:p.name,avatar:p.avatar,alive:p.alive,left:!!p.left,connected:!p.left&&Date.now()-p.lastSeen<12000});
const log = (r,type,detail) => r.history.push({day:r.day,type,detail,time:Date.now()});
function validateSettings(s,n) {
  if (s.capacity<5||s.capacity>25||n>s.capacity) return 'Room capacity must be 5–25 and at least the current player count.';
  if(s.mafia<1||s.doctors<0||s.mafia+s.doctors+(s.detective?1:0)>s.capacity) return 'Role counts exceed the room capacity.';
  if(s.mafia >= s.capacity-s.mafia) return 'Mafia must be outnumbered when the match begins.';
  if(s.capacity-s.mafia-s.doctors-(s.detective?1:0)<1) return 'At least one ordinary Civilian is required.';
  return null;
}
function view(r,me) {
  const now=Date.now();
  const base = {
    code:r.code,hostId:r.hostId,phase:r.phase,day:r.day,settings:r.settings,
    players:r.players.map(privatePlayer),myId:me.id,role:me.role||null,alive:me.alive,
    deadline:r.deadline,serverTime:now,stageEnd:r.stageEnd||null,
    roleReadyCount:members(r).filter(p=>p.ready).length,
    earlyReadyCount:alive(r).filter(p=>p.earlyReady).length,
    selfReady:!!me.ready,earlyReady:!!me.earlyReady,
    myTarget:me.target||null,myConfirmed:!!me.confirmed,
    myVote:me.vote===undefined?null:me.vote, myVoteDone:!!me.voteDone,
    mafiaExtension: r.phase==='night'&&r.extension&&me.role==='mafia',
    lastAnnouncement:r.announcement||null,events:r.publicEvents.slice(-12),
    outcome:r.outcome,
    myResult:me.role==='detective'?me.result:null,
    myDoctorPrevious:me.prevProtected||null,
    dreamDone:!!me.dreamDone,
    votes: r.phase==='results'||r.phase==='gameover'?r.voteResults:null,
    gameStats: r.phase==='gameover'?{roles:r.players.map(p=>({id:p.id,role:p.role,name:p.name})),history:r.history}:null,
  };
  if(r.phase==='night'&&me.alive&&me.role==='mafia'){
    base.mafiaChoices=mafia(r).map(p=>({id:p.id,name:p.name,target:p.target,confirmed:p.confirmed}));
    base.mafiaChat=r.chat.slice(-60);
  }
  return base;
}
function emit(r,type,message) {r.publicEvents.push({id:uid(),type,message,at:Date.now()});if(r.publicEvents.length>40)r.publicEvents.shift();}
function phase(r,p,ms) {r.phase=p;r.deadline=ms?Date.now()+ms:0;r.stageEnd=Date.now();}
function endCheck(r) {
  const m=mafia(r).length,other=nonMafia(r).length;
  if(m===0){r.outcome='civilian';phase(r,'gameover',0);log(r,'victory','Civilians win');return true;}
  if(m>=other){r.outcome='mafia';phase(r,'gameover',0);log(r,'victory','Mafia win');return true;}
  return false;
}
function finishNight(r) {
  const m=mafia(r);
  const agreed=m.length>0&&m.every(p=>p.target&&p.confirmed&&p.target===m[0].target);
  const victim=agreed?byId(r,m[0].target):null;
  const protectedIds = new Set(alive(r).filter(p=>p.role==='doctor'&&p.confirmed&&p.target).map(p=>p.target));
  const saved=!!victim&&protectedIds.has(victim.id);
  const died=!!victim&&!saved&&victim.alive;
  if(died)victim.alive=false;
  // Doctor cooldown applies to their previous confirmed selection (not to a skipped night).
  for(const p of r.players)if(p.role==='doctor'&&p.confirmed&&p.target)p.prevProtected=p.target;
  const outcome= !victim?'none':saved?'saved':'died';
  r.announcement={kind:outcome,playerId:victim?.id||null,name:victim?.name||null,day:r.day};
  log(r,'night',{outcome,target:victim?.name||null,protected:[...protectedIds].map(id=>byId(r,id)?.name),investigations:alive(r).filter(p=>p.role==='detective'&&p.result).map(p=>({detective:p.name,result:p.result}))});
  emit(r,'sunrise', outcome==='died'?`${victim.name} died during the night.`:outcome==='saved'?`${victim.name} was saved by the Doctor!`:'Nobody died last night.');
  // A night ending in Mafia victory should still show the sunrise before endgame.
  phase(r,'sunrise',8000);r.extension=false;
}
function startDiscussion(r){if(endCheck(r))return;for(const p of r.players)p.earlyReady=false;phase(r,'discussion',r.settings.discussion*1000);}
function startVoting(r){for(const p of r.players){p.vote=undefined;p.voteDone=false;}phase(r,'voting',r.settings.vote*1000);}
function finishVoting(r){
  const voters=alive(r);
  const votes=voters.map(p=>({voterId:p.id,voterName:p.name,targetId:p.voteDone?p.vote:null,targetName:p.voteDone&&p.vote?byId(r,p.vote)?.name||null:null}));
  const tally={};for(const v of votes)if(v.targetId)tally[v.targetId]=(tally[v.targetId]||0)+1;
  const top=Object.entries(tally).sort((a,b)=>b[1]-a[1])[0];
  const eliminated=top&&top[1]>voters.length/2?byId(r,top[0]):null;
  if(eliminated)eliminated.alive=false;
  r.voteResults={votes,tally,eliminatedId:eliminated?.id||null,required:Math.floor(voters.length/2)+1,aliveCount:voters.length};
  log(r,'vote',{votes:votes.map(v=>({from:v.voterName,to:v.targetName||'Skip'})),eliminated:eliminated?.name||null});
  emit(r,'vote',eliminated?`${eliminated.name} was voted out.`:'No player received a majority. Nobody was eliminated.');
  phase(r,'results',9000);
}
function beginNight(r){r.day++;r.announcement=null;r.voteResults=null;r.chat=[];r.extension=false;for(const p of r.players){p.target=null;p.confirmed=false;p.result=null;p.dreamDone=false;p.voteDone=false;}phase(r,'night',r.settings.night*1000);}
function advance(r) {
  if(r.phase==='lobby'||r.phase==='gameover')return;
  if(r.phase==='reveal') {if(members(r).every(p=>p.ready)||Date.now()>=r.deadline)beginNight(r);return;}
  if(r.phase==='night'){
    const performers=alive(r);
    const mafiaDone=mafia(r).every(p=>p.confirmed&&p.target&&mafia(r).every(q=>q.target===p.target&&q.confirmed));
    const otherDone=performers.filter(p=>p.role!=='mafia').every(p=>p.role==='civilian'?p.dreamDone:p.confirmed);
    if(mafiaDone&&otherDone){finishNight(r);return;}
    if(Date.now()>=r.deadline){
      if(!r.extension&&!mafiaDone){r.extension=true;r.deadline=Date.now()+30000;return;}
      finishNight(r);
    }
    return;
  }
  if(r.phase==='sunrise'&&Date.now()>=r.deadline){startDiscussion(r);return;}
  if(r.phase==='discussion'&&(Date.now()>=r.deadline||alive(r).every(p=>p.earlyReady))){startVoting(r);return;}
  if(r.phase==='voting'&&(Date.now()>=r.deadline||alive(r).every(p=>p.voteDone))){finishVoting(r);return;}
  if(r.phase==='results'&&Date.now()>=r.deadline){if(!endCheck(r))beginNight(r);}
}
function assignRoles(r){
  const present=members(r);
  const slots=[...Array(r.settings.mafia).fill('mafia'),...Array(r.settings.doctors).fill('doctor'),...(r.settings.detective?['detective']:[])];
  while(slots.length<present.length)slots.push('civilian');
  for(let i=slots.length-1;i>0;i--){const j=rand(i+1);[slots[i],slots[j]]=[slots[j],slots[i]];}
  present.forEach((p,i)=>{p.role=slots[i];p.alive=true;p.ready=false;p.target=null;p.confirmed=false;p.earlyReady=false;p.prevProtected=null;p.result=null;p.voteDone=false;p.dreamDone=false;});
  r.day=0;r.history=[];r.publicEvents=[];r.chat=[];r.announcement=null;r.voteResults=null;r.outcome=null;r.extension=false;
  phase(r,'reveal',120000); // Auto-advance if a disconnected player never acknowledges their role.
}
function getRoom(obj) {
 const r=rooms.get(String(obj.code||'').toUpperCase());
 if(!r)throw Error('Room not found. Check the six-character code.');
 const me=members(r).find(p=>p.token===obj.token);
 if(!me)throw Error(r.kicked?.get(obj.token)||'Session is no longer active in this room.');
 me.lastSeen=Date.now();advance(r);
 return {r,me};
}
function need(cond,msg){if(!cond)throw Error(msg);}
function action(o){
 if(o.type==='create'){
   const settings={...DEFAULT};const capacity=clamp(o.capacity,5,25,12);settings.capacity=capacity;settings.mafia=capacity>=8?2:1;
   let c;do{c=code()}while(rooms.has(c));
   const token=uid(),id=uid();const me={id,token,name:safeText(o.name,22)||'Host',avatar:cleanAvatar(o.avatar),lastSeen:Date.now(),alive:true,role:null};
   const r={code:c,hostId:id,settings,players:[me],kicked:new Map(),phase:'lobby',day:0,deadline:0,stageEnd:0,chat:[],publicEvents:[],history:[],extension:false};rooms.set(c,r);
   return {code:c,token,id};
 }
 if(o.type==='join'){
   const c=String(o.code||'').trim().toUpperCase(),r=rooms.get(c);need(r,'Room not found.');advance(r);
   need(r.phase==='lobby','This match has already started.');need(members(r).length<r.settings.capacity,'Room is full.');
   const name=safeText(o.name,22);need(name.length>=1,'Enter your player name.');
   need(!members(r).some(p=>p.name.toLowerCase()===name.toLowerCase()),'That name is already in use in this room.');
   const p={id:uid(),token:uid(),name,avatar:cleanAvatar(o.avatar),lastSeen:Date.now(),alive:true,role:null};r.players.push(p);emit(r,'join',`${name} joined the room.`);return {code:c,token:p.token,id:p.id};
 }
 const {r,me}=getRoom(o);const host=()=>need(me.id===r.hostId,'Only the host can do that.');
 const inPhase=x=>need(r.phase===x,`This action is not available during ${r.phase}.`);
 const living=()=>need(me.alive,'Eliminated players cannot take this action.');
 if(o.type==='state')return view(r,me);
 // Explicit exit is permanent: a departed player is never silently kept as a ghost.
 // During a match, their role remains secret until game over, but they no longer count
 // for actions, voting, or victory. Another member inherits the host controls.
 if(o.type==='leave'){
   if(r.phase==='lobby')r.players=r.players.filter(p=>p.id!==me.id);
   else if(r.phase==='gameover')me.left=true; // Preserve the end-game role reveal until the next lobby.
   else {me.left=true;me.alive=false;me.confirmed=false;me.ready=false;me.earlyReady=false;me.voteDone=false;log(r,'departure',`${me.name} left the match.`);}
   emit(r,'leave',`${me.name} left the room.`);
   const remaining=members(r);
   if(!remaining.length){rooms.delete(r.code);return {left:true,roomClosed:true};}
   if(me.id===r.hostId){
     const successor=[...remaining].sort((a,b)=>Number(b.alive)-Number(a.alive)||b.lastSeen-a.lastSeen)[0];
     r.hostId=successor.id;
     emit(r,'host',`${successor.name} is now the host.`);
   }
   if(!['lobby','gameover'].includes(r.phase)){
     if(!endCheck(r))advance(r);
   }
   return {left:true,roomClosed:false};
 }

 if(o.type==='settings'){
   inPhase('lobby');host();
   const s={capacity:clamp(o.settings.capacity,5,25,r.settings.capacity),mafia:clamp(o.settings.mafia,1,12,r.settings.mafia),doctors:clamp(o.settings.doctors,0,12,r.settings.doctors),detective:!!o.settings.detective,night:clamp(o.settings.night,30,240,r.settings.night),discussion:clamp(o.settings.discussion,60,900,r.settings.discussion),vote:clamp(o.settings.vote,30,180,r.settings.vote)};
   const err=validateSettings(s,members(r).length);need(!err,err);r.settings=s;return view(r,me);
 }
 if(o.type==='start'){
   inPhase('lobby');host();need(members(r).length>=5,'You need at least five players to start.');
   const err=validateSettings({...r.settings,capacity:members(r).length},members(r).length);need(!err,`Invalid roles for ${members(r).length} active players: ${err}`);
   assignRoles(r);return view(r,me);
 }
 if(o.type==='ready'){inPhase('reveal');me.ready=true;advance(r);return view(r,me);}
 if(o.type==='target'){
   inPhase('night');living();need(!r.extension||me.role==='mafia','Your action phase has ended.');need(['mafia','doctor','detective'].includes(me.role),'No player target needed for your role.');
   const target=byId(r,o.target);need(target?.alive,'Choose a living player.');
   need(target.id!==me.id||me.role==='doctor','You cannot target yourself.');
   if(me.role==='mafia')need(target.role!=='mafia','You cannot target another Mafia member.');
   if(me.role==='doctor')need(me.prevProtected!==target.id,'You cannot protect the same player on consecutive nights.');
   need(!(me.role==='detective'&&me.confirmed),'Investigation already confirmed.');
   me.target=target.id;me.confirmed=false;
   if(me.role==='mafia')for(const p of mafia(r))p.confirmed=false;
   return view(r,me);
 }
 if(o.type==='confirm'){
   inPhase('night');living();need(!r.extension||me.role==='mafia','Your action phase has ended.');need(['mafia','doctor','detective'].includes(me.role),'Not permitted.');need(me.target,'Select a target first.');
   if(me.role==='mafia')need(mafia(r).every(p=>p.target===me.target),'Mafia have not agreed on a victim.');
   me.confirmed=true;
   if(me.role==='detective')me.result={targetId:me.target,targetName:byId(r,me.target).name,verdict:byId(r,me.target).role==='mafia'?'MAFIA':'INNOCENT'};
   advance(r);return view(r,me);
 }
 if(o.type==='dream'){inPhase('night');living();need(!r.extension,'Your action phase has ended.');need(me.role==='civilian','Only Civilians have dreams.');me.dreamDone=true;advance(r);return view(r,me);}
 if(o.type==='chat'){
   inPhase('night');living();need(me.role==='mafia','Only Mafia can use Mafia chat.');const m=safeText(o.message,300);need(m,'Message cannot be empty.');r.chat.push({id:uid(),by:me.id,name:me.name,text:m,time:Date.now()});r.chat=r.chat.slice(-100);return view(r,me);
 }
 if(o.type==='early'){inPhase('discussion');living();me.earlyReady=!!o.ready;advance(r);return view(r,me);}
 if(o.type==='vote'){
   inPhase('voting');living();need(!me.voteDone,'Your vote is already submitted.');
   const v=o.target==null?null:byId(r,o.target);need(o.target==null||v?.alive,'Vote for a living player.');need(!v||v.id!==me.id,'You cannot vote for yourself.');
   me.vote=v?.id||null;me.voteDone=true;advance(r);return view(r,me);
 }
 if(o.type==='cancelMatch'){
   host();need(!['lobby','gameover'].includes(r.phase),'No running match to cancel.');
   r.players=r.players.filter(p=>!p.left);
   for(const p of r.players){p.role=null;p.ready=false;p.alive=true;p.prevProtected=null;p.confirmed=false;p.target=null;p.result=null;p.dreamDone=false;p.vote=undefined;p.voteDone=false;p.earlyReady=false;}
   r.phase='lobby';r.day=0;r.outcome=null;r.deadline=0;r.history=[];r.chat=[];r.publicEvents=[];r.announcement=null;r.voteResults=null;r.extension=false;
   emit(r,'reset','The host ended the match. Everyone has returned to the lobby.');
   return view(r,me);
 }
 if(o.type==='again'){
   inPhase('gameover');host();r.players=r.players.filter(p=>!p.left);r.players.forEach(p=>{p.role=null;p.ready=false;p.alive=true;p.prevProtected=null;p.confirmed=false;});
   r.phase='lobby';r.day=0;r.outcome=null;r.deadline=0;r.history=[];r.chat=[];r.publicEvents=[];r.announcement=null;r.voteResults=null;r.extension=false;
   return view(r,me);
 }
 if(o.type==='kick'){
   inPhase('lobby');host();need(o.target!==me.id,'Host cannot kick themselves.');
   const target=members(r).find(p=>p.id===o.target);need(target,'Player no longer in the lobby.');
   r.kicked.set(target.token,'The host removed you from the lobby. You can join another room from the main menu.');
   r.players=r.players.filter(p=>p.id!==target.id);
   emit(r,'kick',`${target.name} was removed from the lobby.`);
   return view(r,me);
 }
 throw Error('Unknown request.');
}
function cleanAvatar(a){
 a=a&&typeof a==='object'?a:{};
 return {skin:clamp(a.skin,0,7,3),hair:clamp(a.hair,0,11,0),hairColor:clamp(a.hairColor,0,7,0),eyes:clamp(a.eyes,0,4,0),nose:clamp(a.nose,0,4,0),mouth:clamp(a.mouth,0,4,0),top:clamp(a.top,0,5,0),topColor:clamp(a.topColor,0,7,0),accessory:clamp(a.accessory,0,4,0)};
}
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    if(req.url==='/api/version'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({name:'Mafia Lobby',version:'1.3.1',ok:true}));return;}
    if(req.url==='/api'&&req.method==='POST'){
      let body='';for await(const part of req){body+=part;if(body.length>30000)throw Error('Request too large.');}
      let result;try{result=action(JSON.parse(body));}catch(e){
        const invalid=/Room not found|Session is no longer active|removed you from the lobby|Session not found/i.test(e.message);
        res.writeHead(invalid?410:400,{'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end(JSON.stringify({error:e.message,code:invalid?'SESSION_ENDED':'BAD_ACTION'}));return;
      }
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(result));return;
    }
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    const requestPath=decodeURIComponent((req.url||'/').split('?')[0]);
    const file=path.resolve(ROOT,'.'+(requestPath==='/'?'/index.html':requestPath));
    if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
    const content=await fs.promises.readFile(file);
    res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(content);
  }catch(e){res.writeHead(404);res.end('Not found');}
});
setInterval(()=>{for(const r of rooms.values())advance(r);},400).unref();
server.listen(PORT,'0.0.0.0',()=>console.log(`Mafia Lobby by Barely Chaos running on http://localhost:${PORT}`));
