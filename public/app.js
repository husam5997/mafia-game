'use strict';
const $=s=>document.querySelector(s);
const app=$('#app');
const STORE='comic_noir_mafia_session_v1';
let session=JSON.parse(localStorage.getItem(STORE)||'null'), state=null, route='home', authMode='create', avatarTab='skin', revealed=false, detectiveVisible=false, sheepCaught=false, selected=null, chatExpanded=false, chatDraft='', freeze=false, activeEdit=false, networkErrors=0, currentView='', timerId=null, clockOffset=0, modalContext=null, sessionVersion=0;
let draftName=localStorage.getItem('mafia_name')||'', draftCode='', draftAvatar=JSON.parse(localStorage.getItem('mafia_avatar')||'null')||{skin:3,hair:0,hairColor:0,eyes:0,nose:0,mouth:0,top:0,topColor:0,accessory:0};
const skins=['#f7d9bd','#eac3a1','#d8a37d','#bd825c','#a36a47','#865537','#653e2b','#412d28'];
const hairs=['#211d20','#47302a','#76503a','#b67a42','#dfb16b','#b55045','#9b9da1','#50334c'];
const tops=['#597f99','#b74c55','#669179','#d1a352','#8264a4','#e1d4c4','#394b62','#9c704f'];
const opts={skin:skins,hairColor:hairs,topColor:tops,hair:['Curly','Short fade','Side part','Long','Afro','Buzz cut','Bun','Wavy','Mohawk','Bald','Braids','Bob'],eyes:['Round','Narrow','Wide','Sleepy','Happy'],nose:['Classic','Small','Broad','Button','Long'],mouth:['Smile','Grin','Straight','Frown','Open'],top:['T-Shirt','Hoodie','Suit','Jacket','Sweater','Collar'],accessory:['None','Glasses','Round specs','Freckles','Beard']};
const categories=[['skin','Skin'],['hair','Hair'],['hairColor','Hair color'],['eyes','Eyes'],['nose','Nose'],['mouth','Mouth'],['top','Clothes'],['topColor','Top color'],['accessory','Extras']];
const APP_VERSION='1.3.1';
const PATREON_URL='https://www.patreon.com/cw/BarelyChaos';
const LANG_KEY='mafia_lobby_language';
let lang=localStorage.getItem(LANG_KEY)||'en';
if(!['en','ar','fr','es'].includes(lang))lang='en';
let reportSending=false;
const messages={};
for(const row of window.ML_TRANSLATIONS||[])messages[row[0]]={ar:row[1],fr:row[2],es:row[3]};
function tt(source){return lang==='en'?String(source):messages[String(source)]?.[lang]||String(source)}
function localizedText(text){
 const original=String(text),trimmed=original.trim();if(!trimmed)return original;
 let replacement=tt(trimmed);
 if(replacement===trimmed){
  // Preserve leading pictograms used in legacy buttons while translating their labels.
  for(const english of Object.keys(messages).sort((a,b)=>b.length-a.length)){
   if(trimmed.endsWith(english)&&english!==trimmed){
    const prefix=trimmed.slice(0,-english.length);
    if(prefix.length<=12&&!/[A-Za-z0-9]/.test(prefix)){
     replacement=prefix+tt(english);break;
    }
   }
  }
  let match;
  if((match=trimmed.match(/^(\d+)\/(\d+) PLAYERS$/)))replacement=`${match[1]}/${match[2]} ${tt('PLAYERS')}`;
  else if((match=trimmed.match(/^(\d+) joined$/)))replacement=`${match[1]} ${tt('joined')}`;
  else if((match=trimmed.match(/^Waiting for others: (\d+)\/(\d+) ready$/)))replacement=({ar:`بانتظار الآخرين: ${match[1]}/${match[2]} مستعد`,fr:`En attente : ${match[1]}/${match[2]} prêts`,es:`Esperando: ${match[1]}/${match[2]} listos`}[lang]||trimmed);
  else if((match=trimmed.match(/^NIGHT (\d+)$/)))replacement=({ar:`الليلة ${match[1]}`,fr:`NUIT ${match[1]}`,es:`NOCHE ${match[1]}`}[lang]||trimmed);
  else if((match=trimmed.match(/^DAY (\d+)$/)))replacement=({ar:`اليوم ${match[1]}`,fr:`JOUR ${match[1]}`,es:`DÍA ${match[1]}`}[lang]||trimmed);
  else if((match=trimmed.match(/^(\d+) needed$/)))replacement=`${match[1]} ${tt('needed')}`;
  else if((match=trimmed.match(/^(.+) WAS ELIMINATED!$/)))replacement=({ar:`تم إقصاء ${match[1]}!`,fr:`${match[1]} A ÉTÉ ÉLIMINÉ !`,es:`¡${match[1]} FUE EXPULSADO!`}[lang]||trimmed);
  else if(trimmed==='→ SKIPPED')replacement=tt(trimmed);
 }
 return replacement===trimmed?original:original.replace(trimmed,replacement);
}
function applyLanguage(){
 document.documentElement.lang=lang;
 document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 document.body.classList.toggle('rtl',lang==='ar');
 const walker=document.createTreeWalker(app,NodeFilter.SHOW_TEXT);
 let node;
 while(node=walker.nextNode()){
  const p=node.parentElement;
  if(!p||p.closest('.no-localize,.chat-msg,.player-name,.player-code,.input-value,#lang-picker,.logo-small,.footer,.hero h1')||['SCRIPT','STYLE','TEXTAREA'].includes(p.tagName))continue;
  node.nodeValue=localizedText(node.nodeValue);
 }
 app.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>{
  if(el.closest('.no-localize,.chat-msg,.player-name'))return;
  for(const k of ['placeholder','title','aria-label']){if(el.hasAttribute(k))el.setAttribute(k,localizedText(el.getAttribute(k)));}
 });
 const langPicker=$('#lang-picker');if(langPicker)langPicker.value=lang;
}
function dayLabel(number){return ({ar:`اليوم ${number}`,fr:`JOUR ${number}`,es:`DÍA ${number}`,en:`DAY ${number}`})[lang]}
function nightLabel(number){return ({ar:`الليلة ${number}`,fr:`NUIT ${number}`,es:`NOCHE ${number}`,en:`NIGHT ${number}`})[lang]}
function dayVotingLabel(number){return ({ar:`${dayLabel(number)} · التصويت`,fr:`${dayLabel(number)} · VOTE`,es:`${dayLabel(number)} · VOTACIÓN`,en:`${dayLabel(number)} · VOTING`})[lang]}
function timeMeaning(seconds){
 const s=Math.max(0,Number(seconds)||0),m=Math.floor(s/60),rem=s%60;
 if(lang==='ar')return m?`${m} د ${rem?`و ${rem} ث`:''}`:`${rem} ث`;
 if(lang==='fr')return m?`${m} min ${rem?`${rem} s`:''}`:`${rem} s`;
 if(lang==='es')return m?`${m} min ${rem?`${rem} s`:''}`:`${rem} s`;
 return m?`${m} min${rem?` ${rem} sec`:''}`:`${rem} sec`;
}
function refreshSettingsPreview(){
 const cap=$('#s-capacity');if(cap&&$('#capacity-top'))$('#capacity-top').textContent=`${state?.players?.filter(p=>!p.left).length||0}/${cap.value} ${tt('PLAYERS')}`;
 for(const key of ['night','discussion','vote']){
  const el=$('#s-'+key),out=$('#s-'+key+'-equivalent');
  if(el&&out)out.textContent=timeMeaning(el.value);
 }
}
const SUPPORT_USAGE='ml_active_time_ms_v1';
const SUPPORT_LAST='ml_support_last_ms_v1';
let activeMs=Number(localStorage.getItem(SUPPORT_USAGE)||0);
let supportLast=Number(localStorage.getItem(SUPPORT_LAST)||0);
let lastUsageTick=Date.now();
function supportEligible(){
 if(modalContext||activeMs<1800000||activeMs-supportLast<1800000)return false;
 if(session)return state&&['lobby','gameover'].includes(state.phase);
 return ['home','rules','join'].includes(route);
}
function rememberSupport(){supportLast=activeMs;localStorage.setItem(SUPPORT_LAST,String(supportLast))}
function showSupport(){
 if(!supportEligible())return;
 modalContext={type:'support'};rememberSupport();
 app.insertAdjacentHTML('beforeend',`<div class="dialog-scrim" id="support-overlay"><section class="dialog-panel support-panel" role="dialog" aria-modal="true" aria-labelledby="support-heading"><div class="support-heart">♥</div><h2 id="support-heading">Enjoying Mafia Lobby?</h2><p>Mafia Lobby is free to play. If you enjoy the game, consider supporting Barely Chaos so we can keep it free and bring you more features!</p><div class="stack">${b('SUPPORT ON PATREON','support-visit','gold-btn wide')}${b('MAYBE LATER','support-dismiss','ghost wide')}</div></section></div>`);
 applyLanguage();
}
function maybeSupport(){if(supportEligible()&&!$('#support-overlay'))showSupport()}
setInterval(()=>{
 const now=Date.now();const delta=Math.min(2000,Math.max(0,now-lastUsageTick));lastUsageTick=now;
 if(document.visibilityState==='visible'){
  activeMs+=delta;
  if(Math.floor(activeMs/5000)>Math.floor((activeMs-delta)/5000))localStorage.setItem(SUPPORT_USAGE,String(activeMs));
  maybeSupport();
 }
},1000);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function avatar(a={},cls='thumb'){
 const s=skins[a.skin??3],h=hairs[a.hairColor??0],t=tops[a.topColor??0],style=a.hair||0;
 let hairpath=style===9?'':style===0||style===4?'<g>'+[[29,48],[40,31],[55,22],[73,20],[92,30],[102,48],[22,61],[107,61]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="${style===4?19:14}" fill="${h}"/>`).join('')+'</g>':style===6?`<circle cx="78" cy="18" r="17" fill="${h}"/><path d="M23 59 Q14 15 59 20 Q108 8 106 63 Q89 41 62 40 Q38 39 23 59" fill="${h}"/>`:style===3||style===11?`<path d="M18 110 Q7 29 42 23 Q105 -3 112 52 L113 114 L98 109 L94 50 Q58 41 29 62 L33 111Z" fill="${h}"/>`:style===8?`<path d="M24 60 L40 13 L52 37 L66 3 L80 37 L94 14 L106 60 Q71 35 24 60Z" fill="${h}"/>`:style===5?`<path d="M22 57 Q19 27 58 28 Q99 25 105 57 L98 47 Q58 39 31 51Z" fill="${h}"/>`:`<path d="M21 62 Q14 18 58 22 Q113 19 106 62 Q89 45 65 46 Q42 44 25 63Z" fill="${h}"/>`;
 const eyes=a.eyes===1?'<path d="M39 76 L53 77 M71 77 L85 76" stroke="#302425" stroke-width="4" stroke-linecap="round"/>':a.eyes===4?'<path d="M39 77 Q46 68 53 77 M71 77 Q78 68 85 77" stroke="#302425" stroke-width="3" fill="none"/>':`<ellipse cx="46" cy="76" rx="${a.eyes===2?5:3}" ry="${a.eyes===3?2:4}" fill="#2f2626"/><ellipse cx="78" cy="76" rx="${a.eyes===2?5:3}" ry="${a.eyes===3?2:4}" fill="#2f2626"/>`;
 const mouth=['M45 104 Q62 116 79 104','M44 102 Q61 125 80 102','M47 108 H77','M46 112 Q62 101 78 112','M54 104 Q62 124 70 104Z'][a.mouth||0];
 const nose=['M63 79 L59 93 Q63 96 68 93','M63 85 L61 92','M60 82 Q54 92 65 95','M60 89 Q65 97 70 89','M63 78 L57 95 Q63 98 69 95'][a.nose||0];
 const accessory=a.accessory===1||a.accessory===2?`<g fill="none" stroke="#26242c" stroke-width="3"><circle cx="46" cy="77" r="${a.accessory===2?14:12}"/><circle cx="78" cy="77" r="${a.accessory===2?14:12}"/><path d="M58 75 Q62 71 66 75 M34 74 H26 M90 74 H98"/></g>`:a.accessory===3?'<g fill="#a45c53"><circle cx="33" cy="88" r="1.7"/><circle cx="38" cy="91" r="1.7"/><circle cx="86" cy="91" r="1.7"/><circle cx="91" cy="88" r="1.7"/></g>':a.accessory===4?'<path d="M40 111 Q40 141 62 142 Q87 140 83 110 Q79 131 62 132 Q45 130 40 111" fill="#42352d"/>':'';
 return `<svg class="avatar-svg ${cls}" viewBox="0 0 124 158" role="img" aria-label="Cartoon avatar"><path d="M5 158 Q6 126 35 121 L89 121 Q117 126 119 158Z" fill="${t}" stroke="#1b1d29" stroke-width="3"/>${a.top===1?`<path d="M31 123 Q26 109 36 108 L89 108 Q103 117 94 126" fill="none" stroke="${t}" stroke-width="16"/>`:a.top===2?'<path d="M42 123 L63 158 L76 123 L95 128 L82 158 H42 L26 127Z" fill="#282d35"/><path d="M55 125 L64 149 L72 125" fill="#faf4ed"/>':a.top===3?'<path d="M26 132 L42 123 L58 156 M98 132 L82 123 L66 156" stroke="#282735" stroke-width="7"/>':''}<rect x="53" y="111" width="19" height="18" rx="5" fill="${s}"/><ellipse cx="62" cy="80" rx="41" ry="48" fill="${s}" stroke="#402e2b" stroke-width="2"/><ellipse cx="23" cy="86" rx="6" ry="10" fill="${s}"/><ellipse cx="101" cy="86" rx="6" ry="10" fill="${s}"/>${hairpath}<path d="M37 67 Q46 62 54 67 M70 67 Q78 62 87 67" fill="none" stroke="${h}" stroke-width="3" stroke-linecap="round"/>${eyes}<path d="${nose}" fill="none" stroke="#805242" stroke-width="2" stroke-linecap="round"/><path d="${mouth}" fill="none" stroke="#78463e" stroke-width="2.8" stroke-linecap="round"/>${accessory}</svg>`;
}
function saveAvatar(){localStorage.setItem('mafia_avatar',JSON.stringify(draftAvatar));localStorage.setItem('mafia_name',draftName)}
function toast(msg){const el=$('#toast');el.textContent=tt(msg);el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),3600)}
async function api(data){
 const resp=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const out=await resp.json();
 if(!resp.ok){const error=Error(out.error||'Request failed');error.code=out.code;throw error;}
 return out;
}
function resetSession(message=''){
 sessionVersion++;session=null;state=null;selected=null;route='home';
 localStorage.removeItem(STORE);
 draw();if(message)toast(message);
}
function sessionError(e){
 if(e.code==='SESSION_ENDED'){
   resetSession(e.message||'This room is no longer available.');
   return true;
 }
 return false;
}
async function leaveRoom(){
 if(!session){resetSession();return;}
 const exiting={...session};
 try{
   await api({...exiting,type:'leave'});
   resetSession('You left the room. You can now host or join another game.');
 }catch(e){
   // Never strand the user in a room on a failed or offline request.
   // A best-effort beacon is attempted, but we warn that the slot may remain.
   if(!sessionError(e)){
     try{navigator.sendBeacon?.('/api',new Blob([JSON.stringify({...exiting,type:'leave'})],{type:'application/json'}));}catch{}
     resetSession('Returned to menu. Offline exit may leave your old slot until the host kicks it.');
   }
 }
}

async function send(type,extra={}){
 if(freeze||!session)return;freeze=true;
 const version=sessionVersion, ownSession=session;
 try{const out=await api({...ownSession,type,...extra});if(version!==sessionVersion)return;
 state=out;clockOffset=state.serverTime-Date.now();selected=state.myTarget||null;if(!modalContext)draw();
 }catch(e){if(version===sessionVersion&&!sessionError(e))toast(e.message)}finally{freeze=false}
}
function clock(){if(!state)return '—';return fmt(Math.max(0,Math.ceil((state.deadline-(Date.now()+clockOffset))/1000)))}
function fmt(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function header(title='',right=''){
 const exit=session?`<button class="top-exit" data-action="exit-room" title="Permanently leave this room and go to the main menu">↩ <span>EXIT TO MENU</span></button>`:'';
 const languages=`<label class="sr-only" for="lang-picker">Language</label><select id="lang-picker" class="language-picker" aria-label="Language"><option value="en">English</option><option value="ar">العربية</option><option value="fr">Français</option><option value="es">Español</option></select>`;
 return `<header class="top"><div class="logo-small"><span>MAFIA LOBBY</span><small>BY BARELY CHAOS</small></div><div class="top-actions">${right}${languages}${exit}</div></header>${title?`<div class="section-title"><h2>${title}</h2></div>`:''}`;
}
function shell(body,cls='narrow'){
 const recovery=state&&session&&state.myId===state.hostId&&!['lobby','gameover'].includes(state.phase)?
 `<div class="recovery-panel"><p>Stuck game or disconnected players?</p><button data-action="cancel-match" class="btn ghost mini">END MATCH & RETURN EVERYONE TO LOBBY</button></div>`:'';
 app.innerHTML=`<main class="app"><div class="${cls}">${body}${recovery}</div><footer class="footer"><span>MAFIA LOBBY · BY BARELY CHAOS</span><span class="version">v${APP_VERSION}</span></footer></main>`;
 updateClocks();applyLanguage();refreshSettingsPreview();maybeSupport();
}
function showConfirm(type,target=''){
 modalContext={type,target};
 const host=state&&state.hostId===state.myId;
 const otherMembers=state?.players?.filter(p=>!p.left&&p.id!==state.myId).length||0;
 const phase=state?.phase;
 const subject=type==='kick'?state?.players.find(p=>p.id===target)?.name||'this player':null;
 const title=type==='kick'?'Remove player?':type==='cancel'?'End the current match?':'Leave this room?';
 const message=type==='kick'?
 ({ar:`هل تريد طرد ${subject} من الغرفة؟ سيعود إلى القائمة الرئيسية ويمكنه الانضمام مجدداً.`,fr:`Exclure ${subject} de la salle ? La personne reviendra au menu et pourra rejoindre une autre salle.`,es:`¿Expulsar a ${subject} de la sala? Volverá al menú y podrá unirse de nuevo.`,en:`Remove ${subject} from the lobby? They will return to the main menu and can rejoin with a new session.`}[lang]):
 type==='cancel'?tt('This immediately ends the current match for everybody and returns everyone to the lobby. Roles and this match’s progress will be discarded. You can then kick inactive players and start again.'):
 tt('You will permanently leave this room and return to the main menu.')+(phase&&!['lobby','gameover'].includes(phase)?' '+tt('If you are still alive, leaving counts as elimination.'):'')+(host&&otherMembers?' '+tt('Another remaining player will become host.'):'');
 $('#confirm-overlay')?.remove();
 app.insertAdjacentHTML('beforeend',`<div class="dialog-scrim" id="confirm-overlay" role="presentation"><section class="dialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="dialog-heading" aria-describedby="dialog-desc"><h2 id="dialog-heading">${esc(title)}</h2><p id="dialog-desc">${esc(message)}</p><div class="dialog-actions">${b('CANCEL','cancel-confirm','ghost wide')}${b(type==='kick'?'REMOVE PLAYER':type==='cancel'?'END MATCH':'LEAVE ROOM','do-confirm','danger wide')}</div></section></div>`);
 applyLanguage();$('#confirm-overlay .dialog-panel')?.querySelector('button')?.focus();
}

function b(text,act,kind='primary',extra=''){return `<button class="btn ${kind} ${extra}" data-action="${act}">${text}</button>`}
function draw(){if(!session){if(route==='rules')return rules();if(route==='report')return report();if(route==='avatar')return editor();if(route==='join')return joinCode();return home()};if(!state)return shell(header()+`<div class="panel center">Connecting to your room...</div>`);let phase=state.phase;const names={lobby:lobby,reveal:roleReveal,night:night,sunrise:sunrise,discussion:discussion,voting:voting,results:results,gameover:gameover};(names[phase]||lobby)()}
function home(){shell(`${header()}<div class="hero"><div class="moon-wrap"><div class="moon"></div><div class="hat">🕵️</div></div><h1>MAFIA <em>LOBBY</em></h1><p class="center">Trust nobody. Suspect everybody.</p></div><div class="stack"><button class="btn primary wide" data-action="host">♛ &nbsp; HOST GAME</button><button class="btn gold-btn wide" data-action="join-route">♟ &nbsp; JOIN GAME</button><button class="btn ghost wide" data-action="rules">📜 &nbsp; RULES</button><div class="menu-extras"><button class="btn ghost wide" data-action="report">⚑ &nbsp; REPORT A BUG</button><a class="btn ghost wide" href="${PATREON_URL}" target="_blank" rel="noopener noreferrer">♥ &nbsp; SUPPORT THE CREATOR</a></div></div><div class="skyline"></div>`)}
function report(){
 const configured=!!window.MAFIA_CONFIG?.formspreeId;
 shell(header('REPORT A PROBLEM')+`<div class="panel stack bug-form-panel"><h3>Help us squash the bugs</h3><p class="muted small">Describe the problem and we’ll look into it.</p><form id="bug-form" class="stack"><label for="bug-category">ISSUE CATEGORY</label><select id="bug-category" class="field" name="category"><option value="Gameplay issue">Gameplay issue</option><option value="Connection problem">Connection problem</option><option value="Visual bug">Visual bug</option><option value="Other">Other</option></select><label for="bug-description">WHAT HAPPENED?</label><textarea id="bug-description" class="field" name="message" rows="6" minlength="10" maxlength="2500" placeholder="Tell us what went wrong and what you were doing when it happened..." required></textarea><label for="bug-email">YOUR EMAIL (OPTIONAL)</label><input id="bug-email" class="field" name="email" type="email" placeholder="Only if you want a reply" autocomplete="email"><div class="honeypot"><label for="bug-company">Do not fill</label><input id="bug-company" name="_gotcha" tabindex="-1" autocomplete="off"></div><p class="muted tiny">Reports include your browser, platform and game version, but never your secret role.</p><button type="submit" class="btn primary wide" ${!configured?'disabled':''}>SUBMIT BUG REPORT</button></form>${!configured?`<div class="notice error">Bug reporting is not connected yet. The creator needs to add a Formspree form ID.</div>`:''}${b('← Main menu','home','ghost wide')}</div>`);
}
function rules(){shell(header('HOW TO PLAY')+`<div class="panel stack"><h3>The Town vs. the Mafia</h3><p>The Mafia secretly eliminate townspeople at night. The Civilian team must identify and vote out every Mafia member before Mafia reach the same number as all other surviving players combined.</p><h3>Secret roles</h3><p>🔪 <b>Mafia:</b> Agree unanimously on one victim. All Mafia can see each other's selections and use their private chat.</p><p>🩺 <b>Doctor:</b> Protect one living player (including yourself) each night, but never the same player on two consecutive nights.</p><p>🔎 <b>Detective:</b> Privately investigate one living player per night; see Mafia or Innocent immediately.</p><p>🐑 <b>Civilian:</b> Catch a sheep in your dream at night; this has no effect on the game.</p><h3>Every day</h3><p>Discuss suspicions in person. Everyone must agree to end discussion early. During voting, skip or vote for another living player. Elimination requires more than half of all living players to vote for the same person. All votes are revealed afterward, but secret roles stay hidden until game over.</p><h3>Winning</h3><p>Civilians win by eliminating all Mafia. Mafia win when they equal or outnumber all surviving non-Mafia players.</p>${b('← Back','home','ghost wide')}</div>`)}
function joinCode(){shell(header('JOIN A GAME')+`<div class="panel stack"><p class="muted">Enter the six-character code displayed by the host.</p><label for="roomcode">ROOM CODE</label><input id="roomcode" class="field" maxlength="6" placeholder="A1B2C3" value="${esc(draftCode)}" autocomplete="off" style="text-transform:uppercase;letter-spacing:.2em;text-align:center;font-weight:900;font-size:26px"/>${b('CONTINUE →','join-avatar','primary wide')}${b('← Main menu','home','ghost wide')}</div>`)}
function editor(){let curr=opts[avatarTab],color=['skin','hairColor','topColor'].includes(avatarTab);shell(header('YOUR CHARACTER')+`<div class="stack-lg"><div class="panel stack"><p class="small muted">${authMode==='create'?'Hosting a new room':'Joining '+esc(draftCode)} · Create your alter ego</p><div class="avatar-stage">${avatar(draftAvatar,'large')}</div><div><label>YOUR NAME</label><input id="name" class="field" maxlength="22" value="${esc(draftName)}" placeholder="Enter your name"/></div><div class="spread"><h3>CUSTOMIZE</h3>${b('🎲 RANDOMIZE','random','ghost mini')}</div><div class="tabs">${categories.map(([k,t])=>`<button data-action="tab" data-value="${k}" class="tab ${avatarTab===k?'active':''}">${t}</button>`).join('')}</div>${color?`<div class="swatches">${curr.map((v,i)=>`<button aria-label="Color ${i+1}" style="background:${v}" class="swatch ${draftAvatar[avatarTab]===i?'active':''}" data-action="option" data-value="${i}"></button>`).join('')}</div>`:`<div class="pick-grid">${curr.map((v,i)=>`<button class="pick ${draftAvatar[avatarTab]===i?'active':''}" data-action="option" data-value="${i}">${esc(v)}</button>`).join('')}</div>`}</div>${b(authMode==='create'?'CREATE ROOM →':'JOIN ROOM →','enter','primary wide')}${b('← Back','editor-back','ghost wide')}</div>`)}
function playerCard(p,click=false,annotation=''){return `<button class="player-card ${!p.alive||p.left?'dead':''} ${selected===p.id?'selected':''}" ${click?`data-action="select" data-id="${p.id}"`: ''}>${avatar(p.avatar)}<span class="name player-name">${esc(p.name)}${p.id===state.myId?' '+tt('(you)'):''}</span>${annotation?`<span class="votes">${esc(annotation)}</span>`:''}${selected===p.id?'<span class="check">✓</span>':''}${p.left?'<span class="tiny muted">LEFT ROOM</span>':!p.alive?'<span class="tiny muted">ELIMINATED</span>':''}</button>`}
function lobby(){
 const host=state.myId===state.hostId,s=state.settings;
 const present=state.players.filter(p=>!p.left),n=present.length;
 const setting=(key,label,min,max)=>`<div><label for="s-${key}">${label}</label><input class="field" type="number" id="s-${key}" min="${min}" max="${max}" value="${s[key]}">${['night','discussion','vote'].includes(key)?`<output class="time-equivalent" id="s-${key}-equivalent">${timeMeaning(s[key])}</output>`:''}</div>`;
 const capacitySetting=`<div><label for="s-capacity">ROOM CAPACITY</label><select class="field" id="s-capacity">${Array.from({length:21},(_,i)=>i+5).map(v=>`<option value="${v}" ${s.capacity===v?'selected':''}>${v}</option>`).join('')}</select></div>`;
 const tiles=present.map(p=>`<div class="member-tile">
  ${playerCard(p,false,p.id===state.hostId?'HOST':'')}
  <div class="member-status ${p.connected?'online':'offline'}">${p.connected?'● Connected':'○ Disconnected'}</div>
  ${host&&p.id!==state.myId?`<button class="member-kick" data-action="kick-player" data-id="${esc(p.id)}" aria-label="Remove ${esc(p.name)} from the lobby">✕ KICK</button>`:''}
 </div>`).join('');
 shell(header('GAME LOBBY',`<span class="pill" id="capacity-top">${n}/${s.capacity} PLAYERS</span>`)+
 `<div class="stack-lg">
 <div class="panel stack"><div class="spread"><div><p class="tiny muted">SHARE THIS ROOM CODE</p><h2 class="gold" style="letter-spacing:.15em">${state.code}</h2></div>${b('COPY CODE','copy','ghost mini')}</div><div class="notice">Everyone joins on their own phone. The host plays too and receives a random role.</div></div>
 <div><div class="section-title"><h3>THE CREW</h3><span class="muted small">${n} joined</span></div>
 ${host?'<p class="muted small lobby-tip">Host: use KICK below an avatar to remove someone who left, even after Play Again.</p>':''}
 <div class="player-grid lobby-grid">${tiles}</div></div>
 <div class="panel stack"><div class="spread"><h3>GAME SETUP</h3>${host?'<span class="tag sage">HOST CONTROLS</span>':'<span class="tag">HOST IS CONFIGURING</span>'}</div>
 ${host?`<div class="inline-fields">${capacitySetting}${setting('mafia','MAFIA',1,12)}${setting('doctors','DOCTORS',0,12)}<div><label>DETECTIVE</label><select id="s-detective" class="field"><option value="true" ${s.detective?'selected':''}>Enabled (1)</option><option value="false" ${!s.detective?'selected':''}>Disabled</option></select></div>${setting('night','NIGHT (SECONDS)',30,240)}${setting('discussion','DISCUSSION (SECONDS)',60,900)}${setting('vote','VOTING (SECONDS)',30,180)}</div>${b('SAVE SETTINGS','settings','gold-btn wide')}`:
 `<p class="muted small">${tt('MAFIA')}: ${s.mafia} · ${tt('DOCTORS')}: ${s.doctors} · ${tt('DETECTIVE')}: ${tt(s.detective?'ON':'OFF')}<br>${tt('Discussion')}: ${timeMeaning(s.discussion)} · ${tt('Night')}: ${timeMeaning(s.night)} · ${tt('Voting')}: ${timeMeaning(s.vote)}</p>`}
 ${host?b('START GAME','start','primary wide',n<5?'disabled':''):'<div class="notice">Waiting for the host to start...</div>'}
 </div>
 ${b('↩ LEAVE ROOM & RETURN TO MENU','exit-room','ghost wide')}
 </div>`,'');
}
function roleReveal(){const roles={mafia:['🔪','MAFIA','Work with your Mafia teammates to eliminate the town. Your team is known to you; keep it secret.'],doctor:['🩺','DOCTOR','Save one living player each night. You may protect yourself, but not the same player twice in a row.'],detective:['🔎','DETECTIVE','Investigate one player each night. You privately learn whether they are Mafia or Innocent.'],civilian:['🏘️','CIVILIAN','Catch the sheep at night. During the day, find and vote out the Mafia.']};const [icon,title,desc]=roles[state.role];shell(header('YOUR SECRET ROLE')+`<div class="stack"><p class="muted center">Keep your phone private. Hold the card to reveal your role.</p><div class="role-card"><div class="role-icon">${icon}</div><h2>${title}</h2><p style="max-width:290px;margin:auto">${desc}</p>${!revealed?'<div id="role-cover" class="private-cover"><span class="lock">🔒</span><h3>HOLD TO REVEAL</h3><p class="muted small">Keep your role a secret</p></div>':''}</div>${state.role==='mafia'&&revealed?`<div class="panel"><h3>Your Mafia team</h3><p class="muted small">Your teammates will be visible during the night phase.</p></div>`:''}${b('I’M READY','ready','primary wide',state.selfReady?'disabled':'')}${state.selfReady?`<p class="center muted small">Waiting for others: ${state.roleReadyCount}/${state.players.filter(p=>!p.left).length} ready</p>`:''}</div>`);if(!revealed)setupHold();}
function setupHold(){const cover=$('#role-cover');if(!cover)return;let hold=null;const release=()=>{clearTimeout(hold);hold=null};cover.addEventListener('pointerdown',e=>{e.preventDefault();hold=setTimeout(()=>{revealed=true;draw()},600)});['pointerup','pointercancel','pointerleave'].forEach(e=>cover.addEventListener(e,release));}
function aliveOthers(extra=()=>true){return state.players.filter(p=>p.alive&&extra(p))}
function night(){const role=state.role;if(!state.alive)return spectator();let timer=`<div class="panel center"><span class="tag">🌙 ${nightLabel(state.day)}</span><div class="clock" data-clock>—</div>${state.mafiaExtension?'<div class="notice error">The Mafia have 30 extra seconds to agree on a victim.</div>':'<p class="muted small">Secret actions are happening simultaneously.</p>'}</div>`;
 let inner='';
 if(role==='civilian')inner=state.dreamDone?waiting('Your dream is complete. Wait for sunrise.'): `<div class="panel stack"><h3>🐑 DREAM MODE</h3><p class="muted small">Catch the wandering sheep, then tap Kill. Your dream does not affect the game.</p><div class="sheep-zone">${sheepCaught?'<button class="sheep found" type="button">🐑</button>':'<button type="button" class="sheep" data-action="catch" aria-label="Catch the sheep">🐑</button>'}</div>${b('🔪 KILL SHEEP','dream','primary wide',!sheepCaught?'disabled':'')}</div>`;
 else if(role==='mafia'){
 const choices=state.mafiaChoices||[],agree=choices.length>0&&choices.every(c=>c.target&&c.target===choices[0].target),allConfirm=agree&&choices.every(c=>c.confirmed),team=choices.map(c=>`<div class="list-row"><b class="no-localize">${esc(c.name)}${c.id===state.myId?' (you)':''}</b><span class="muted small">${c.target?esc(state.players.find(p=>p.id===c.target)?.name||'Unknown'):'Not selected'} ${c.confirmed?'✓':''}</span></div>`).join('');
 inner=`<div class="panel stack"><div class="spread"><h3>🔪 SELECT A VICTIM</h3><span class="tag red">MAFIA ONLY</span></div><p class="muted small">All Mafia members can see one another's choices. Everyone must select the same victim and confirm.</p>${state.myConfirmed?`<div class="notice good">Your kill is confirmed. Waiting for the rest of the town.</div>`:`<div class="player-grid targets">${aliveOthers(p=>!choices.some(c=>c.id===p.id)).map(p=>playerCard(p,true,choices.filter(c=>c.target===p.id).map(c=>c.name).join(', '))).join('')}</div>`}<div class="panel soft"><h3>Mafia selections</h3>${team}</div>${!agree?'<div class="notice error">Mafia haven’t agreed on a victim.</div>':allConfirm?'<div class="notice good">All Mafia confirmed the kill.</div>':'<div class="notice good">All Mafia chose the same player. Confirm to lock in the kill.</div>'}${!state.myConfirmed?b('CONFIRM KILL','confirm','primary wide',!agree?'disabled':''):''}<div><button class="btn ghost wide" data-action="toggle-chat">💬 PRIVATE MAFIA CHAT ${chatExpanded?'▲':'▼'}</button>${chatExpanded?`<div class="chat-scroll" id="chat-scroll">${(state.mafiaChat||[]).map(m=>`<div class="chat-msg"><b>${esc(m.name)}:</b> ${esc(m.text)}</div>`).join('')||'<p class="muted tiny">No messages yet.</p>'}</div><form id="chat-form" class="chat-send"><input id="chat-input" class="field" maxlength="300" placeholder="Message your team" value="${esc(chatDraft)}"/><button class="btn mini gold-btn" type="submit">SEND</button></form>`:''}</div></div>`;
 }else if(role==='doctor'||role==='detective'){
 const verb=role==='doctor'?'PROTECT':'INVESTIGATE',icon=role==='doctor'?'🩺':'🔎';
 inner=`<div class="panel stack"><div class="spread"><h3>${icon} ${verb} SOMEONE</h3><span class="tag">PRIVATE</span></div><p class="muted small">${role==='doctor'?'Choose someone to save from the Mafia tonight. You cannot choose the same person on consecutive nights.':'Learn whether one living player is Mafia or Innocent. Your result is private.'}</p>${state.myConfirmed?waiting('Your action is confirmed.'): `<div class="player-grid targets">${aliveOthers(p=>role==='doctor'?p.id!==state.myDoctorPrevious:p.id!==state.myId).map(p=>playerCard(p,true)).join('')}</div>`}${state.myResult?`<div class="notice ${state.myResult.verdict==='MAFIA'?'error':'good'}">${detectiveVisible?`${esc(state.myResult.targetName)} ${lang==='ar'?'هو':lang==='fr'?'est':lang==='es'?'es':'is'} <b>${tt(state.myResult.verdict)}</b>.`:'Investigation complete. Result is hidden.'}</div>${b(detectiveVisible?'HIDE RESULT':'TAP TO REVEAL RESULT','reveal-result','ghost wide')}`:''}${!state.myConfirmed?b(`CONFIRM ${verb}`,'confirm','primary wide',!selected?'disabled':''):''}</div>`;
 }
 shell(header('NIGHT FALLS',`<span class="tag">${state.day===1?tt('FIRST NIGHT'):nightLabel(state.day)}</span>`)+`<div class="stack">${timer}${inner}</div>`,'');
 if(chatExpanded){const log=$('#chat-scroll');if(log)log.scrollTop=log.scrollHeight;}
}
function waiting(msg){return `<div class="notice good center">✓ ${esc(msg)}</div>`}
function spectator(){shell(header('SPECTATOR')+`<div class="panel stack center"><h2>YOU'VE BEEN ELIMINATED</h2><p class="muted">You can watch the public game, but cannot act or vote. Your role stays secret until the game ends.</p><div class="clock" data-clock>—</div><p class="muted">Current phase: ${esc(state.phase.toUpperCase())}</p></div>`)}
const stories=[['tried doing a backflip off a balcony, forgetting they had never learned how to backflip','a doctor arrived just in time, apparently equipped with a very large pillow'],['challenged a refrigerator to a wrestling match and somehow lost','the doctor saved the day with an emergency defrost setting'],['slipped on a banana peel and performed an unforgettable flying somersault','the doctor caught them with a conveniently placed mattress'],['attempted to outrun their own shadow and ran straight into a lamppost','the doctor spotted the disaster and arrived with a first-aid kit'],['tried to impress a pigeon by jumping from a roof','the doctor happened to be nearby and broke their fall']];
const localizedStories={
 ar:[['حاول أداء شقلبة من الشرفة رغم أنه لم يتعلم الشقلبات قط','وصل الطبيب في الوقت المناسب ومعه وسادة عملاقة'],['تحدى الثلاجة في مباراة مصارعة وخسر بطريقة غامضة','أنقذ الطبيب الموقف باستخدام زر إذابة الثلج'],['انزلق على قشرة موز وطارت به شقلبة لا تُنسى','أمسكه الطبيب بمرتبة كانت في المكان المناسب'],['حاول الهرب من ظله فاصطدم بعمود إنارة','لاحظ الطبيب الكارثة ووصل بحقيبة الإسعاف'],['حاول إبهار حمامة بالقفز من سطح','كان الطبيب قريباً وأمسكه قبل سقوطه']],
 fr:[["a tenté un salto depuis un balcon sans avoir jamais appris à en faire","le médecin est arrivé à temps avec un coussin géant"],["a défié un réfrigérateur à la lutte et a perdu","le médecin l'a sauvé avec un dégivrage d'urgence"],["a glissé sur une peau de banane et exécuté une pirouette mémorable","le médecin l'a rattrapé avec un matelas"],["a essayé de courir plus vite que son ombre et s'est écrasé contre un lampadaire","le médecin est arrivé avec sa trousse de secours"],["a tenté d'impressionner un pigeon en sautant d'un toit","le médecin se trouvait à côté et l'a rattrapé"]],
 es:[["intentó hacer una voltereta desde un balcón sin haber aprendido a hacerla","el doctor llegó a tiempo con un cojín gigante"],["desafió a una nevera a luchar y perdió","el doctor lo salvó con un descongelado de emergencia"],["resbaló con una cáscara de plátano y dio una pirueta inolvidable","el doctor lo atrapó con un colchón"],["intentó huir de su sombra y chocó contra una farola","el doctor llegó con un botiquín"],["intentó impresionar a una paloma saltando desde un tejado","el doctor estaba cerca y frenó la caída"]]
};
function getStory(day){return (localizedStories[lang]||stories)[(day-1)%stories.length];}
function announcementText(ann,story){
 if(ann.kind==='none')return {title:tt('NOBODY DIED!'),line:tt('The town woke up to a strange silence. Somehow, everyone survived the night.'),sub:tt('Nobody was killed last night.')};
 const name=esc(ann.name),saved=ann.kind==='saved';
 if(lang==='ar')return {title:tt(saved?'SAVED BY THE DOCTOR!':'TRAGIC NEWS!'),line:`يبدو أن شخصاً ما ${story[0]}.`,sub:saved?`كان ${name}، ولكن ${story[1]}!`:`للأسف، مات ${name}.`};
 if(lang==='fr')return {title:tt(saved?'SAVED BY THE DOCTOR!':'TRAGIC NEWS!'),line:`Quelqu'un ${story[0]}.`,sub:saved?`C'était ${name}, mais ${story[1]} !`:`Malheureusement, ${name} est mort.`};
 if(lang==='es')return {title:tt(saved?'SAVED BY THE DOCTOR!':'TRAGIC NEWS!'),line:`Alguien ${story[0]}.`,sub:saved?`Era ${name}, pero ${story[1]}. ¡Se salvó!`:`Por desgracia, ${name} murió.`};
 return {title:saved?'SAVED BY THE DOCTOR!':'TRAGIC NEWS!',line:`Someone ${story[0]}.`,sub:saved?`It was ${name}, but ${story[1]}!`:`Unfortunately, ${name} has died.`};
}
function sunrise(){
 const ann=state.lastAnnouncement||{kind:'none'};
 const story=getStory(state.day);
 const {title,line,sub}=announcementText(ann,story);
 shell(header('THE SUN RISES')+`<div class="stack"><div class="paper center stack"><p class="tiny">${tt('THE DAILY TOWN GAZETTE')} · ${dayLabel(state.day)}</p><h2>${title}</h2><div style="font-size:60px">${ann.kind==='none'?'🌅':ann.kind==='saved'?'🩺':'📰'}</div><p>${line}</p><h3>${sub}</h3></div><div class="notice center">The town will gather to discuss in <b data-clock>—</b></div></div>`)
}
function discussion(){const count=state.earlyReadyCount,need=state.players.filter(p=>p.alive).length;
 shell(header('TOWN DISCUSSION')+`<div class="stack"><div class="panel stack center"><span class="tag">☀️ ${dayLabel(state.day)}</span><h2>WHO CAN YOU TRUST?</h2><div class="clock" data-clock>—</div><p class="muted">Discuss your suspicions out loud with the other players.</p></div>${state.day===1?'<div class="notice">💡 Day 1: You have very little evidence. You can skip voting, but doing so gives the Mafia another night. Choose wisely!</div>':''}<div class="panel stack"><h3>Surviving townspeople</h3><div class="player-grid">${state.players.filter(p=>p.alive).map(p=>playerCard(p)).join('')}</div></div>${state.alive?`<div class="panel stack"><p class="muted small">If every surviving player agrees, discussion ends early and voting begins.</p><div class="spread"><b>Ready to vote</b><b class="gold">${count}/${need}</b></div>${b(state.earlyReady?'WITHDRAW READY STATUS':'END DISCUSSION EARLY', 'early',state.earlyReady?'ghost wide':'gold-btn wide')}</div>`:''}</div>`,'');}
function voting(){if(!state.alive)return spectator();
 shell(header('TIME TO VOTE')+`<div class="stack"><div class="panel center stack"><span class="tag">⚖️ ${dayVotingLabel(state.day)}</span><div class="clock" data-clock>—</div><p class="muted small">A player needs more than half of all surviving players' votes to be eliminated. Votes stay hidden until the results.</p></div>${state.myVoteDone?`<div class="panel center stack"><h2>VOTE SUBMITTED ✓</h2><p class="muted">Waiting for the remaining players...</p></div>`:`<div class="panel stack"><h3>Choose your suspect</h3><div class="player-grid targets">${aliveOthers(p=>p.id!==state.myId).map(p=>playerCard(p,true)).join('')}</div>${b('CONFIRM VOTE','vote','primary wide',!selected?'disabled':'')}${b('SKIP VOTE','skip-vote','ghost wide')}</div>`}</div>`,'');}
function results(){const v=state.votes;const eliminated=state.players.find(p=>p.id===v?.eliminatedId);
 shell(header('THE VERDICT')+`<div class="stack"><div class="banner"><h2>${eliminated?`<span class="no-localize">${esc(eliminated.name)}</span> ${tt('WAS ELIMINATED!')}`:'NO MAJORITY!'}</h2><p>${eliminated?'The town has voted. Their secret role remains hidden.':'Nobody received enough votes to be eliminated.'}</p></div><div class="panel stack"><div class="spread"><h3>WHO VOTED FOR WHOM</h3><span class="pill">${v?.required||0} needed</span></div>${(v?.votes||[]).map(x=>`<div class="result-vote"><b class="no-localize">${esc(x.voterName)}</b><span>${x.targetName?`→ <span class="no-localize">${esc(x.targetName)}</span>`:tt('→ SKIPPED')}</span></div>`).join('')}<div class="notice"><span>${eliminated?'One player was eliminated.':'The town will enter another night.'}</span> <span>Next phase in</span> <b data-clock>—</b>.</div></div></div>`,'');}
function gameover(){const civilian=state.outcome==='civilian';const stats=state.gameStats||{roles:[],history:[]};
 shell(header('GAME OVER')+`<div class="stack"><div class="banner stack"><div style="font-size:67px">${civilian?'🏆':'🔪'}</div><h2 class="${civilian?'sage':'red'}">${civilian?'CIVILIANS HAVE WON!':'MAFIA HAVE WON!'}</h2><p>${civilian?'Civilians have won, there are no more mafia left!':'The Mafia have taken control of the town.'}</p></div><div class="panel stack"><h3>THE TRUTH REVEALED</h3><div class="player-grid">${state.players.map(p=>playerCard(p,false,stats.roles.find(x=>x.id===p.id)?.role?.toUpperCase()||'')).join('')}</div></div><div class="panel stack"><h3>GAME HISTORY</h3>${stats.history.map(h=>`<div class="list-row"><span class="muted small">${h.day?dayLabel(h.day):tt('Game')} · ${tt(h.type)}</span><span class="small">${typeof h.detail==='string'?esc(h.detail):h.type==='night'?esc(h.detail.outcome==='none'?tt('Nobody died'):`${h.detail.target}: ${tt(h.detail.outcome)}`):h.type==='vote'?esc(h.detail.eliminated?`${h.detail.eliminated} ${tt('eliminated')}`:tt('No majority')):'—'}</span></div>`).join('')}</div>${state.hostId===state.myId?b('↻ PLAY AGAIN — SAME CREW','again','primary wide'):'<div class="notice center">Waiting for the host to start another game...</div>'}${b('↩ EXIT TO MAIN MENU','exit-room','ghost wide')}<a class="btn ghost wide donate-end" href="${PATREON_URL}" rel="noopener noreferrer" target="_blank">♥ SUPPORT THE CREATOR</a><p class="center muted small">All players keep their names and avatars. Roles will be assigned randomly next time.</p></div>`,'');}
function updateClocks(){document.querySelectorAll('[data-clock]').forEach(el=>el.textContent=clock())}
async function poll(){if(!session||freeze||modalContext)return;const current=session, version=sessionVersion;try{const next=await api({...current,type:'state'});if(version!==sessionVersion)return;networkErrors=0;const phaseChanged=!state||next.phase!==state.phase;const comparable=x=>JSON.stringify({...x,serverTime:0,deadline:x.deadline});const changed=phaseChanged||comparable(next)!==comparable(state);state=next;clockOffset=state.serverTime-Date.now();if(phaseChanged){selected=state.phase==='night'?(state.myTarget||null):null;revealed=false;detectiveVisible=false;sheepCaught=false;chatExpanded=false;}
 if(changed){const editing=document.activeElement&&['chat-input','name','roomcode'].includes(document.activeElement.id);if(editing&& !phaseChanged){updateClocks()}else draw();}else updateClocks();}
 catch(e){if(version!==sessionVersion)return;if(sessionError(e))return;networkErrors++;if(networkErrors===4)toast('Connection lost. Trying to reconnect…');}}
function startPolling(){if(timerId)return;timerId=setInterval(()=>{poll();updateClocks()},1300)}
app.addEventListener('input',e=>{if(e.target.id==='name')draftName=e.target.value;if(e.target.id==='roomcode')draftCode=e.target.value.toUpperCase();if(e.target.id==='chat-input')chatDraft=e.target.value;if(['s-capacity','s-night','s-discussion','s-vote'].includes(e.target.id))refreshSettingsPreview();});
app.addEventListener('submit',async e=>{
 if(e.target.id==='chat-form'){
  e.preventDefault();if(chatDraft.trim()){const message=chatDraft;chatDraft='';await send('chat',{message});}
 }
 if(e.target.id==='bug-form'){
  e.preventDefault();if(reportSending)return;
  const id=window.MAFIA_CONFIG?.formspreeId||'';
  if(!/^[a-zA-Z0-9]{6,32}$/.test(id)){toast(tt('Bug reporting is not connected yet. The creator needs to add a Formspree form ID.'));return;}
  if($('#bug-company')?.value)return;
  const description=($('#bug-description')?.value||'').trim();
  if(description.length<10){toast(tt('Tell us what went wrong and what you were doing when it happened...'));return;}
  const btn=e.target.querySelector('[type=submit]');reportSending=true;btn.disabled=true;btn.textContent=tt('SENDING...');
  const payload={category:$('#bug-category').value,message:description,email:$('#bug-email').value.trim(),website:'Mafia Lobby',version:APP_VERSION,language:lang,page:'bug-report',browser:navigator.userAgent,platform:navigator.platform||'unknown',submittedAt:new Date().toISOString(),_subject:'Mafia Lobby — new bug report'};
  try{
   const response=await fetch(`https://formspree.io/f/${id}`,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify(payload)});
   if(!response.ok)throw Error('Could not send. Please try again.');
   route='home';draw();toast(tt('Thanks! Your report has been sent.'));
  }catch(err){toast(tt('Could not send. Please try again.'));btn.disabled=false;btn.textContent=tt('SUBMIT BUG REPORT');}
  finally{reportSending=false;}
 }
});
app.addEventListener('change',e=>{
 if(e.target.id==='lang-picker'){
  const next=e.target.value;if(!['en','ar','fr','es'].includes(next))return;
  lang=next;localStorage.setItem(LANG_KEY,next);draw();return;
 }
 if(['s-capacity','s-night','s-discussion','s-vote'].includes(e.target.id))refreshSettingsPreview();
});
app.addEventListener('click',async e=>{let btn=e.target.closest('[data-action]');if(!btn||btn.disabled)return;const action=btn.dataset.action;
 try{
 switch(action){
 case'home':resetSession();break;
 case'support-dismiss':rememberSupport();modalContext=null;$('#support-overlay')?.remove();break;
 case'support-visit':rememberSupport();modalContext=null;$('#support-overlay')?.remove();window.open(PATREON_URL,'_blank','noopener,noreferrer');break;
 case'rules':route='rules';draw();break;
 case'report':route='report';draw();break;
 case'host':authMode='create';route='avatar';draw();break;
 case'join-route':route='join';draw();break;
 case'join-avatar':draftCode=($('#roomcode')?.value||'').trim().toUpperCase();if(!/^[A-F0-9]{6}$/.test(draftCode))throw Error('Enter a valid six-character room code.');authMode='join';route='avatar';draw();break;
 case'editor-back':route=authMode==='join'?'join':'home';draw();break;
 case'tab':draftName=$('#name')?.value||draftName;avatarTab=btn.dataset.value;draw();break;
 case'option':draftName=$('#name')?.value||draftName;draftAvatar[avatarTab]=Number(btn.dataset.value);saveAvatar();draw();break;
 case'random':draftName=$('#name')?.value||draftName;for(const [k] of categories)draftAvatar[k]=Math.floor(Math.random()*opts[k].length);saveAvatar();draw();break;
 case'exit-room':showConfirm('exit');break;
 case'cancel-match':showConfirm('cancel');break;
 case'kick-player':showConfirm('kick',btn.dataset.id);break;
 case'cancel-confirm':modalContext=null;$('#confirm-overlay')?.remove();break;
 case'do-confirm':{
   const context=modalContext;modalContext=null;$('#confirm-overlay')?.remove();
   if(!context)break;
   if(context.type==='exit')await leaveRoom();
   else if(context.type==='kick')await send('kick',{target:context.target});
   else if(context.type==='cancel')await send('cancelMatch');
   break;
 }
 case'enter':{
  draftName=($('#name')?.value||draftName).trim();if(!draftName)throw Error('Enter your name first.');saveAvatar();
  const data=authMode==='create'?{type:'create',name:draftName,avatar:draftAvatar}:{type:'join',code:draftCode,name:draftName,avatar:draftAvatar};
  const created=await api(data);session={code:created.code,token:created.token};localStorage.setItem(STORE,JSON.stringify(session));state=await api({...session,type:'state'});clockOffset=state.serverTime-Date.now();route='game';selected=null;draw();startPolling();break;
 }
 case'copy':{try{await navigator.clipboard.writeText(state.code);toast('Room code copied!')}catch{toast('Room code: '+state.code)}break;}
 case'settings':{
  const settings={};for(const k of ['capacity','mafia','doctors','night','discussion','vote'])settings[k]=Number($('#s-'+k).value);settings.detective=$('#s-detective').value==='true';await send('settings',{settings});break;
 }
 case'start':await send('start');break;
 case'ready':await send('ready');break;
 case'select':selected=btn.dataset.id;if(state?.phase==='night')await send('target',{target:selected});else draw();break;
 case'confirm':await send('confirm');break;
 case'catch':sheepCaught=true;draw();break;
 case'dream':await send('dream');break;
 case'toggle-chat':chatExpanded=!chatExpanded;draw();break;
 case'reveal-result':detectiveVisible=!detectiveVisible;draw();break;
 case'early':await send('early',{ready:!state.earlyReady});break;
 case'vote':if(!selected)throw Error('Choose a player.');await send('vote',{target:selected});break;
 case'skip-vote':await send('vote',{target:null});break;
 case'again':await send('again');break;
 default:break;
 }
 }catch(err){toast(err.message)}
});
if(session){api({...session,type:'state'}).then(s=>{state=s;clockOffset=state.serverTime-Date.now();draw();startPolling()}).catch(e=>{resetSession(e.message)})}else draw();
