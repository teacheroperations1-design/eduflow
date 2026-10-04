/* ================================================================
🎪 Fun Center V6 — النسخة الكاملة المطوّرة
• 14 قالب شغالين فعلياً: قلوب/بالونات/سباق/اكتب/كروت/عجلة/مطابقة/ترتيب/سباق نقاط/طريق/قنّاص/متاهة/برج/زعيم
• عدّاد افتتاحي 3-2-1-GO + تلميحات 💡 + كتم 🔇 + صعوبة بتأثر (أرواح/وقت)
• الثيم والألوان والتأثيرات بتتطبق على اللعبة نفسها مش بس الإعدادات
• كومبو 🔥 وبونص سلسلة 📈 شغالين من إعدادات القالب
• Wizard منظم 5 خطوات + معاينة حية + استيراد بالجملة + صور من الجهاز
================================================================ */
(function(){
"use strict";
function db(){return (window.DataService&&DataService._getData)?DataService._getData():{};}
function saveD(d){if(DataService._saveData)DataService._saveData(d);}
function cur(){try{return (typeof currentUser!=='undefined'&&currentUser)?currentUser:((window.AuthService&&AuthService.getCurrentUser)?AuthService.getCurrentUser():null);}catch(e){return null;}}
function cloud(col,o,del){try{if(window.FirebaseService&&FirebaseService._db){if(del)FirebaseService.deleteDoc(col,o.id);else FirebaseService.saveDoc(col,o.id,o);}}catch(e){}}
var TPL={
hearts:{i:'❤️',n:'تحدي القلوب',pv:'pv-heart',desc:'أرواح بتقل مع كل غلطة',cat:'classic',diff:1},
balloons:{i:'🎈',n:'فرقعة البالونات',pv:'pv-bal',desc:'فرقع الإجابة الصحيحة',cat:'classic',diff:1},
race:{i:'⏱️',n:'سباق الزمن',pv:'pv-timer',desc:'عدّاد تنازلي لكل سؤال',cat:'speed',diff:2},
type:{i:'✍️',n:'اكتب الإجابة',pv:'pv-heart',desc:'كتابة حرة بتسامح ذكي',cat:'classic',diff:2},
flip:{i:'🃏',n:'كروت المطابقة',pv:'pv-card',desc:'ذاكرة قلب الكروت',cat:'memory',diff:2},
wheel:{i:'🎡',n:'عجلة الحظ',pv:'pv-wheel',desc:'لف واكسب سؤالك',cat:'luck',diff:1},
match:{i:'🔗',n:'وصّل الأزواج',pv:'pv-card',desc:'طابق سؤال بجوابه',cat:'memory',diff:2},
sort:{i:'📊',n:'رتّب بالترتيب',pv:'pv-timer',desc:'رتّب العناصر صح',cat:'logic',diff:2},
rush:{i:'🏃',n:'سباق النقاط',pv:'pv-timer',desc:'أكبر نقاط في وقت كلي',cat:'speed',diff:3},
path:{i:'🗺️',n:'طريق المغامرة',pv:'pv-heart',desc:'خريطة خطوات وفخاخ',cat:'adventure',diff:3},
target:{i:'🎯',n:'القنّاص',pv:'pv-bal',desc:'أهداف متحركة اصطاد الصح',cat:'action',diff:3},
maze:{i:'🌀',n:'متاهة الأبواب',pv:'pv-wheel',desc:'اختار الباب الصح',cat:'adventure',diff:3},
tower:{i:'🏰',n:'برج التحديات',pv:'pv-heart',desc:'اصعد طابق طابق',cat:'adventure',diff:3},
boss:{i:'👹',n:'مواجهة الزعيم',pv:'pv-bal',desc:'هزم الزعيم بإجاباتك',cat:'action',diff:3}
};
var TSET={
hearts:{lives:3,regen:0},balloons:{lives:3,speed:1},race:{lives:3,perQ:20,bonus:2},type:{lives:3,tolerant:1,hint:0},
flip:{lives:3,pairs:6,peek:2},wheel:{lives:3,seg:8},match:{lives:3,pairs:6},sort:{lives:3,items:4},
rush:{total:60,per:2,minus:1},path:{lives:3,steps:10,traps:2},target:{lives:3,speed:2},
maze:{lives:3,levels:5},tower:{lives:3,floors:8},boss:{lives:3,bossHP:5}
};
var TLAB={
lives:'❤️ الأرواح',regen:'♻️ روح كل كم كومبو',speed:'💨 سرعة الحركة',perQ:'⏱️ ثانية لكل سؤال',
bonus:'⚡ بونص الثواني',tolerant:'🤝 تجاهل الإملائي',hint:'💡 تلميح أول حرف',pairs:'🃏 عدد الأزواج',
peek:'👀 ثواني نظرة خاطفة',seg:'🎡 أقصى مقاطع',items:'📊 عناصر الترتيب',total:'⏳ الوقت الكلي (ث)',
per:'⭐ نقاط الصح',minus:'💥 خصم الغلط',steps:'👣 خطوات الخريطة',traps:'🕳️ عدد الفخاخ',
levels:'🌀 عدد الأبواب',floors:'🏢 عدد الطوابق',bossHP:'👹 صحة الزعيم'
};
var PALETTE=['#ef4444,#f97316,#facc15','#22c55e,#10b981,#84cc16','#3b82f6,#6366f1,#8b5cf6','#ec4899,#f472b6,#fb7185','#f59e0b,#d97706,#b45309','#06b6d4,#0ea5e9,#22d3ee'];
function colorSwatches(curVal){var v=curVal||PALETTE[2];return '<div class="fc-color-picker">'+PALETTE.map(function(p){return '<button type="button" class="fc-color-swatch '+(p===v?'selected':'')+'" style="background:linear-gradient(135deg,'+p+');" onclick="window.fcPickColors(\''+p+'\',this)"></button>';}).join('')+'<input type="hidden" id="fcColors" value="'+v+'"></div>';}
window.fcPickColors=function(p,btn){var inp=document.getElementById('fcColors');if(inp)inp.value=p;if(btn&&btn.parentNode)btn.parentNode.querySelectorAll('.fc-color-swatch').forEach(function(b){b.classList.remove('selected');});if(btn)btn.classList.add('selected');SND.click();fcPrevUpdate();};
var THEMES={
classic:{name:'كلاسيكي',bg:'radial-gradient(circle at 50% 30%,#1e2447,#0b0e1a 70%)'},
fun:{name:'مرح',bg:'linear-gradient(135deg,#831843,#4c1d95)'},
speed:{name:'سرعة',bg:'linear-gradient(135deg,#14532d,#713f12)'},
minimal:{name:'هادئ',bg:'linear-gradient(135deg,#1e1b4b,#312e81)'},
adventure:{name:'مغامرة',bg:'linear-gradient(135deg,#3b0764,#831843)'},
action:{name:'أكشن',bg:'linear-gradient(135deg,#7f1d1d,#7c2d12)'},
neon:{name:'نيون',bg:'radial-gradient(circle at 20% 20%,#0f2027,#203a43 45%,#2c5364)'},
space:{name:'فضاء',bg:'radial-gradient(circle at 70% 20%,#000428,#004e92)'},
ocean:{name:'محيط',bg:'linear-gradient(180deg,#0f2027,#2c5364)'},
candy:{name:'حلويات',bg:'linear-gradient(135deg,#7b4397,#dc245f)'},
forest:{name:'غابة',bg:'linear-gradient(135deg,#134e5e,#71b280)'},
gold:{name:'ذهبي',bg:'linear-gradient(135deg,#3e2723,#8d6e63 60%,#4e342e)'}
};
function gs_(game,key,def){var s=game.settings||{};return s[key]!=null?s[key]:def;}
function gp_(game,key,def){var g=game.gameplay||{};return g[key]!=null?g[key]:def;}
function colsOf(game){var c=((game.settings&&game.settings.colors)||(game.visual&&game.visual.colors)||'');var arr=String(c).split(',').filter(function(x){return x&&x.charAt(0)==='#';});return arr.length?arr:['#6366f1','#8b5cf6','#ec4899','#22d3ee'];}
function themeOf(game){return (game.visual&&game.visual.theme)||(game.settings&&game.settings.theme)||'classic';}

/* ========== 🔊 الصوت + كتم ========== */
var AC=null,MUTED=false;
function ac(){try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC&&AC.state==='suspended')AC.resume();return AC;}catch(e){return null;}}
function tone(f0,f1,dur,type,vol,delay){if(MUTED)return;var c=ac();if(!c)return;try{var t=c.currentTime+(delay||0);var o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.15,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+0.05);}catch(e){}}
var SND={click:function(){tone(600,900,.08,'triangle',.07);},ok:function(){tone(523,0,.09,'square',.09);tone(659,0,.09,'square',.09,.09);tone(784,0,.14,'square',.09,.18);},no:function(){tone(220,110,.28,'sawtooth',.12);},win:function(){[523,659,784,1046,1318].forEach(function(f,i){tone(f,0,.2,'triangle',.12,i*.11);});},lose:function(){[392,330,262,196].forEach(function(f,i){tone(f,0,.24,'sine',.12,i*.16);});},tick:function(){tone(1100,0,.03,'square',.05);},spin:function(){tone(280,640,.07,'square',.06);},hint:function(){tone(880,1320,.15,'sine',.1);}};
window.fcToggleMute=function(){MUTED=!MUTED;var b=document.getElementById('fcMuteBtn');if(b)b.textContent=MUTED?'🔇':'';if(!MUTED)SND.click();};

/* ========== 🎨 CSS ========== */
if(!document.getElementById('fcCss')){var st=document.createElement('style');st.id='fcCss';st.textContent=
'@keyframes fcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}'+
'@keyframes fcShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(10px)}60%{transform:translateX(-7px)}80%{transform:translateX(7px)}}'+
'@keyframes fcPop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}'+
'@keyframes fcBurst{0%{transform:scale(1);opacity:1}100%{transform:scale(1.9);opacity:0}}'+
'@keyframes fcConf{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}'+
'@keyframes fcPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}'+
'@keyframes fcSpin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}'+
'@keyframes fcFlipD{0%,40%{transform:rotateY(0)}60%,100%{transform:rotateY(180deg)}}'+
'@keyframes fcRun{0%{width:100%}100%{width:0}}'+
'@keyframes fcQuake{0%,100%{transform:translate(0,0)}10%{transform:translate(-9px,5px)}20%{transform:translate(9px,-5px)}30%{transform:translate(-7px,-4px)}40%{transform:translate(7px,4px)}50%{transform:translate(-5px,3px)}60%{transform:translate(5px,-3px)}70%{transform:translate(-3px,-2px)}80%{transform:translate(3px,2px)}90%{transform:translate(-1px,1px)}}'+
'.fc-quake{animation:fcQuake .5s;}'+
'@keyframes fcFw{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.15);opacity:0}}'+
'.fc-fw{position:fixed;width:12px;height:12px;border-radius:50%;z-index:99999;animation:fcFw .95s ease-out forwards;pointer-events:none;}'+
'@keyframes fcRain{0%{transform:translateY(-12vh)}100%{transform:translateY(112vh)}}'+
'.fc-rain{position:fixed;top:0;width:3px;height:18px;background:#60a5fa;opacity:.55;z-index:99998;animation:fcRain 1.5s linear forwards;pointer-events:none;border-radius:2px;}'+
'@keyframes fcDeal{from{opacity:0;transform:translateY(44px) rotate(9deg) scale(.8)}to{opacity:1;transform:none}}'+
'.fc-deal{animation:fcDeal .45s both;}'+
'@keyframes fcCombo{0%{transform:scale(.4) rotate(-12deg)}60%{transform:scale(1.4)}100%{transform:scale(1)}}'+
'.fc-combo{animation:fcCombo .4s;display:inline-block;}'+
'@keyframes fcHeartOut{0%{transform:scale(1)}45%{transform:scale(1.7) rotate(24deg)}100%{transform:scale(0)}}'+
'.fc-heartout{animation:fcHeartOut .55s forwards;display:inline-block;}'+
'@keyframes fcSlideIn{from{opacity:0;transform:translateY(26px) scale(.95)}to{opacity:1;transform:none}}'+
'@keyframes fcBgFloat{0%{transform:translateY(0) rotate(0)}100%{transform:translateY(-120vh) rotate(360deg)}}'+
'.fc-part{position:fixed;bottom:-50px;border-radius:50%;pointer-events:none;opacity:.22;animation:fcBgFloat linear infinite;}'+
'@keyframes fcPulseRed{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.6)}50%{box-shadow:0 0 0 12px rgba(239,68,68,0)}}'+
'.fc-timerlow{animation:fcPulseRed 1s infinite;border-radius:9999px;}'+
'@keyframes fcStarPop{0%{transform:scale(0) rotate(-180deg)}70%{transform:scale(1.4)}100%{transform:scale(1)}}'+
'.fc-star{display:inline-block;animation:fcStarPop .6s both;}'+
'@keyframes fcGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.45)}}'+
'@keyframes fcBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}'+
'@keyframes fcGrad{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}'+
'@keyframes fcFog{0%,100%{opacity:.5;transform:translateX(-6px)}50%{opacity:.9;transform:translateX(6px)}}'+
'@keyframes fcBossHit{0%{transform:scale(1)}30%{transform:scale(1.25) rotate(-8deg);filter:brightness(2)}100%{transform:scale(1)}}'+
'.fc-ov-anim{background-size:220% 220%!important;animation:fcGrad 8s ease infinite;}'+
'.pv-heart{display:inline-block;animation:fcPulse 1s infinite;}.pv-bal{display:inline-block;animation:fcFloat 2s infinite;}.pv-wheel{display:inline-block;animation:fcSpin 4s linear infinite;}.pv-card{display:inline-block;animation:fcFlipD 2.4s infinite;}.pv-timer{display:inline-block;width:26px;height:8px;border-radius:99px;background:#22c55e;animation:fcRun 2s linear infinite;}'+
'.fc-ov{position:fixed;inset:0;z-index:99998;background:radial-gradient(circle at 50% 30%,#1e2447,#0b0e1a 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;overflow:auto;}'+
'.fc-box{width:100%;max-width:780px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:24px;padding:22px;color:#fff;backdrop-filter:blur(8px);animation:fcSlideIn .35s ease-out;}'+
'.fc-opt{display:block;width:100%;text-align:right;padding:14px 16px;margin-bottom:10px;border:2px solid rgba(255,255,255,.25);border-radius:16px;background:rgba(255,255,255,.08);color:#fff;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;transition:all .15s;animation:fcDeal .4s both;}'+
'.fc-opt:hover{transform:translateY(-2px);background:rgba(139,92,246,.25);animation:fcGlow 1.1s infinite;}'+
'.fc-opt:disabled{opacity:.35;cursor:not-allowed;animation:none;transform:none;}'+
'.fc-opt.ok{background:#16a34a!important;border-color:#22c55e!important;animation:fcPop .4s;}'+
'.fc-opt.no{background:#dc2626!important;border-color:#ef4444!important;animation:fcShake .4s;}'+
'.fc-gate{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;border-radius:16px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.07);color:#fff;font-weight:800;font-family:inherit;font-size:14px;cursor:pointer;animation:fcDeal .4s both;position:relative;overflow:hidden;}'+
'.fc-gate::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);animation:fcFog 2.6s ease-in-out infinite;}'+
'.fc-gate:hover{border-color:#facc15;transform:translateY(-3px);}'+
'.fc-gate.ok{background:#16a34a!important;border-color:#22c55e!important;animation:fcPop .4s;}'+
'.fc-gate.no{background:#dc2626!important;border-color:#ef4444!important;animation:fcShake .4s;}'+
'.fc-bal{display:inline-flex;align-items:center;justify-content:center;width:122px;height:142px;margin:8px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:linear-gradient(180deg,#f472b6,#db2777);color:#fff;font-weight:800;font-size:14px;cursor:pointer;animation:fcFloat 2.4s ease-in-out infinite;border:none;font-family:inherit;padding:10px;text-align:center;}'+
'.fc-bal:nth-child(2n){background:linear-gradient(180deg,#60a5fa,#2563eb);animation-delay:.5s;}.fc-bal:nth-child(3n){background:linear-gradient(180deg,#4ade80,#16a34a);animation-delay:.9s;}.fc-bal:nth-child(4n){background:linear-gradient(180deg,#facc15,#d97706);animation-delay:1.3s;}'+
'.fc-bal.burst{animation:fcBurst .4s forwards;}'+
'.fc-card3d{width:112px;height:82px;perspective:600px;margin:6px;display:inline-block;cursor:pointer;animation:fcDeal .5s both;}'+
'.fc-card3d .in{width:100%;height:100%;position:relative;transform-style:preserve-3d;transition:transform .4s;}'+
'.fc-card3d.open .in{transform:rotateY(180deg);}'+
'.fc-card3d .f,.fc-card3d .b{position:absolute;inset:0;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;padding:6px;text-align:center;}'+
'.fc-card3d .f{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:26px;}'+
'.fc-card3d .b{background:#fff;color:#111;transform:rotateY(180deg);}'+
'.fc-card3d.matched .b{background:#22c55e;color:#fff;}'+
'.fc-card3d.matched{animation:fcPop .4s;}'+
'.fc-tpl{display:inline-flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;min-width:92px;border:2px solid var(--border);border-radius:16px;background:var(--surface-hover);cursor:pointer;font-size:10px;font-weight:800;text-align:center;transition:all .15s;}'+
'.fc-tpl:hover{transform:translateY(-3px);border-color:var(--primary);}'+
'.fc-tpl.sel{border-color:var(--primary);background:var(--primary-bg);color:var(--primary);box-shadow:0 6px 18px rgba(99,102,241,.25);}'+
'.fc-tpl .ic{font-size:26px;}.fc-tpl:hover .ic{animation:fcBounce .6s infinite;}'+
'.fc-conf{position:fixed;top:0;width:10px;height:14px;z-index:99999;animation:fcConf 2.6s linear forwards;}'+
'.fc-timer{height:8px;border-radius:9999px;background:rgba(255,255,255,.15);overflow:hidden;margin:8px 0;}'+
'.fc-timer div{height:100%;background:linear-gradient(90deg,#22c55e,#facc15,#ef4444);transition:width 1s linear;}'+
'.fc-dots{display:flex;gap:4px;justify-content:center;margin:6px 0;flex-wrap:wrap;}'+
'.fc-dot{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.2);}'+
'.fc-dot.ok{background:#22c55e;box-shadow:0 0 6px #22c55e;}.fc-dot.no{background:#ef4444;}.fc-dot.cur{background:#facc15;box-shadow:0 0 9px #facc15;}'+
'.fc-badge{display:inline-flex;flex-direction:column;align-items:center;gap:4px;min-width:64px;padding:8px 6px;border-radius:12px;background:var(--surface-hover);border:1px solid var(--border);font-size:10px;font-weight:700;text-align:center;}'+
'.fc-badge.unlocked{border-color:var(--primary);background:var(--primary-bg);color:var(--primary);}'+
'.fc-badge .ic{font-size:22px;}.fc-badge.locked{opacity:.45;filter:grayscale(1);}'+
'.fc-quiz-opt{display:block;width:100%;text-align:right;padding:10px 12px;margin-bottom:6px;border:1px solid var(--border);border-radius:10px;background:var(--surface-hover);cursor:pointer;font-family:inherit;font-size:13px;}'+
'.fc-quiz-opt.correct{background:var(--success-bg);border-color:var(--success);color:var(--success);font-weight:800;}'+
'.fc-quiz-opt.wrong{background:var(--danger-bg);border-color:var(--danger);color:var(--danger);}'+
'.fc-chip{padding:6px 12px;border:1px solid var(--border);border-radius:9999px;background:var(--surface-hover);cursor:pointer;font-size:11px;font-weight:800;font-family:inherit;color:inherit;}'+
'.fc-chip.sel{background:var(--primary);color:#fff;border-color:var(--primary);}'+
'.fc-mission{display:flex;gap:10px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:12px;margin-bottom:8px;background:var(--surface-hover);}'+
'.fc-mission.done{border-color:var(--success);background:var(--success-bg);}'+
'@keyframes fcDrift{from{transform:translate(0,0) rotate(-3deg)}to{transform:translate(var(--dx),var(--dy)) rotate(3deg)}}'+
'@keyframes fcHop{0%{transform:translateY(0)}40%{transform:translateY(-14px)}100%{transform:translateY(0)}}'+
'@keyframes fcSortDemo{0%,100%{transform:translateX(0)}50%{transform:translateX(14px)}}'+
'@keyframes fcTypeBlink{0%,100%{opacity:1}50%{opacity:.2}}'+
'.fc-arena{position:relative;height:250px;border:1px dashed rgba(255,255,255,.25);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.04);}'+
'.fc-target{position:absolute;left:12%;top:14%;padding:12px 18px;border-radius:9999px;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;font-weight:800;font-family:inherit;cursor:pointer;animation:fcDrift 4s ease-in-out infinite alternate;}'+
'.fc-target.no{background:#dc2626!important;animation:fcShake .4s;}'+
'.fc-target.burst2{animation:fcBurst .4s forwards;background:#16a34a!important;}'+
'.fc-path{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;margin:8px 0;}'+
'.fc-path-cell{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;}'+
'.fc-path-cell.here{background:#facc15;color:#111;box-shadow:0 0 14px #facc15;animation:fcHop .8s infinite;}'+
'.fc-path-cell.goal{background:linear-gradient(135deg,#f59e0b,#d97706);}'+
'.fc-path-cell.revealed{background:#dc2626;}'+
'.fc-path-cell.donecell{background:#16a34a;}'+
'.fc-demo-sort{animation:fcSortDemo 1.2s ease-in-out infinite;}'+
'.fc-demo-path{animation:fcHop 1s infinite;}'+
'.fc-demo-target{display:inline-block;animation:fcDrift 2.5s ease-in-out infinite alternate;--dx:40px;--dy:10px;font-size:22px;}'+
'.fc-demo-type{font-size:18px;font-weight:900;animation:fcTypeBlink 1s infinite;}'+
'.fc-settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:10px 0;}'+
'.fc-setting-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px;transition:all .2s;}'+
'.fc-setting-card:hover{border-color:var(--primary);transform:translateY(-2px);}'+
'.fc-setting-card h4{font-size:12px;margin:0 0 6px;color:var(--primary);}'+
'.fc-color-picker{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;}'+
'.fc-color-swatch{width:32px;height:32px;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:all .2s;}'+
'.fc-color-swatch:hover{transform:scale(1.1);}'+
'.fc-color-swatch.selected{border-color:#fff;box-shadow:0 0 12px currentColor;}'+
'.fc-step-indicator{display:flex;gap:8px;justify-content:center;margin:10px 0;padding:10px;background:var(--surface-hover);border-radius:12px;}'+
'.fc-step-dot{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;background:var(--surface);border:2px solid var(--border);transition:all .3s;cursor:pointer;}'+
'.fc-step-dot.active{background:var(--primary);color:#fff;border-color:var(--primary);box-shadow:0 0 20px rgba(99,102,241,.5);}'+
'.fc-step-dot.completed{background:var(--success);color:#fff;border-color:var(--success);}'+
'.fc-template-card{background:var(--surface);border:2px solid var(--border);border-radius:16px;padding:14px;cursor:pointer;transition:all .3s;position:relative;overflow:hidden;}'+
'.fc-template-card:hover{border-color:var(--primary);transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.3);}'+
'.fc-template-card.selected{border-color:var(--success);box-shadow:0 0 30px rgba(34,197,94,.4);}'+
'.fc-template-card .preview{height:96px;border-radius:12px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;font-size:44px;position:relative;overflow:hidden;}'+
'.fc-template-card .info h3{font-size:14px;margin:0 0 4px;}'+
'.fc-template-card .info p{font-size:11px;color:var(--text-muted);margin:0;}'+
'.fc-badge-new{position:absolute;top:10px;right:10px;z-index:5;background:#22c55e;color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:99px;box-shadow:0 4px 12px rgba(34,197,94,.5);animation:fcPop .3s both;}'+
'@keyframes fcPopScore{0%{transform:translate(-50%,0) scale(.6);opacity:0}20%{opacity:1}100%{transform:translate(-50%,-80px) scale(1.35);opacity:0}}'+
'.fc-pop{position:fixed;z-index:99999;font-weight:900;font-size:24px;pointer-events:none;animation:fcPopScore .9s ease-out forwards;text-shadow:0 2px 10px rgba(0,0,0,.7);}'+
'@keyframes fcFlash{0%{opacity:.55}100%{opacity:0}}'+
'.fc-flash{position:fixed;inset:0;z-index:99997;pointer-events:none;animation:fcFlash .5s ease-out forwards;}'+
'.fc-flash.ok{background:radial-gradient(circle at 50% 60%,rgba(34,197,94,.25),transparent 70%);}'+
'.fc-flash.no{background:radial-gradient(circle at 50% 60%,rgba(239,68,68,.3),transparent 70%);}'+
'@keyframes fcBorderGlow{0%,100%{box-shadow:0 0 16px var(--fca,#6366f1),0 18px 60px rgba(0,0,0,.5)}50%{box-shadow:0 0 34px var(--fca,#6366f1),0 18px 60px rgba(0,0,0,.5)}}'+
'.fc-box{border-color:var(--fca,#6366f1)!important;animation:fcSlideIn .35s ease-out,fcBorderGlow 2.4s ease-in-out infinite;}'+
'.fc-shape-pill .fc-opt,.fc-shape-pill .fc-gate{border-radius:9999px;}'+
'.fc-shape-square .fc-opt,.fc-shape-square .fc-gate{border-radius:6px;}'+
'.fc-shape-bubble .fc-opt,.fc-shape-bubble .fc-gate{border-radius:34px 10px 34px 10px;}'+
'.fc-board .fc-box{max-width:1100px;}'+
'.fc-board .fc-opt{font-size:24px;padding:22px 26px;}'+
'.fc-board .fc-gate{font-size:20px;padding:24px;}'+
'.fc-board .fc-bal{width:175px;height:200px;font-size:20px;}'+
'.fc-board .fc-target{font-size:22px;padding:18px 28px;}'+
'.fc-board .fc-card3d{width:150px;height:110px;}'+
'.fc-board .fc-path-cell{width:54px;height:54px;font-size:16px;}'+
'.fc-board .fc-timer{height:14px;}'+
'@keyframes fcMedal{0%{transform:rotateY(0) scale(.4)}60%{transform:rotateY(540deg) scale(1.2)}100%{transform:rotateY(720deg) scale(1)}}'+
'.fc-medal{display:inline-block;animation:fcMedal 1.5s ease-in-out both;font-size:66px;}'+
'@keyframes fcPod{from{height:0}to{height:var(--h)}}'+
'.fc-pod{width:50px;border-radius:8px 8px 0 0;background:linear-gradient(180deg,var(--fca,#6366f1),transparent);animation:fcPod .8s ease-out both;margin:0 4px;display:inline-block;vertical-align:bottom;}'+
'@keyframes fcSheen{0%{left:-60%}55%{left:130%}100%{left:130%}}'+
'.fc-game-card{position:relative;overflow:hidden;}'+
'.fc-game-card::after{content:"";position:absolute;top:-60%;left:-60%;width:40%;height:220%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.09),transparent);transform:rotate(20deg);animation:fcSheen 3.4s ease-in-out infinite;pointer-events:none;}'+
'.fc-gicon{width:74px;height:74px;margin:0 auto 8px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:36px;box-shadow:0 8px 22px rgba(0,0,0,.35);}'+
'.fc-bosshit{animation:fcBossHit .4s;}';
document.head.appendChild(st);}

/* ========== إعدادات + مساعدات ========== */
function cfg(){var g=(db().gamification||{});return Object.assign({quizPoints:5,streak7:10,streak14:25,streak30:60,ach:true,board:true,fact:true,mPlay:3,mQuiz:2,mWin:5},g.engagement||{});}
function saveCfg(c){var d=db();d.gamification=d.gamification||{};d.gamification.engagement=c;saveD(d);}
function gamesFrozen(){try{var f=(db().platformMeta||{}).freeze||{};return f.games===true||f.full===true;}catch(e){return false;}} function addPts(sid,pts,reason){if(gamesFrozen())return false;try{if(typeof Ops!=='undefined'&&Ops.addManualPoints){Ops.addManualPoints(sid,pts,reason,(cur()||{}).id||'system');return true;}}catch(e){}return false;}
function gradeOptions(sel){
var out=[];var lv=(typeof EduFlowConfig!=='undefined'&&EduFlowConfig.educationLevels)?EduFlowConfig.educationLevels:{};
Object.keys(lv).forEach(function(k){(lv[k].grades||[]).forEach(function(gr){out.push(gr);});});
var seen={};
return '<option value="">كل الصفوف</option>'+out.filter(function(g){if(seen[g])return false;seen[g]=1;return true;}).map(function(g){return '<option value="'+g+'" '+(g===sel?'selected':'')+'>'+g+'</option>';}).join('');
}
function gradeMatch(gv,fv){gv=String(gv||'').trim();fv=String(fv||'').trim();if(!fv)return true;if(gv===fv)return true;return gv.indexOf(fv)>=0||fv.indexOf(gv)>=0;}
function normTxt(s){return String(s||'').toLowerCase().replace(/[\u064B-\u0652]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').trim();}
function quake(){var b=document.getElementById('fcBox');if(b){b.classList.remove('fc-quake');void b.offsetWidth;b.classList.add('fc-quake');}}
function confetti(){for(var i=0;i<44;i++){var c=document.createElement('div');c.className='fc-conf';c.style.left=(Math.random()*100)+'vw';c.style.background=['#f472b6','#60a5fa','#4ade80','#facc15','#c084fc'][i%5];c.style.animationDelay=(Math.random()*0.8)+'s';document.body.appendChild(c);setTimeout(function(el){return function(){el.remove();};}(c),3300);}}
function confettiMini(){for(var i=0;i<10;i++){var c=document.createElement('div');c.className='fc-conf';c.style.left=(35+Math.random()*30)+'vw';c.style.background=['#facc15','#4ade80','#60a5fa'][i%3];document.body.appendChild(c);setTimeout(function(el){return function(){el.remove();};}(c),2700);}}
function fireworks(){for(var b=0;b<3;b++){setTimeout(function(){var x=15+Math.random()*70,y=15+Math.random()*45;for(var i=0;i<16;i++){var d=document.createElement('div');d.className='fc-fw';var a=(Math.PI*2/16)*i,dist=70+Math.random()*70;d.style.left=x+'vw';d.style.top=y+'vh';d.style.background=['#f472b6','#60a5fa','#4ade80','#facc15','#c084fc','#fb923c'][i%6];d.style.setProperty('--dx',Math.cos(a)*dist+'px');d.style.setProperty('--dy',Math.sin(a)*dist+'px');document.body.appendChild(d);setTimeout(function(el){return function(){el.remove();};}(d),1100);}},b*350);}}
function rain(){for(var i=0;i<34;i++){var r=document.createElement('div');r.className='fc-rain';r.style.left=(Math.random()*100)+'vw';r.style.animationDelay=(Math.random()*1)+'s';document.body.appendChild(r);setTimeout(function(el){return function(){el.remove();};}(r),3000);}}
function countUp(el,to){if(!el)return;var v=0,stp=Math.max(1,Math.round(to/22));var iv=setInterval(function(){v+=stp;if(v>=to){v=to;clearInterval(iv);}el.textContent=v;},40);}
function popScore(el,txt,ok){
try{
var r=el.getBoundingClientRect();
var s=document.createElement('div');s.className='fc-pop';s.textContent=txt;
s.style.left=(r.left+r.width/2)+'px';s.style.top=r.top+'px';
s.style.color=ok?'#4ade80':'#f87171';
document.body.appendChild(s);
setTimeout(function(){s.remove();},950);
}catch(e){}
}
function flash(ok){
var f=document.createElement('div');f.className='fc-flash '+(ok?'ok':'no');
document.body.appendChild(f);
setTimeout(function(){f.remove();},560);
}
document.addEventListener('click',function(e){
var b=e.target&&e.target.closest?e.target.closest('.fc-opt,.fc-gate,.fc-bal,.fc-target,.fc-card3d'):null;
if(!b)return;
setTimeout(function(){
if(b.classList.contains('ok')||b.classList.contains('burst2')||b.classList.contains('matched')){popScore(b,(window.__fcLastGain||'✓'),true);flash(true);}
else if(b.classList.contains('no')){popScore(b,'✗',false);flash(false);}
},90);
},true);

/* ========== 🧠 سؤال اليوم ========== */
function pool(){return db().dailyQuizPool||[];}
function pickQ(sid){
var u=DataService.getUserById?DataService.getUserById(sid):null;
var tch=(DataService.getStudentTeachers?DataService.getStudentTeachers(sid):[]).map(function(t){return t.teacher&&t.teacher.id;});
var list=pool().filter(function(q){return (q.owner==='center'||tch.indexOf(q.owner)>=0)&&(!q.grade||gradeMatch(u&&u.grade,q.grade));});
if(!list.length)return null;
var seed=0,key=new Date().toISOString().slice(0,10)+sid;
for(var i=0;i<key.length;i++)seed=(seed*31+key.charCodeAt(i))%997;
return list[seed%list.length];
}
function qKey(sid){return sid+'__'+new Date().toISOString().slice(0,10);}
function renderQuiz(sid){
var c=cfg(),q=pickQ(sid);if(!q)return '<div class="card" style="padding:14px;">مفيش سؤال اليوم حالياً</div>';
var at=(db().dailyQuizAttempts||{})[qKey(sid)]||null;
var h='<div class="card" style="margin-bottom:12px;padding:14px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><strong>🧠 سؤال اليوم</strong><span class="badge badge-info">+'+c.quizPoints+' نقاط</span></div><div style="font-size:14px;font-weight:700;margin-bottom:10px;">'+q.q+'</div>';
if(at){
h+=q.options.map(function(o,i){var cl='fc-quiz-opt';if(i===q.correct)cl+=' correct';else if(i===at.choice)cl+=' wrong';return '<button class="'+cl+'" disabled>'+o+(i===q.correct?' ✓':'')+'</button>';}).join('');
h+='<div class="text-xs" style="color:'+(at.correct?'var(--success)':'var(--danger)')+';">'+(at.correct?'🎉 صح! +'+c.quizPoints:'❌ غلط — الصح: '+q.options[q.correct])+'</div>';
}else{
h+=q.options.map(function(o,i){return '<button class="fc-quiz-opt" onclick="window.fcAnswer('+i+')">'+o+'</button>';}).join('');
}
return h+'</div>';
}
window.fcAnswer=function(i){
var u=cur();if(!u)return;var q=pickQ(u.id);if(!q||(db().dailyQuizAttempts||{})[qKey(u.id)])return;
var c=cfg(),ok=(i===q.correct);
var d=db();d.dailyQuizAttempts=d.dailyQuizAttempts||{};
d.dailyQuizAttempts[qKey(u.id)]={choice:i,correct:ok,at:new Date().toISOString()};
if(ok){addPts(u.id,c.quizPoints,'🧠 سؤال اليوم');SND.ok();}else SND.no();
saveD(d);
if(window.safeToast)window.safeToast(ok?('🎉 +'+c.quizPoints+' نقاط'):'❌ اتعلمت المحاولة',ok?'success':'info');
renderPtTabs();
};

/* ========== 🎯 مهام اليوم ========== */
function missionsOf(sid){
var d=db(),today=new Date().toISOString().slice(0,10),c=cfg();
var played=(d.gamePlays||[]).some(function(p){return p.sid===sid&&String(p.at||'').slice(0,10)===today;});
var quiz=!!(d.dailyQuizAttempts||{})[sid+'__'+today];
var win=(d.gamePlays||[]).some(function(p){return p.sid===sid&&String(p.at||'').slice(0,10)===today&&(p.points||0)>=(c.mWinPts||6);});
return [
{k:'m_play',i:'🎮',l:'العب لعبة واحدة اليوم',done:played,pts:c.mPlay||3},
{k:'m_quiz',i:'🧠',l:'جاوب على سؤال اليوم',done:quiz,pts:c.mQuiz||2},
{k:'m_win',i:'🏆',l:'اكسب 6 نقاط أو أكثر في لعبة',done:win,pts:c.mWin||5}
];
}
function renderMissions(sid){
var d=db(),today=new Date().toISOString().slice(0,10);
d.missionClaims=d.missionClaims||{};d.missionClaims[sid]=d.missionClaims[sid]||{};
return '<div class="card" style="padding:14px;margin-bottom:12px;"><strong>🎯 مهام اليوم</strong><div style="margin-top:8px;">'+missionsOf(sid).map(function(m){
var claimed=!!d.missionClaims[sid][m.k+'_'+today];
return '<div class="fc-mission '+(m.done?'done':'')+'"><span style="font-size:22px;">'+m.i+'</span><div style="flex:1;"><strong style="font-size:12px;">'+m.l+'</strong><div class="text-xs text-muted">+'+m.pts+' نقاط</div></div>'+(m.done?(claimed?'<span class="badge badge-success">✓ تم الاستلام</span>':'<button class="btn btn-success btn-sm" onclick="window.fcClaimMission(\''+m.k+'\')">🎁 استلم</button>'):'<span class="badge badge-muted">لسه</span>')+'</div>';
}).join('')+'</div></div>';
}
window.fcClaimMission=function(k){if(gamesFrozen()){if(window.safeToast)window.safeToast('🧊 النقاط مجمدة حالياً','info');return;}
var u=cur();if(!u)return;var d=db(),today=new Date().toISOString().slice(0,10);
d.missionClaims=d.missionClaims||{};d.missionClaims[u.id]=d.missionClaims[u.id]||{};
if(d.missionClaims[u.id][k+'_'+today])return;
var m=missionsOf(u.id).find(function(x){return x.k===k;});
if(!m||!m.done)return;
d.missionClaims[u.id][k+'_'+today]=1;saveD(d);
addPts(u.id,m.pts,'🎯 مهمة: '+m.l);SND.ok();
if(window.safeToast)window.safeToast('🎯 +'+m.pts+' نقاط مهمة','success');
renderPtTabs();
};

/* ========== 🏅 شارات + ترتيب + حقيقة ========== */
function statsOf(sid){
var d=db(),u=DataService.getUserById?DataService.getUserById(sid):null;
return {hw:(d.submissions||[]).filter(function(s){return s.studentId===sid&&s.status==='graded';}).length,
ex:(d.examAttempts||[]).filter(function(a){return a.studentId===sid&&(a.status==='approved'||a.status==='graded');}).length,
pts:(function(){try{return (typeof Ops!=='undefined'&&Ops.getStudentPoints)?Ops.getStudentPoints(sid,null,'all')||0:0;}catch(e){return 0;}})(),
streak:(u&&u.streaks&&u.streaks.attendance)||0,
quiz:Object.keys(d.dailyQuizAttempts||{}).filter(function(k){return k.indexOf(sid+'__')===0&&d.dailyQuizAttempts[k].correct;}).length,
games:(d.gamePlays||[]).filter(function(p){return p.sid===sid&&p.scored;}).length,
redeems:(d.storeOrders||d.orders||[]).filter(function(o){return o.studentId===sid;}).length};
}
var ACH=[
{k:'first_hw',i:'📝',l:'أول واجب',t:function(s){return s.hw>=1;}},
{k:'hw10',i:'📚',l:'10 واجبات',t:function(s){return s.hw>=10;}},
{k:'first_ex',i:'🎓',l:'أول امتحان',t:function(s){return s.ex>=1;}},
{k:'att7',i:'🔥',l:'حضور 7 أيام',t:function(s){return s.streak>=7;}},
{k:'att30',i:'🌟',l:'حضور 30 يوم',t:function(s){return s.streak>=30;}},
{k:'pts100',i:'🏆',l:'100 نقطة',t:function(s){return s.pts>=100;}},
{k:'pts500',i:'👑',l:'500 نقطة',t:function(s){return s.pts>=500;}},
{k:'quiz5',i:'🧠',l:'5 أسئلة صحيحة',t:function(s){return s.quiz>=5;}},
{k:'game1',i:'🎮',l:'أول لعبة',t:function(s){return s.games>=1;}},
{k:'store1',i:'🛍️',l:'أول استبدال',t:function(s){return s.redeems>=1;}}
];
function renderBadges(sid){
var c=cfg();if(!c.ach)return '';
var d=db();d.achievements=d.achievements||{};d.achievements[sid]=d.achievements[sid]||{};
var s=statsOf(sid),newly=[];
ACH.forEach(function(a){if(!d.achievements[sid][a.k]&&a.t(s)){d.achievements[sid][a.k]=new Date().toISOString();newly.push(a);}});
if(newly.length){saveD(d);setTimeout(function(){newly.forEach(function(a){if(window.safeToast)window.safeToast('🏅 إنجاز: '+a.i+' '+a.l,'success');});SND.win();},300);}
return '<div class="card" style="padding:14px;"><strong>🏅 شاراتي</strong><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">'+ACH.map(function(a){var ok=!!d.achievements[sid][a.k];return '<span class="fc-badge '+(ok?'unlocked':'locked')+'"><span class="ic">'+a.i+'</span>'+a.l+'</span>';}).join('')+'</div></div>';
}
function streakBonus(sid){if(gamesFrozen())return;
var c=cfg(),u=DataService.getUserById?DataService.getUserById(sid):null;
var s=(u&&u.streaks&&u.streaks.attendance)||0;
var d=db();d.streakBonuses=d.streakBonuses||{};d.streakBonuses[sid]=d.streakBonuses[sid]||{};
[{n:7,v:c.streak7},{n:14,v:c.streak14},{n:30,v:c.streak30}].forEach(function(m){
if(s>=m.n&&!d.streakBonuses[sid]['b'+m.n]){d.streakBonuses[sid]['b'+m.n]=1;addPts(sid,m.v,'🔥 سلسلة '+m.n+' يوم');if(window.safeToast)window.safeToast('🔥 +'+m.v+' نقطة مكافأة سلسلة','success');}
});
saveD(d);
}
function renderBoard(){
var c=cfg();if(!c.board)return '';
var today=new Date().toISOString().slice(0,10);
var rows=(DataService.getStudents?DataService.getStudents():[]).slice(0,150).map(function(s){
var p=0;(s.pointsHistory||s.history||[]).forEach(function(h){if(String(h.awardedAt||h.at||'').slice(0,10)===today)p+=(h.points||h.amount||0);});
return {s:s,p:p};
}).filter(function(r){return r.p>0;}).sort(function(a,b){return b.p-a.p;}).slice(0,5);
if(!rows.length)return '';
return '<div class="card" style="padding:14px;margin-bottom:12px;"><strong>📊 ترتيب اليوم</strong>'+rows.map(function(r,i){return '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;"><span>'+(['🥇','🥈','🥉','4.','5.'][i])+' '+r.s.name+'</span><b style="font-family:var(--font-en);color:var(--primary);">+'+r.p+'</b></div>';}).join('')+'</div>';
}
var FACTS=['💡 قلبك ينبض 100 ألف مرة يومياً!','💡 العسل مش بيبوظ أبداً!','💡 الأخطبوط عنده 3 قلوب!','💡 البرق أسخن من سطح الشمس 5 مرات!','💡 المخ بيولد كهرباء تكفي لمبة!','💡 النملة بتشيل 50 ضعف وزنها!','💡 الموز أكبر عشب في العالم!','💡 عينك تميز 10 مليون لون!'];
function renderFact(){var c=cfg();if(!c.fact)return '';var all=FACTS.concat((db().factsPool||[]).map(function(f){return f.text;}));return '<div class="card" style="padding:12px;background:var(--primary-bg);border-color:var(--primary-border);"><strong style="font-size:13px;">'+all[new Date().getDate()%all.length]+'</strong></div>';}

/* ========== 📷 صور ========== */
function readImg(file,cb){try{var r=new FileReader();r.onload=function(){var img=new Image();img.onload=function(){var s=Math.min(1,420/Math.max(img.width,img.height));var c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',0.72));};img.src=r.result;};r.readAsDataURL(file);}catch(e){cb('');}}

/* ========== 🏭 مصنع الألعاب — Wizard 5 خطوات ========== */
window._fcQ=[];window._fcTpl='hearts';window._fcImg='';window._fcStep=1;window._fcSet={};window._fcMeta={};window._fcEditG=null;window._fcVisual={};window._fcGameplay={};
function demoHtml(k){
var t=TPL[k]||{};var inner='';
if(k==='hearts')inner='<span class="pv-heart">❤️</span><span class="pv-heart" style="animation-delay:.3s">❤️</span><span class="pv-heart" style="animation-delay:.6s">🖤</span>';
else if(k==='balloons')inner='<span class="pv-bal">🎈</span><span class="pv-bal" style="animation-delay:.4s">🎈</span><span class="pv-bal" style="animation-delay:.8s">💥</span>';
else if(k==='race'||k==='rush')inner='<div class="fc-timer" style="width:180px;margin:0;"><div style="animation:fcRun 3s linear infinite;"></div></div>';
else if(k==='flip'||k==='match')inner='<span class="pv-card">🃏</span><span class="pv-card" style="animation-delay:.6s">🃏</span>';
else if(k==='wheel')inner='<span class="pv-wheel" style="font-size:34px;">🎡</span>';
else if(k==='sort')inner='<span class="fc-chip fc-demo-sort">3</span><span class="fc-chip fc-demo-sort" style="animation-delay:.2s">1</span><span class="fc-chip fc-demo-sort" style="animation-delay:.4s">2</span>';
else if(k==='path')inner='<span class="fc-demo-path">🚩</span><span class="fc-demo-path" style="animation-delay:.2s">👣</span><span class="fc-demo-path" style="animation-delay:.4s">🕳️</span><span class="fc-demo-path" style="animation-delay:.6s">👑</span>';
else if(k==='target')inner='<span class="fc-demo-target">🎯</span><span class="fc-demo-target" style="animation-delay:.5s;--dx:-30px;">🎯</span>';
else if(k==='maze')inner='<span style="font-size:30px;">🌀</span><span class="fc-demo-path" style="font-size:24px;">🚪</span><span class="fc-demo-path" style="font-size:24px;animation-delay:.3s;">🚪</span>';
else if(k==='tower')inner='<span style="font-size:30px;">🏰</span><span class="fc-demo-path" style="font-size:20px;">🧗</span><span class="fc-demo-path" style="font-size:20px;animation-delay:.3s;">⬆️</span>';
else if(k==='boss')inner='<span style="font-size:30px;" class="pv-heart">👹</span><span style="font-size:24px;">⚔️</span><span class="fc-timer" style="width:90px;margin:0;"><div style="width:60%;background:#ef4444;"></div></span>';
else inner='<span style="font-size:22px;">✍️</span><span class="fc-demo-type">اكتب...</span>';
return '<div style="display:flex;gap:12px;align-items:center;justify-content:center;padding:14px;border:1px dashed var(--primary-border);border-radius:14px;background:var(--primary-bg);min-height:66px;flex-wrap:wrap;">'+inner+'</div><div class="text-xs text-muted" style="text-align:center;margin-top:6px;">'+t.desc+'</div>';
}
function fcPrevUpdate(){
var el=document.getElementById('fcPrev');if(!el)return;
var t=TPL[window._fcTpl]||TPL.hearts;
var ttl=(document.getElementById('fcTitle')||{}).value||(window._fcMeta&&window._fcMeta.title)||'بدون عنوان';
var setTxt=Object.keys(window._fcSet).filter(function(k){return k!=='colors'&&k!=='theme';}).slice(0,5).map(function(k){return (TLAB[k]||k)+': '+(((document.getElementById('fcSet_'+k)||{}).value)!=null?(document.getElementById('fcSet_'+k).value):window._fcSet[k]);}).join(' · ');
el.innerHTML='<div style="display:flex;gap:12px;align-items:center;justify-content:center;padding:12px;border:1px dashed var(--primary-border);border-radius:14px;background:var(--primary-bg);flex-wrap:wrap;"><span class="'+t.pv+'" style="font-size:32px;">'+t.i+'</span><div style="text-align:right;"><strong style="font-size:13px;">'+ttl+'</strong><div class="text-xs text-muted">'+t.n+' · ❓ '+window._fcQ.length+' سؤال</div><div class="text-xs" style="color:var(--primary);margin-top:2px;">'+setTxt+'</div></div></div>'+demoHtml(window._fcTpl);
}
window.fcPrevUpdate=fcPrevUpdate;
function wizHead(){
var steps=['🎭 القالب','🎨 المظهر','⚙️ اللعب','❓ الأسئلة','✅ المراجعة'];
return '<div class="modal-header" style="background:linear-gradient(120deg,#4f46e5,#7c3aed,#db2777);background-size:220% 220%;animation:fcGrad 6s ease infinite;"><h3 class="modal-title" style="color:#fff;">🏭 مصنع الألعاب</h3><button class="btn btn-ghost btn-icon" style="color:#fff;" onclick="ThemeManager.closeModal()">✕</button></div>'+
'<div class="fc-step-indicator">'+steps.map(function(s,i){var n=i+1;var on=window._fcStep===n;var done=window._fcStep>n;return '<div class="fc-step-dot '+(on?'active':'')+' '+(done?'completed':'')+'" onclick="window.fcGoStep('+n+')" title="'+s+'">'+(done?'✓':n)+'</div>';}).join('')+'</div>'+
'<div style="text-align:center;font-size:13px;font-weight:800;color:var(--text-muted);margin-bottom:10px;">'+steps[window._fcStep-1]+'</div>';
}
function fcSetStep(n){window._fcStep=n;SND.click();fcRenderWizard();}
window.fcGoStep=function(n){
if(n>window._fcStep)return; /* النقط فوق للرجوع بس */
fcSetStep(n);
};
window.fcNext=function(){
if(window._fcStep===1){if(!window._fcTpl){if(window.safeToast)window.safeToast('اختار قالب الأول','error');return;}window._fcSet=fcSettingsFor(window._fcTpl);fcSetStep(2);return;}
if(window._fcStep===2){fcCollectVisual();fcSetStep(3);return;}
if(window._fcStep===3){var t=(document.getElementById('fcTitle')||{}).value||'';if(!t){if(window.safeToast)window.safeToast('اكتب العنوان','error');return;}fcCollectGameplay();fcSetStep(4);return;}
if(window._fcStep===4){if(!window._fcQ.length){if(window.safeToast)window.safeToast('ضيف سؤال واحد على الأقل','error');return;}fcSetStep(5);return;}
if(window._fcStep===5){fcSaveGame();return;}
};
function fcSettingsFor(t){var base=JSON.parse(JSON.stringify(TSET[t]||{lives:3}));var g=window._fcEditG;if(g&&g.settings&&g.template===t)Object.assign(base,g.settings);return base;}
function fcCollectVisual(){
window._fcVisual={
theme:(document.getElementById('fcTheme')||{}).value||'classic',
colors:(document.getElementById('fcColors')||{}).value||'',
bgEffect:(document.getElementById('fcBgEffect')||{}).checked||false,
particles:(document.getElementById('fcParticles')||{}).checked||false,
shape:(document.getElementById('fcShape')||{}).value||'round'
};
window._fcSet.theme=window._fcVisual.theme;
window._fcSet.colors=window._fcVisual.colors;
}
function fcCollectGameplay(){
var s={colors:window._fcSet.colors,theme:window._fcSet.theme};
Object.keys(window._fcSet).forEach(function(k){if(k==='colors'||k==='theme')return;var el=document.getElementById('fcSet_'+k);s[k]=el?(parseFloat(el.value)||0):window._fcSet[k];});
window._fcSet=s;
window._fcMeta={title:(document.getElementById('fcTitle')||{}).value||'',grade:(document.getElementById('fcGrade')||{}).value||'',pub:(document.getElementById('fcPub')||{}).value||'1',maxQ:(document.getElementById('fcMax')||{}).value||10};
window._fcGameplay={
difficulty:(document.getElementById('fcDifficulty')||{}).value||'medium',
comboBonus:(document.getElementById('fcComboBonus')||{}).checked,
streakBonus:(document.getElementById('fcStreakBonus')||{}).checked,
hintEnabled:(document.getElementById('fcHintEnabled')||{}).checked
};
}
function wizStep1(){
var cats={classic:'🎲 كلاسيكي',speed:'⚡ سرعة',memory:'🧠 ذاكرة',luck:'🍀 حظ',logic:'🧩 منطق',adventure:'🗺️ مغامرة',action:'💥 أكشن'};
var html='<div class="filter-info">🎭 اختار نوع اللعبة — كل نوع ليه أسلوب لعب وإعدادات خاصة</div>';
Object.keys(cats).forEach(function(cat){
var items=Object.keys(TPL).filter(function(k){return TPL[k].cat===cat;});
if(!items.length)return;
html+='<h4 style="margin:12px 0 8px;font-size:14px;color:var(--primary);">'+cats[cat]+'</h4>';
html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;">';
items.forEach(function(k){
var t=TPL[k];var sel=window._fcTpl===k;
html+='<div class="fc-template-card '+(sel?'selected':'')+'" onclick="window.fcPickTpl2(\''+k+'\')">'+
(sel?'<div class="fc-badge-new">✓ مختار</div>':'')+
'<div class="preview" style="background:'+THEMES[t.theme||'classic'].bg+';"><span class="'+t.pv+'">'+t.i+'</span></div>'+
'<div class="info"><h3>'+t.n+'</h3><p>'+t.desc+'</p></div>'+
'<div style="margin-top:8px;"><span class="badge badge-info">صعوبة '+t.diff+'/3</span></div></div>';
});
html+='</div>';
});
html+='<div style="margin-top:14px;">'+demoHtml(window._fcTpl)+'</div>';
return html;
}
window.fcPickTpl2=function(k){window._fcTpl=k;window._fcSet=fcSettingsFor(k);SND.click();fcRenderWizard();};
function wizStep2(){
var v=window._fcVisual||{};var s=window._fcSet||{};
var th=v.theme||s.theme||'classic';
var h='<div class="filter-info">🎨 خصص مظهر اللعبة — الثيم والألوان والتأثيرات بتتطبق على اللعبة نفسها</div>';
h+='<div class="fc-settings-grid">';
h+='<div class="fc-setting-card"><h4>🎭 ثيم الخلفية</h4><select id="fcTheme" class="form-select" onchange="fcPrevUpdate()">';
Object.keys(THEMES).forEach(function(k){h+='<option value="'+k+'" '+(th===k?'selected':'')+'>'+THEMES[k].name+'</option>';});
h+='</select><div style="height:40px;border-radius:10px;margin-top:8px;background:'+THEMES[th].bg+';"></div></div>';
h+='<div class="fc-setting-card"><h4>🔷 شكل أزرار الإجابات</h4><select id="fcShape" class="form-select"><option value="round" '+((v.shape||'round')==='round'?'selected':'')+'>مدوّر (افتراضي)</option><option value="pill" '+(v.shape==='pill'?'selected':'')+'>حبّة Pill</option><option value="square" '+(v.shape==='square'?'selected':'')+'>مربع حاد</option><option value="bubble" '+(v.shape==='bubble'?'selected':'')+'>فقاعات</option></select></div>';
h+='<div class="fc-setting-card"><h4>🎨 لوحة الألوان</h4>'+colorSwatches(v.colors||s.colors)+'</div>';
h+='<div class="fc-setting-card"><h4>✨ تأثيرات إضافية</h4><label style="display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer;"><input type="checkbox" id="fcBgEffect" '+(v.bgEffect?'checked':'')+' style="width:16px;height:16px;"> خلفية متحركة</label><label style="display:flex;gap:8px;align-items:center;cursor:pointer;"><input type="checkbox" id="fcParticles" '+(v.particles?'checked':'')+' style="width:16px;height:16px;"> جسيمات كثيفة</label></div>';
h+='</div>';
h+='<div id="fcPrev" style="margin-top:12px;"></div>';
return h;
}
function wizStep3(){
var g=window._fcEditG;var s=window._fcSet;var k=window._fcTpl;var gp=window._fcGameplay||{};
var h='<div class="filter-info">⚙️ إعدادات اللعب — الأساسية + الخاصة بالقالب + التحديات</div>';
h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'+
'<div class="form-group"><label>📛 العنوان *</label><input type="text" id="fcTitle" class="form-input" value="'+(g?g.title:'')+'" oninput="fcPrevUpdate()"></div>'+
'<div class="form-group"><label>🎓 الصف</label><select id="fcGrade" class="form-select">'+gradeOptions(g?g.grade||'':'')+'</select></div>'+
'<div class="form-group"><label>📢 الحالة</label><select id="fcPub" class="form-select"><option value="1" '+((g&&g.status==='published')?'selected':'')+'>منشور للطلاب</option><option value="0" '+((g&&g.status!=='published')?'selected':'')+'>مسودة (سبورة)</option></select></div>'+
'<div class="form-group"><label>🎯 حد الأسئلة</label><input type="number" id="fcMax" class="form-input" value="'+(g?g.maxQ:10)+'" min="3" max="30"></div></div>';
var numKeys=Object.keys(s).filter(function(key){return key!=='colors'&&key!=='theme';});
h+='<div class="card" style="padding:12px;margin-bottom:10px;background:var(--primary-bg);border-color:var(--primary-border);"><strong style="font-size:13px;">'+TPL[k].i+' إعدادات قالب "'+TPL[k].n+'"</strong><div class="fc-settings-grid" style="margin-top:8px;">'+numKeys.map(function(key){return '<div class="fc-setting-card"><h4>'+(TLAB[key]||key)+'</h4><input type="number" id="fcSet_'+key+'" class="form-input" value="'+s[key]+'" oninput="fcPrevUpdate()"></div>';}).join('')+'</div></div>';
h+='<div class="card" style="padding:12px;margin-bottom:10px;"><strong style="font-size:13px;">🏆 تحديات ومكافآت</strong><div class="fc-settings-grid" style="margin-top:8px;">'+
'<div class="fc-setting-card"><h4>⚡ الصعوبة</h4><select id="fcDifficulty" class="form-select"><option value="easy" '+(gp.difficulty==='easy'?'selected':'')+'>سهل (+روح ووقت أوسع)</option><option value="medium" '+((!gp.difficulty||gp.difficulty==='medium')?'selected':'')+'>متوسط</option><option value="hard" '+(gp.difficulty==='hard'?'selected':'')+'>صعب (−روح ووقت أضيق)</option></select></div>'+
'<div class="fc-setting-card"><h4>🔥 مكافآت</h4><label style="display:flex;gap:6px;align-items:center;margin:4px 0;cursor:pointer;"><input type="checkbox" id="fcComboBonus" '+(gp.comboBonus?'checked':'')+' style="width:14px;height:14px;"> بونص كومبو</label><label style="display:flex;gap:6px;align-items:center;cursor:pointer;"><input type="checkbox" id="fcStreakBonus" '+(gp.streakBonus?'checked':'')+' style="width:14px;height:14px;"> بونص سلسلة (كل 5)</label></div>'+
'<div class="fc-setting-card"><h4>💡 مساعدة</h4><label style="display:flex;gap:6px;align-items:center;cursor:pointer;"><input type="checkbox" id="fcHintEnabled" '+(gp.hintEnabled?'checked':'')+' style="width:14px;height:14px;"> تلميحات أثناء اللعب</label></div>'+
'</div></div>';
h+='<div id="fcPrev" style="margin-top:10px;"></div>';
return h;
}

function qFormatFor(tpl){
if(tpl==='flip'||tpl==='match')return 'pair';
if(tpl==='sort')return 'sort';
if(tpl==='type')return 'type';
return 'mcq';
}
function wizStep4(){
var fmt=qFormatFor(window._fcTpl);
var t=TPL[window._fcTpl]||{};
var info={pair:'القالب ده بيلعب بأزواج: اكتب الكارت الأول والتاني — اللعبة هتقلبهم وتخلطهم لوحدها.',sort:'القالب ده بيلعب بالترتيب: ضيف العناصر بالترتيب الصح واللعبة هتخلطهم للطالب.',type:'القالب ده بيلعب بالكتابة الحرة: اكتب السؤال والإجابة المقبولة (بيتجاهل التشكيل وحروف أل/ة).',mcq:'القالب ده بيلعب بالاختيارات: 4 اختيارات أو صح/خطأ — والصورة اختيارية.'}[fmt];
var h='<div class="filter-info">'+t.i+' الأسئلة بتتضاف بهيئة قالب "'+t.n+'" — '+info+'</div>';
if(fmt==='pair'){
h+='<div class="card" style="padding:10px;margin:0 0 10px;"><strong class="text-sm">➕ إضافة زوج كروت</strong>'+
'<div class="form-group" style="margin-top:8px;"><label>الكارت الأول (السؤال/الكلمة) *</label><input type="text" id="pqA" class="form-input" placeholder="مثال:光合作用 Photosynthesis"></div>'+
'<div class="form-group"><label>الكارت التاني (المعنى/الإجابة) *</label><input type="text" id="pqB" class="form-input" placeholder="مثال: عملية صنع الغذاء في النبات"></div>'+
'<div class="form-group"><label>🖼️ صورة (اختياري)</label><input type="file" accept="image/*" class="form-input" onchange="window.fcQImg(this)"></div><div id="qImgPrev"></div>'+
'<button class="btn btn-secondary w-full" onclick="window.fcAddQ()">➕ ضيف للقائمة</button></div>';
}else if(fmt==='sort'){
h+='<div class="card" style="padding:10px;margin:0 0 10px;"><strong class="text-sm">➕ سؤال ترتيب</strong>'+
'<div class="form-group" style="margin-top:8px;"><label>نص السؤال *</label><input type="text" id="qText" class="form-input" placeholder="مثال: رتّب مراحل نمو النبات"></div>'+
'<div id="sortWrap"></div><button type="button" class="btn btn-ghost btn-sm" onclick="window.fcAddSortItem()">➕ عنصر بالترتيب الصحيح</button>'+
'<button class="btn btn-secondary w-full" style="margin-top:8px;" onclick="window.fcAddQ()">➕ ضيف للقائمة</button></div>';
}else if(fmt==='type'){
h+='<div class="card" style="padding:10px;margin:0 0 10px;"><strong class="text-sm">➕ سؤال كتابة</strong>'+
'<div class="form-group" style="margin-top:8px;"><label>نص السؤال *</label><input type="text" id="qText" class="form-input"></div>'+
'<div class="form-group"><label>الإجابة المقبولة *</label><input type="text" id="qAns" class="form-input"></div>'+
'<div class="form-group"><label>🖼️ صورة (اختياري)</label><input type="file" accept="image/*" class="form-input" onchange="window.fcQImg(this)"></div><div id="qImgPrev"></div>'+
'<button class="btn btn-secondary w-full" onclick="window.fcAddQ()">➕ ضيف للقائمة</button></div>';
}else{
h+='<div class="card" style="padding:10px;margin:0 0 10px;"><strong class="text-sm">➕ إضافة سؤال</strong>'+
'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;"><div class="form-group"><label>النوع</label><select id="qType" class="form-select" onchange="window.fcTypeChange()"><option value="mcq">اختياري (4)</option><option value="tf">صح / خطأ</option></select></div>'+
'<div class="form-group"><label>🖼️ صورة من الجهاز</label><input type="file" accept="image/*" class="form-input" onchange="window.fcQImg(this)"></div></div>'+
'<div id="qImgPrev"></div>'+
'<div class="form-group"><label>نص السؤال *</label><input type="text" id="qText" class="form-input"></div>'+
'<div id="qOptsWrap"></div>'+
'<div class="form-group" id="qCorWrap"><label>الإجابة الصحيحة</label><select id="qCorrect" class="form-select"><option value="0">1</option><option value="1">2</option><option value="2">3</option><option value="3">4</option></select></div>'+
'<button class="btn btn-secondary w-full" onclick="window.fcAddQ()">➕ ضيف للقائمة</button></div>';
}
h+='<div class="card" style="padding:10px;margin-bottom:10px;"><strong class="text-sm">📥 استيراد بالجملة</strong><div class="text-xs text-muted" style="margin:6px 0;">'+(fmt==='pair'?'كل سطر: الكارت1 | الكارت2':fmt==='sort'?'كل سطر: السؤال | عنصر1 | عنصر2 | عنصر3 ...':fmt==='type'?'كل سطر: السؤال | الإجابة المقبولة':'كل سطر: السؤال | اختيار1 | اختيار2 | اختيار3 | اختيار4 | رقم الصح')+'</div><textarea id="fcBulkTa" class="form-input" rows="3"></textarea><button class="btn btn-ghost w-full" style="margin-top:6px;" onclick="window.fcBulk()">📥 استيراد</button></div>';
h+='<div class="form-group"><label>الأسئلة (<span id="fcQCount">0</span>)</label><div id="fcQList" style="max-height:200px;overflow:auto;"></div></div>';
h+='<div class="filter-info" style="margin-top:8px;">💡 لو غيّرت القالب بعدين، الأسئلة هتتحوّل تلقائياً لهيئة اللعبة الجديدة وقت التشغيل — مفيش حاجة هتضيع.</div>';
return h;
}

function wizStep5(){
var m=window._fcMeta||{};var t=TPL[window._fcTpl]||{};var gp=window._fcGameplay||{};
var setTxt=Object.keys(window._fcSet).filter(function(k){return k!=='colors'&&k!=='theme';}).map(function(k){return '<span class="badge badge-info" style="margin:2px;">'+(TLAB[k]||k)+': '+window._fcSet[k]+'</span>';}).join('');
var gpTxt='<span class="badge badge-success" style="margin:2px;">صعوبة: '+({easy:'سهل',medium:'متوسط',hard:'صعب'}[gp.difficulty]||'متوسط')+'</span>';
if(gp.comboBonus)gpTxt+='<span class="badge badge-warning" style="margin:2px;">🔥 كومبو</span>';
if(gp.streakBonus)gpTxt+='<span class="badge badge-warning" style="margin:2px;">📈 سلسلة</span>';
if(gp.hintEnabled)gpTxt+='<span class="badge badge-info" style="margin:2px;">💡 تلميحات</span>';
return '<div style="text-align:center;padding:6px;">'+demoHtml(window._fcTpl)+'</div>'+
'<div class="card" style="padding:12px;margin-top:10px;"><strong style="font-size:15px;">'+t.i+' '+(m.title||'')+'</strong><div class="text-xs text-muted" style="margin:4px 0;">'+t.n+' · 🎓 '+(m.grade||'كل الصفوف')+' · '+(m.pub==='1'?'📢 منشور':'🔒 مسودة')+' · ❓ '+window._fcQ.length+' سؤال</div><div style="margin-top:6px;">'+setTxt+'</div><div style="margin-top:6px;">'+gpTxt+'</div></div>'+
'<div class="filter-info" style="margin-top:10px;">🚀 بعد الحفظ: الطلاب يلاقوها في 🎮 الألعاب، وتقدر تشغلها على السبورة فوراً.</div>';
}

function fcRenderWizard(){
var pct=Math.round(((window._fcStep-1)/4)*100);
var h=wizHead();
h+='<div style="height:6px;border-radius:99px;background:var(--surface-hover);margin:0 0 10px;overflow:hidden;"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899);transition:width .4s;border-radius:99px;"></div></div>';
h+='<div class="modal-body" style="max-height:60vh;overflow:auto;padding-top:4px;">';
if(window._fcStep===1)h+=wizStep1();
if(window._fcStep===2)h+=wizStep2();
if(window._fcStep===3)h+=wizStep3();
if(window._fcStep===4)h+=wizStep4();
if(window._fcStep===5)h+=wizStep5();
h+='</div>';
h+='<div style="display:flex;gap:8px;padding:12px 4px 2px;background:var(--surface);border-top:1px solid var(--border);">'
+(window._fcStep>1?'<button class="btn btn-ghost" onclick="fcGoStep('+(window._fcStep-1)+')">→ السابق</button>':'')
+(window._fcStep>=4?'<button class="btn btn-ghost" onclick="window.fcTestPlay()">🧪 جرّب اللعبة</button>':'')
+'<button class="btn btn-primary" style="flex:1;" onclick="fcNext()">'+(window._fcStep===5?'💾 حفظ وإطلاق 🚀':'التالي ←')+'</button></div>';
ThemeManager.openModal(h,'modal-lg');
if(window._fcStep===2||window._fcStep===3)fcPrevUpdate();
if(window._fcStep===4){window.fcTypeChange();window.fcRenderQ();}
}

/* --- محرر الأسئلة --- */
window.fcTypeChange=function(){
var t=(document.getElementById('qType')||{}).value;
var w=document.getElementById('qOptsWrap');var cw=document.getElementById('qCorWrap');if(!w)return;
if(t==='tf'){w.innerHTML='<div class="filter-info">صح/خطأ — الصح من القائمة تحت (1=صح، 2=خطأ)</div>';if(cw)cw.style.display='';}
else if(t==='sort'){w.innerHTML='<div id="sortWrap"></div><button type="button" class="btn btn-ghost btn-sm" onclick="window.fcAddSortItem()">➕ عنصر بالترتيب الصحيح</button>';if(cw)cw.style.display='none';}
else if(t==='type'){w.innerHTML='<div class="form-group"><label>الإجابة الصحيحة *</label><input type="text" id="qAns" class="form-input"></div>';if(cw)cw.style.display='none';}
else{w.innerHTML='<div class="form-group"><label>اختيار 1 *</label><input type="text" id="qO0" class="form-input"></div><div class="form-group"><label>اختيار 2 *</label><input type="text" id="qO1" class="form-input"></div><div class="form-group"><label>اختيار 3</label><input type="text" id="qO2" class="form-input"></div><div class="form-group"><label>اختيار 4</label><input type="text" id="qO3" class="form-input"></div>';if(cw)cw.style.display='';}
};
window.fcAddSortItem=function(){
var w=document.getElementById('sortWrap');if(!w)return;
var d=document.createElement('div');d.className='form-group';
d.innerHTML='<input type="text" class="form-input sortItem" placeholder="عنصر (بالترتيب الصحيح)" style="margin-bottom:6px;">';
w.appendChild(d);
};
window.fcQImg=function(inp){var f=inp.files&&inp.files[0];if(!f)return;readImg(f,function(d){window._fcImg=d;var p=document.getElementById('qImgPrev');if(p)p.innerHTML='<div style="position:relative;display:inline-block;"><img src="'+d+'" style="max-height:80px;border-radius:8px;"><button type="button" class="btn btn-danger btn-sm" style="position:absolute;top:-8px;left:-8px;" onclick="window._fcImg=\'\';this.parentNode.remove();">✕</button></div>';});};
window.fcAddQ=function(){
var fmt=qFormatFor(window._fcTpl);
var img=window._fcImg||'';
var id=function(){return 'q_'+Date.now()+Math.random().toString(36).slice(2,5);};
if(fmt==='pair'){
var a=(document.getElementById('pqA')||{}).value||'';var b=(document.getElementById('pqB')||{}).value||'';
if(!a||!b){if(window.safeToast)window.safeToast('اكتب الكارتين','error');return;}
window._fcQ.push({id:id(),type:'pair',q:a,options:[b],correct:0,img:img});
document.getElementById('pqA').value='';document.getElementById('pqB').value='';
}else if(fmt==='sort'){
var qt=(document.getElementById('qText')||{}).value||'';
var items=[];document.querySelectorAll('#sortWrap .sortItem').forEach(function(inp){if(inp.value.trim())items.push(inp.value.trim());});
if(!qt||items.length<2){if(window.safeToast)window.safeToast('اكتب السؤال وضيف عنصرين على الأقل','error');return;}
window._fcQ.push({id:id(),type:'sort',q:qt,options:items,correct:0,img:img});
document.getElementById('qText').value='';var sw=document.getElementById('sortWrap');if(sw)sw.innerHTML='';
}else if(fmt==='type'){
var q2=(document.getElementById('qText')||{}).value||'';var ans=(document.getElementById('qAns')||{}).value||'';
if(!q2||!ans){if(window.safeToast)window.safeToast('اكتب السؤال والإجابة','error');return;}
window._fcQ.push({id:id(),type:'type',q:q2,options:[ans],correct:0,img:img});
document.getElementById('qText').value='';document.getElementById('qAns').value='';
}else{
var t=(document.getElementById('qType')||{}).value||'mcq';
var q=(document.getElementById('qText')||{}).value||'';
if(!q){if(window.safeToast)window.safeToast('اكتب السؤال','error');return;}
var opts=[],cor=0;
if(t==='tf'){opts=['✅ صح','❌ خطأ'];cor=parseInt((document.getElementById('qCorrect')||{}).value)||0;if(cor>1)cor=1;}
else{for(var i=0;i<4;i++){var v=(document.getElementById('qO'+i)||{}).value||'';if(v)opts.push(v);}if(opts.length<2){if(window.safeToast)window.safeToast('اختيارين على الأقل','error');return;}cor=parseInt((document.getElementById('qCorrect')||{}).value)||0;if(cor>=opts.length)cor=0;}
window._fcQ.push({id:id(),type:t,q:q,options:opts,correct:cor,img:img});
document.getElementById('qText').value='';
for(var z=0;z<4;z++){var oz=document.getElementById('qO'+z);if(oz)oz.value='';}
}
window._fcImg='';var p=document.getElementById('qImgPrev');if(p)p.innerHTML='';
window.fcRenderQ();SND.click();
if(window.safeToast)window.safeToast('✅ سؤال اتضاف ('+window._fcQ.length+')','success');
};

window.fcBulk=function(){
var ta=(document.getElementById('fcBulkTa')||{}).value||'';
var lines=ta.split('\n').filter(function(l){return l.trim();});
var fmt=qFormatFor(window._fcTpl);
var added=0;
lines.forEach(function(l){
var p=l.split('|').map(function(x){return x.trim();});
var nid='q_'+Date.now()+Math.random().toString(36).slice(2,5)+added;
if(fmt==='pair'){
if(p.length>=2&&p[0]&&p[1]){window._fcQ.push({id:nid,type:'pair',q:p[0],options:[p[1]],correct:0,img:''});added++;}
}else if(fmt==='sort'){
if(p.length>=3){window._fcQ.push({id:nid,type:'sort',q:p[0],options:p.slice(1),correct:0,img:''});added++;}
}else if(fmt==='type'){
if(p.length>=2&&p[0]&&p[1]){window._fcQ.push({id:nid,type:'type',q:p[0],options:[p[1]],correct:0,img:''});added++;}
}else{
if(p.length>=4){var opts=p.slice(1,5).filter(Boolean),cor=parseInt(p[p.length-1])||1;
if(opts.length>=2){window._fcQ.push({id:nid,type:'mcq',q:p[0],options:opts,correct:Math.min(Math.max(1,cor),opts.length)-1,img:''});added++;}}
}
});
window.fcRenderQ();fcPrevUpdate();
if(window.safeToast)window.safeToast('✅ اتضاف '+added+' سؤال بالاستيراد','success');
};

window.fcRenderQ=function(){
var el=document.getElementById('fcQList');var cn=document.getElementById('fcQCount');
if(cn)cn.textContent=window._fcQ.length;
if(!el)return;
var tn={mcq:'اختياري',tf:'صح/خطأ',sort:'ترتيب',type:'كتابة',pair:'زوج'};
el.innerHTML=window._fcQ.length?window._fcQ.map(function(q,i){
var detail=q.type==='sort'?'الترتيب: '+q.options.join(' ← '):q.type==='pair'?'↔ '+q.options[0]:q.type==='type'?'الإجابة: '+q.options[0]:'الصح: '+q.options[q.correct];
return '<div class="sub-row" style="padding:6px 8px;margin-bottom:4px;"><div style="flex:1;">'+(q.img?'🖼️ ':'')+'<strong>'+(i+1)+'. '+q.q+'</strong><div class="text-xs text-muted">'+(tn[q.type]||'')+' · '+detail+'</div></div><div style="display:flex;gap:4px;"><button class="btn btn-ghost btn-sm" onclick="window.fcMoveQ('+i+',-1)">▲</button><button class="btn btn-ghost btn-sm" onclick="window.fcMoveQ('+i+',1)">▼</button><button class="btn btn-danger btn-sm" onclick="window.fcDelQ('+i+')">🗑</button></div></div>';
}).join(''):'<p class="text-muted">لسه مفيش أسئلة</p>';
};

window.fcTestPlay=function(){
var t=(window._fcMeta&&window._fcMeta.title)||'معاينة تجريبية';
var game={id:'__test_'+Date.now(),title:t+' (معاينة)',template:window._fcTpl,
questions:window._fcQ.length?JSON.parse(JSON.stringify(window._fcQ)):[{id:'tq',type:'mcq',q:'سؤال تجريبي: 2+2 = ؟',options:['3','4','5','6'],correct:1,img:''}],
settings:JSON.parse(JSON.stringify(window._fcSet)),visual:JSON.parse(JSON.stringify(window._fcVisual||{})),gameplay:JSON.parse(JSON.stringify(window._fcGameplay||{})),
lives:window._fcSet.lives!=null?window._fcSet.lives:3,timeLimit:window._fcSet.perQ||0,pointsPer:window._fcSet.per||2,maxQ:parseInt(window._fcMeta&&window._fcMeta.maxQ)||10,status:'draft'};
window.__fcTemp=game;
SND.click();
window.fcPlay(game.id,{score:false});
};

/* ========== 📋 مسودة تلقائية + ضمان فتح المصنع ========== */
function fcSaveDraft(){
try{
localStorage.setItem('fcWizardDraft',JSON.stringify({tpl:window._fcTpl,set:window._fcSet,meta:window._fcMeta,visual:window._fcVisual,gameplay:window._fcGameplay,Q:window._fcQ,at:Date.now()}));
}catch(e){}
}
window.fcClearDraft=function(){try{localStorage.removeItem('fcWizardDraft');}catch(e){}};
window.fcOpenBuilder=function(editId){
var g=editId?(db().gameBank||[]).find(function(x){return x.id===editId;}):null;
window._fcEditG=g||null;
if(g){
window._fcQ=JSON.parse(JSON.stringify(g.questions||[]));
window._fcTpl=g.template||'hearts';
window._fcSet=fcSettingsFor(window._fcTpl);
window._fcMeta={title:g.title,grade:g.grade||'',pub:g.status==='published'?'1':'0',maxQ:g.maxQ||10};
window._fcVisual=g.visual||{theme:'classic',colors:'',bgEffect:false,particles:false};
window._fcGameplay=g.gameplay||{difficulty:'medium',comboBonus:true,streakBonus:false,hintEnabled:false};
}else{
var draft=null;
try{draft=JSON.parse(localStorage.getItem('fcWizardDraft')||'null');}catch(e){}
if(draft&&draft.at&&(Date.now()-draft.at)<86400000&&((draft.Q&&draft.Q.length)||(draft.meta&&draft.meta.title))){
if(confirm('📋 عندك مسودة محفوظة من '+new Date(draft.at).toLocaleString('ar-EG')+' — تحب تسترجعها وتكمل منها؟')){
window._fcQ=draft.Q||[];window._fcTpl=draft.tpl||'hearts';
window._fcSet=draft.set||fcSettingsFor(window._fcTpl);
window._fcMeta=draft.meta||{};window._fcVisual=draft.visual||{};window._fcGameplay=draft.gameplay||{};
if(window.safeToast)window.safeToast('📋 استرجعنا مسودتك — كمّل من سيبها','success');
}else{
window.fcClearDraft();
window._fcQ=[];window._fcTpl='hearts';window._fcSet=fcSettingsFor('hearts');window._fcMeta={};window._fcVisual={};window._fcGameplay={};
}
}else{
window._fcQ=[];window._fcTpl='hearts';window._fcSet=fcSettingsFor('hearts');window._fcMeta={};window._fcVisual={};window._fcGameplay={};
}
}
window._fcImg='';window._fcStep=1;
fcRenderWizard();
};
/* أي تغيير في الـ Wizard يتحفظ كمسودة تلقائياً */
(function(){
function wrapDraft(name){
var o=window[name];if(!o||o.__draftWrapped)return;
var f=function(){var r=o.apply(this,arguments);try{fcSaveDraft();}catch(e){}return r;};
f.__draftWrapped=1;window[name]=f;
}
['fcPickTpl2','fcGoStep','fcNext','fcAddQ','fcBulk','fcDelQ','fcMoveQ'].forEach(wrapDraft);
})();

function fcSaveGame(){
var m=window._fcMeta||{};
if(!m.title){if(window.safeToast)window.safeToast('ارجع للإعدادات واكتب العنوان','error');window.fcGoStep(3);return;}
if(!window._fcQ.length){if(window.safeToast)window.safeToast('ضيف أسئلة الأول','error');window.fcGoStep(4);return;}
var u=cur();var d=db();d.gameBank=d.gameBank||[];
var g=window._fcEditG;
if(!g){g={id:'game_'+Date.now(),owner:(u&&u.role==='teacher')?u.id:'center',createdAt:new Date().toISOString()};d.gameBank.push(g);}
g.title=m.title;g.template=window._fcTpl;g.grade=m.grade||'';
g.status=(m.pub==='1')?'published':'draft';
g.maxQ=parseInt(m.maxQ)||10;
g.settings=JSON.parse(JSON.stringify(window._fcSet));
g.visual=JSON.parse(JSON.stringify(window._fcVisual));
g.gameplay=JSON.parse(JSON.stringify(window._fcGameplay));
g.lives=(window._fcSet.lives!=null?window._fcSet.lives:3);
g.timeLimit=(window._fcSet.perQ!=null?window._fcSet.perQ:0);
g.pointsPer=(window._fcSet.per!=null?window._fcSet.per:2);
g.questions=window._fcQ;g.updatedAt=new Date().toISOString();
saveD(d);cloud('gameBank',g,false);
try{localStorage.removeItem('fcWizardDraft');}catch(e){}
ThemeManager.closeModal();confetti();SND.win();
if(window.safeToast)window.safeToast('🚀 اللعبة اتحفظت وانطلقت!','success');
window.fcRenderStaffGames&&window.fcRenderStaffGames();
}
window.fcDupGame=function(id){
var d=db();var g=(d.gameBank||[]).find(function(x){return x.id===id;});if(!g)return;
var c=JSON.parse(JSON.stringify(g));c.id='game_'+Date.now();c.title=g.title+' (نسخة)';c.createdAt=new Date().toISOString();
d.gameBank.push(c);saveD(d);cloud('gameBank',c,false);
window.fcRenderStaffGames&&window.fcRenderStaffGames();
if(window.safeToast)window.safeToast('📋 اتعملت نسخة','success');
};
window.fcDelGame=function(id){
if(!confirm('حذف اللعبة؟'))return;
var d=db();var g=(d.gameBank||[]).find(function(x){return x.id===id;});
d.gameBank=(d.gameBank||[]).filter(function(x){return x.id!==id;});
saveD(d);if(g)cloud('gameBank',g,true);
window.fcRenderStaffGames&&window.fcRenderStaffGames();
};

/* ========== 🕹️ المحرك ========== */
window.fcExit=function(){var o=document.getElementById('fcOverlay');if(o)o.remove();window.fcRenderStaffGames&&window.fcRenderStaffGames();window.fcRenderStudentGames&&window.fcRenderStudentGames();};
function applyDifficulty(game){
var g=JSON.parse(JSON.stringify(game));
var diff=gp_(g,'difficulty','medium');
var lives=g.lives||3;
if(diff==='easy')lives+=1;
if(diff==='hard')lives=Math.max(1,lives-1);
var tl=g.timeLimit||0;
if(tl){if(diff==='easy')tl=Math.round(tl*1.3);if(diff==='hard')tl=Math.max(5,Math.round(tl*0.7));}
g.lives=lives;g.timeLimit=tl;
return g;
}
function runIntro(cb){
var box=document.getElementById('fcBox');var n=3;
box.innerHTML='<div style="text-align:center;"><div id="fcCountNum" style="font-size:110px;font-weight:900;color:#facc15;animation:fcStarPop .6s both;">3</div><div style="opacity:.7;font-size:13px;">استعد...</div></div>';
SND.tick();
var iv=setInterval(function(){
n--;
var el=document.getElementById('fcCountNum');
if(n>0){if(el){el.textContent=n;el.style.animation='none';void el.offsetWidth;el.style.animation='fcStarPop .6s both';}SND.tick();}
else if(n===0){if(el){el.textContent='GO!';el.style.color='#22c55e';el.style.animation='none';void el.offsetWidth;el.style.animation='fcStarPop .6s both';}SND.ok();}
else{clearInterval(iv);cb();}
},700);
}

function normalizeQs(game){
var qs=JSON.parse(JSON.stringify(game.questions||[]));
var tpl=game.template;
function shuffle(arr){for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=arr[i];arr[i]=arr[j];arr[j]=t;}return arr;}
if(tpl==='flip'||tpl==='match'){
return qs.map(function(q){
if(q.type==='pair')return q;
if(q.type==='sort')return {id:q.id,type:'pair',q:q.q,options:[(q.options||[])[0]||''],correct:0,img:q.img};
return {id:q.id,type:'pair',q:q.q,options:[(q.options||[])[q.correct||0]||''],correct:0,img:q.img};
});
}
if(tpl==='sort'){
return qs.map(function(q){
if(q.type==='sort')return q;
if(q.type==='pair')return {id:q.id,type:'sort',q:q.q,options:[q.q,q.options[0]],correct:0,img:q.img};
return {id:q.id,type:'sort',q:q.q,options:(q.options||[]).slice(),correct:0,img:q.img};
});
}
if(tpl==='type'){
return qs.map(function(q){
var ans=q.type==='pair'?q.options[0]:(q.options||[])[q.correct||0]||'';
return {id:q.id,type:'type',q:q.q,options:[ans],correct:0,img:q.img};
});
}
/* قوالب الاختيارات: أي صيغة تانية بتتحول لاختيارات ذكية */
var answers=qs.map(function(q){return q.type==='pair'?q.options[0]:(q.options||[])[q.correct||0];}).filter(Boolean);
return qs.map(function(q){
if(q.type==='pair'||(q.options||[]).length<2){
var ca=q.type==='pair'?q.options[0]:(q.options||[])[q.correct||0]||'';
var opts=[ca];
answers.forEach(function(a){if(opts.length<4&&a!==ca&&opts.indexOf(a)<0)opts.push(a);});
var n=1;while(opts.length<2){opts.push('خيار '+n);n++;}
shuffle(opts);
return {id:q.id,type:'mcq',q:q.q,options:opts,correct:opts.indexOf(ca),img:q.img};
}
if(q.type==='sort'){
return {id:q.id,type:'mcq',q:(q.q||'إيه أول عنصر في الترتيب؟'),options:(q.options||[]).slice(),correct:0,img:q.img};
}
return q;
});
}

window.fcPlay=function(gameId,opts){
opts=opts||{};
var raw=(db().gameBank||[]).find(function(x){return x.id===gameId;})||(window.__fcTemp&&window.__fcTemp.id===gameId?window.__fcTemp:null);
if(!raw){if(window.safeToast)window.safeToast('اللعبة مش موجودة','error');return;}
var game=applyDifficulty(raw);
game.questions=normalizeQs(game);
var u=cur(),scored=false;
if(opts.score!==false&&u&&u.role==='student'){
scored=!(db().gamePlays||[]).some(function(p){return p.gameId===gameId&&p.sid===u.id&&p.scored;});
}
var old=document.getElementById('fcOverlay');if(old)old.remove();
var ov=document.createElement('div');ov.className='fc-ov';ov.id='fcOverlay';
var th=THEMES[themeOf(game)]||THEMES.classic;
ov.style.background=th.bg;
ov.style.setProperty('--fca',colsOf(game)[0]);
if(game.visual&&game.visual.shape&&game.visual.shape!=='round')ov.classList.add('fc-shape-'+game.visual.shape);
if(opts.board)ov.classList.add('fc-board');
if(game.visual&&game.visual.bgEffect)ov.classList.add('fc-ov-anim');
ov.innerHTML='<div class="fc-box" id="fcBox"></div>';
document.body.appendChild(ov);
var pn=(game.visual&&game.visual.particles)?30:14;
for(var pi=0;pi<pn;pi++){
var p=document.createElement('div');p.className='fc-part';
var sz=8+Math.random()*26;
p.style.cssText='width:'+sz+'px;height:'+sz+'px;left:'+(Math.random()*100)+'vw;background:'+colsOf(game)[pi%colsOf(game).length]+';animation-duration:'+(6+Math.random()*8)+'s;animation-delay:'+(Math.random()*4)+'s;';
ov.appendChild(p);
}
window.__fcHintLeft=(gp_(game,'hintEnabled',false)?(gp_(game,'difficulty','medium')==='easy'?3:2):0);
window.__fcDoHint=null;
SND.click();
runIntro(function(){
if(game.template==='flip')return playFlip(game,opts,scored);
if(game.template==='wheel')return playWheel(game,opts,scored);
if(game.template==='match')return playMatch(game,opts,scored);
if(game.template==='sort')return playSort(game,opts,scored);
if(game.template==='rush')return playRush(game,opts,scored);
if(game.template==='path')return playPath(game,opts,scored);
if(game.template==='target')return playTarget(game,opts,scored);
if(game.template==='maze'||game.template==='tower'||game.template==='boss')return playProgress(game,opts,scored,game.template);
playMCQ(game,opts,scored);
});
};
window.fcUseHint=function(){
if(!window.__fcDoHint||window.__fcHintLeft<=0)return;
window.__fcDoHint();
window.__fcHintLeft--;
var b=document.getElementById('fcHintBtn');if(b)b.textContent='💡 '+window.__fcHintLeft;
SND.hint();
};
function recordPlay(game,score,win,opts,scored){
try{
var u=cur(),d=db();d.gamePlays=d.gamePlays||[];
if(gamesFrozen())scored=false; if(scored&&u&&u.role==='student'){
d.gamePlays.push({id:'gp_'+Date.now(),gameId:game.id,sid:u.id,name:u.name,points:score,win:win,at:new Date().toISOString(),scored:true});
saveD(d);
if(score>0)addPts(u.id,score,'🎮 '+game.title);
}else if(opts.board){
d.gamePlays.push({id:'gp_'+Date.now(),gameId:game.id,sid:'board',name:'سبورة',points:score,win:win,at:new Date().toISOString(),scored:false,by:(u||{}).id||''});
saveD(d);
}
}catch(e){}
}
function finishScreen(game,opts,scored,score,win,livesLeft){
var stars=win?(livesLeft>=(game.lives||3)?3:(livesLeft>0?2:1)):0;
var rank=stars===3?'أسطوري 🥇':stars===2?'محترف 🥈':stars===1?'شجاع 🥉':'محظوظ المرة الجايه 💪';
var box=document.getElementById('fcBox');if(!box)return;
var pods=[1,2,3].map(function(i){var hgt=i<=stars?(30+stars*16):12;return '<span class="fc-pod" style="--h:'+hgt+'px;animation-delay:'+(0.4+i*0.15)+'s;opacity:'+(i<=stars?1:.3)+';"></span>';}).join('');
box.innerHTML='<div style="text-align:center;">'+
'<div class="fc-medal">'+(win?'🏆':'💔')+'</div>'+
'<h2 style="margin:6px 0;" class="fc-deal">'+(win?'مبروك يا بطل!':'الحظ المرة الجايه!')+'</h2>'+
'<div style="font-size:15px;font-weight:900;color:var(--fca,#facc15);margin-bottom:8px;">'+rank+'</div>'+
'<div style="margin:0 0 10px;height:78px;display:flex;align-items:flex-end;justify-content:center;">'+pods+'</div>'+
'<div style="font-size:44px;letter-spacing:6px;">'+[0,1,2].map(function(i){return '<span class="fc-star" style="animation-delay:'+(0.3+i*0.3)+'s;">'+(i<stars?'⭐':'☆')+'</span>';}).join('')+'</div>'+
'<div style="font-size:26px;font-weight:900;margin:10px 0;text-shadow:0 0 18px var(--fca,#facc15);">النقاط: <span id="fcScoreCount" style="font-family:var(--font-en);color:#facc15;">0</span></div>'+
(scored?'<span class="badge badge-success">✅ اتحسبت في رصيدك</span>':'<span class="text-xs" style="opacity:.7;">(تدريب — من غير نقاط)</span>')+
'<div style="display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary" onclick="fcExit()">🔚 خروج</button><button class="btn btn-ghost" onclick="fcExit();fcGameBoard(\''+game.id+'\')">📊 الترتيب</button>'+(opts.board?'':'<button class="btn btn-secondary" onclick="fcExit();fcPlay(\''+game.id+'\',{score:false})">🔁 العب تاني</button>')+'</div></div>';
countUp(document.getElementById('fcScoreCount'),score);
if(win){confetti();fireworks();SND.win();}else{rain();SND.lose();}
recordPlay(game,score,win,opts,scored);
}

function hudBase(game,opts,st){
var hearts='';for(var i=0;i<(game.lives||3);i++)hearts+='<span class="'+(i<st.lives?'':'fc-heartout')+'">'+(i<st.lives?'❤️':'🖤')+'</span>';
var dots=(st.res||[]).map(function(r){return '<span class="fc-dot '+r+'"></span>';}).join('')+'<span class="fc-dot cur"></span>';
return '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;"><strong style="font-size:18px;">'+(opts.board?'🖥️ ':'')+game.title+'</strong><div style="display:flex;gap:10px;align-items:center;font-size:16px;flex-wrap:wrap;"><span>'+hearts+'</span><span>⭐ '+st.score+'</span>'+(st.combo>=2?'<span class="fc-combo" style="color:#facc15;">🔥x'+st.combo+'</span>':'')+(game.timeLimit&&st.left!=null?'<span style="font-family:var(--font-en);font-weight:900;font-size:20px;color:'+(st.left<=5?'#ef4444':'#22c55e')+';">'+st.left+'s</span>':'')+(window.__fcHintLeft>0&&typeof window.__fcDoHint==='function'?'<button id="fcHintBtn" class="btn btn-ghost btn-sm" onclick="fcUseHint()">💡 '+window.__fcHintLeft+'</button>':'')+'<button id="fcMuteBtn" class="btn btn-ghost btn-sm" onclick="fcToggleMute()">'+(MUTED?'🔇':'')+'</button><button class="btn btn-ghost btn-sm" onclick="fcExit()">✕</button></div></div><div class="fc-dots">'+dots+'</div>'+(game.timeLimit?'<div class="fc-timer"><div id="fcTimerBar" style="width:100%;"></div></div>':'');
}
function startTimer(game,st,onEnd){
if(!game.timeLimit)return null;
var left=game.timeLimit;st.left=left;
return setInterval(function(){
left--;st.left=left;
var bar=document.getElementById('fcTimerBar');
if(bar){bar.style.width=Math.max(0,(left/game.timeLimit)*100)+'%';bar.parentNode.classList.toggle('fc-timerlow',left<=5);}
if(left<=5&&left>0)SND.tick();
if(left<=0){clearInterval(st.tInt);st.tInt=null;onEnd();}
},1000);
}
function addScore(game,st,ok){
if(ok){
st.combo++;st.run=(st.run||0)+1;
var gain=game.pointsPer||2;
if(gp_(game,'comboBonus',true)&&st.combo>=3)gain+=1;
if(gp_(game,'streakBonus',false)&&st.run%5===0){gain+=2;if(window.safeToast)window.safeToast('📈 بونص سلسلة +2','success');}
st.score+=gain;window.__fcLastGain='+'+gain;st.res.push('ok');
return gain;
}
st.combo=0;st.run=0;st.res.push('no');
return 0;
}
/* --- MCQ (قلوب/بالونات/سباق/اكتب/متاهة أبواب) --- */
function playMCQ(game,opts,scored){
var qs=(game.questions||[]).slice(0,game.maxQ||10);
var qi=0,st={score:0,lives:game.lives||3,combo:0,run:0,res:[]},locked=false;
var cols=colsOf(game);
var box=document.getElementById('fcBox');
function showQ(){
locked=false;if(st.tInt){clearInterval(st.tInt);st.tInt=null;}
if(st.lives<=0||qi>=qs.length)return finishScreen(game,opts,scored,st.score,st.lives>0,st.lives);
var q=qs[qi];
var optsHtml='';
if(q.type==='type'){
optsHtml='<input type="text" id="fcTypeIn" class="form-input" style="font-size:18px;padding:14px;text-align:center;" placeholder="اكتب الإجابة هنا..."><button type="button" class="btn btn-primary w-full" style="margin-top:10px;font-size:16px;" onclick="window.__fcTypeSubmit()">✅ تحقق</button>';
window.__fcDoHint=function(){var inp=document.getElementById('fcTypeIn');if(inp)inp.placeholder='تلميح: بيبدأ بـ "'+String(q.options[q.correct||0]).charAt(0)+'"...';};
}else{
if(game.template==='maze'){
optsHtml='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+q.options.map(function(o,i){return '<button type="button" class="fc-gate" style="border-color:'+cols[i%cols.length]+'66;animation-delay:'+(i*0.08)+'s" onclick="window.__fcAns('+i+',this)"><span style="font-size:26px;">🚪</span>'+o+'</button>';}).join('')+'</div>';
}else{
optsHtml=q.options.map(function(o,i){return game.template==='balloons'?'<button type="button" class="fc-bal" style="animation-delay:'+(i*0.15)+'s" onclick="window.__fcAns('+i+',this)">'+o+'</button>':'<button type="button" class="fc-opt" style="border-color:'+cols[i%cols.length]+'55;animation-delay:'+(i*0.08)+'s" onclick="window.__fcAns('+i+',this)">'+o+'</button>';}).join('');
}
window.__fcDoHint=function(){
var btns=box.querySelectorAll('.fc-opt:not(.ok):not(.no),.fc-gate:not(.ok):not(.no),.fc-bal');
var wrongs=[];btns.forEach(function(b,idx){if(idx!==q.correct)wrongs.push(b);});
wrongs.sort(function(){return Math.random()-0.5;}).slice(0,2).forEach(function(b){b.disabled=true;b.style.opacity=.25;});
};
}
box.innerHTML=hudBase(game,opts,st)+'<div style="animation:fcSlideIn .4s;">'+(q.img?'<div style="text-align:center;margin-bottom:10px;"><img src="'+q.img+'" style="max-height:160px;border-radius:14px;" class="fc-deal"></div>':'')+'<div style="font-size:20px;font-weight:900;margin-bottom:14px;text-align:center;">'+(qi+1)+'. '+q.q+'</div><div style="display:'+(game.template==='balloons'?'flex;flex-wrap:wrap;justify-content:center;':'block;')+';">'+optsHtml+'</div></div>';
st.tInt=startTimer(game,st,function(){wrong(null);});
var ti=document.getElementById('fcTypeIn');if(ti)ti.focus();
}
window.__fcTypeSubmit=function(){
if(locked)return;
var v=normTxt((document.getElementById('fcTypeIn')||{}).value);
var q=qs[qi];
var ok=v&&v===normTxt(q.options[q.correct||0]);
locked=true;
if(ok){addScore(game,st,true);SND.ok();confettiMini();}
else{st.lives--;addScore(game,st,false);SND.no();quake();}
setTimeout(function(){qi++;showQ();},700);
};
window.__fcAns=function(i,el){
if(locked)return;locked=true;if(st.tInt){clearInterval(st.tInt);st.tInt=null;}
var q=qs[qi];
if(i===q.correct){
addScore(game,st,true);
if(el){el.classList.add('ok');if(game.template==='balloons')el.classList.add('burst');}
SND.ok();if(st.combo>=3)confettiMini();
setTimeout(function(){qi++;showQ();},650);
}else wrong(el);
};
function wrong(el){
locked=true;if(st.tInt){clearInterval(st.tInt);st.tInt=null;}
st.lives--;addScore(game,st,false);
if(el)el.classList.add('no');
SND.no();quake();
setTimeout(function(){qi++;showQ();},700);
}
showQ();
}
/* --- 📊 ترتيب --- */
function playSort(game,opts,scored){
var qs=(game.questions||[]).slice(0,game.maxQ||10);
var qi=0,st={score:0,lives:game.lives||3,combo:0,run:0,res:[]};
var box=document.getElementById('fcBox');
window.__fcDoHint=null;
function showQ(){
if(st.tInt){clearInterval(st.tInt);st.tInt=null;}
if(st.lives<=0||qi>=qs.length)return finishScreen(game,opts,scored,st.score,st.lives>0,st.lives);
var q=qs[qi];var order=q.options.slice();
var shuffled=order.slice().sort(function(){return Math.random()-0.5;});
if(shuffled.join('||')===order.join('||'))shuffled.reverse();
var seq=[];
box.innerHTML=hudBase(game,opts,st)+'<div style="animation:fcSlideIn .4s;"><div style="font-size:18px;font-weight:900;text-align:center;margin-bottom:12px;">'+(qi+1)+'. رتّب صح: '+q.q+'</div><div id="fcSortPool" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">'+shuffled.map(function(o){return '<button type="button" class="fc-chip fc-deal" style="font-size:14px;padding:12px 16px;" onclick="window.__fcSortPick(this)">'+o+'</button>';}).join('')+'</div><div id="fcSortSeq" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:14px;min-height:44px;"></div></div>';
st.tInt=startTimer(game,st,function(){fail();});
window.__fcSortPick=function(btn){
var val=btn.textContent||btn.innerText;
if(val===order[seq.length]){
seq.push(val);btn.disabled=true;btn.style.opacity=.3;
var sq=document.createElement('span');sq.className='fc-chip sel fc-deal';sq.textContent=val;
document.getElementById('fcSortSeq').appendChild(sq);
SND.click();
if(seq.length===order.length){addScore(game,st,true);SND.ok();if(st.tInt){clearInterval(st.tInt);st.tInt=null;}setTimeout(function(){qi++;showQ();},600);}
}else fail();
};
function fail(){
if(st.tInt){clearInterval(st.tInt);st.tInt=null;}
st.lives--;addScore(game,st,false);SND.no();quake();
setTimeout(function(){qi++;showQ();},700);
}
}
showQ();
}
/* --- 🔗 وصّل الأزواج --- */
function playMatch(game,opts,scored){
var pairs=(game.questions||[]).slice(0,gs_(game,'pairs',6)).map(function(q){return {a:q.q,b:q.options[q.correct]};});
var st={score:0,lives:game.lives||3,combo:0,run:0,res:[]};
var box=document.getElementById('fcBox');
var right=pairs.map(function(p,i){return {i:i,t:p.b};}).sort(function(){return Math.random()-0.5;});
var selL=null,done=0;
window.__fcDoHint=function(){
if(selL===null)return;
var correctBtn=document.getElementById('mr_'+selL);
if(correctBtn){correctBtn.style.boxShadow='0 0 18px #facc15';setTimeout(function(){if(correctBtn)correctBtn.style.boxShadow='';},900);}
};
function draw(){
box.innerHTML=hudBase(game,opts,st)+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">'+
'<div>'+pairs.map(function(p,i){return '<button type="button" id="ml_'+i+'" class="fc-opt" style="font-size:13px;padding:10px;" onclick="window.__fcML('+i+')">'+p.a+'</button>';}).join('')+'</div>'+
'<div>'+right.map(function(r){return '<button type="button" id="mr_'+r.i+'" class="fc-opt" style="font-size:13px;padding:10px;" onclick="window.__fcMR('+r.i+',this)">'+r.t+'</button>';}).join('')+'</div></div>';
}
window.__fcML=function(i){
selL=i;SND.click();
pairs.forEach(function(_,k){var b=document.getElementById('ml_'+k);if(b&&!b.disabled)b.style.borderColor=(k===i)?'#facc15':'rgba(255,255,255,.25)';});
};
window.__fcMR=function(i,btn){
if(selL===null)return;
if(selL===i){
var a=document.getElementById('ml_'+i);if(a){a.disabled=true;a.classList.add('ok');}
btn.disabled=true;btn.classList.add('ok');
done++;addScore(game,st,true);SND.ok();
selL=null;
if(done===pairs.length){setTimeout(function(){finishScreen(game,opts,scored,st.score,true,st.lives);},600);}
}else{
st.lives--;addScore(game,st,false);SND.no();quake();
selL=null;
pairs.forEach(function(_,k){var b=document.getElementById('ml_'+k);if(b&&!b.disabled)b.style.borderColor='rgba(255,255,255,.25)';});
if(st.lives<=0)setTimeout(function(){finishScreen(game,opts,scored,st.score,false,0);},600);
}
};
draw();
}
/* --- 🃏 كروت --- */
function playFlip(game,opts,scored){
var pairs=(game.questions||[]).slice(0,gs_(game,'pairs',6)).map(function(q){return {a:q.q,b:q.options[q.correct]};});
var cards=[];pairs.forEach(function(p,i){cards.push({id:i,txt:p.a});cards.push({id:i,txt:p.b});});
cards.sort(function(){return Math.random()-0.5;});
var open=[],matched=0,st={score:0,lives:game.lives||3,combo:0,run:0,res:[]};
var box=document.getElementById('fcBox');
var peek=gs_(game,'peek',0);
window.__fcDoHint=function(){
var els=document.querySelectorAll('#fcGrid .fc-card3d:not(.matched):not(.open)');
els.forEach(function(el){el.classList.add('open');});
setTimeout(function(){els.forEach(function(el){if(!el.classList.contains('matched'))el.classList.remove('open');});},900);
};
box.innerHTML=hudBase(game,opts,st)+'<div id="fcGrid" style="text-align:center;">'+cards.map(function(c,i){return '<span class="fc-card3d" style="animation-delay:'+(i*0.06)+'s" onclick="window.__fcFlip('+i+')"><span class="in"><span class="f">❓</span><span class="b">'+c.txt+'</span></span></span>';}).join('')+'</div>';
if(peek>0){
var all=document.querySelectorAll('#fcGrid .fc-card3d');
all.forEach(function(el){el.classList.add('open');});
setTimeout(function(){all.forEach(function(el){el.classList.remove('open');});},peek*1000);
}
window.__fcFlip=function(i){
var el=document.querySelectorAll('#fcGrid .fc-card3d')[i];
if(!el||el.classList.contains('open')||el.classList.contains('matched')||open.length>=2)return;
el.classList.add('open');SND.click();open.push({i:i,id:cards[i].id,el:el});
if(open.length===2){
var a=open[0],b=open[1];
if(a.id===b.id){a.el.classList.add('matched');b.el.classList.add('matched');matched++;addScore(game,st,true);SND.ok();open=[];
if(matched===pairs.length){setTimeout(function(){finishScreen(game,opts,scored,st.score,true,st.lives);},700);}
}else{st.lives--;addScore(game,st,false);SND.no();quake();
setTimeout(function(){a.el.classList.remove('open');b.el.classList.remove('open');open=[];if(st.lives<=0)finishScreen(game,opts,scored,st.score,false,0);},800);}
}
};
}
/* --- 🎡 عجلة --- */
function playWheel(game,opts,scored){
var qs=(game.questions||[]).slice(0,8);
var seg=360/qs.length,st={score:0,lives:game.lives||3,combo:0,run:0,res:[]},used=[];
var box=document.getElementById('fcBox');
window.__fcDoHint=null;
function wheel(){
box.innerHTML='<div style="text-align:center;"><strong style="font-size:18px;">🎡 '+game.title+'</strong> <span>⭐ '+st.score+'</span> · ❤️ '+st.lives+'<div style="margin:18px auto;width:260px;height:260px;border-radius:50%;border:6px solid #fff;position:relative;transition:transform 3s cubic-bezier(.17,.67,.12,.99);background:conic-gradient('+qs.map(function(q,i){return ['#f472b6','#60a5fa','#4ade80','#facc15','#c084fc','#fb923c','#22d3ee','#a3e635'][i%8]+' '+(i*seg)+'deg '+((i+1)*seg)+'deg';}).join(',')+');" id="fcWheel">'+qs.map(function(q,i){return '<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate('+(i*seg+seg/2)+'deg) translateY(-95px);font-size:18px;">'+(i+1)+'</span>';}).join('')+'</div><div style="font-size:26px;margin-top:-140px;pointer-events:none;">🔻</div><button class="btn btn-primary btn-lg" style="margin-top:120px;" onclick="window.__fcSpin()">🎡 لف العجلة</button> <button class="btn btn-ghost" onclick="fcExit()">✕</button></div>';
}
window.__fcSpin=function(){
var w=document.getElementById('fcWheel');if(!w)return;
var pick=Math.floor(Math.random()*qs.length);
w.style.transform='rotate('+(1440+Math.random()*360+(360-(pick*seg+seg/2)))+'deg)';
var tk=setInterval(function(){SND.spin();},180);
setTimeout(function(){clearInterval(tk);one(pick);},3100);
};
function one(idx){
var q=qs[idx];
box.innerHTML='<div style="animation:fcSlideIn .4s;">'+(q.img?'<div style="text-align:center;margin-bottom:8px;"><img src="'+q.img+'" style="max-height:140px;border-radius:12px;"></div>':'')+'<div style="font-size:20px;font-weight:900;text-align:center;margin-bottom:12px;">'+q.q+'</div>'+q.options.map(function(o,i){return '<button type="button" class="fc-opt" style="animation-delay:'+(i*0.08)+'s" onclick="window.__fcWheelAns('+i+','+idx+',this)">'+o+'</button>';}).join('')+'</div>';
window.__fcDoHint=function(){
var btns=box.querySelectorAll('.fc-opt');
var wrongs=[];btns.forEach(function(b,i2){if(i2!==q.correct)wrongs.push(b);});
wrongs.sort(function(){return Math.random()-0.5;}).slice(0,2).forEach(function(b){b.disabled=true;b.style.opacity=.25;});
};
}
window.__fcWheelAns=function(i,idx,el){
var q=qs[idx];
if(i===q.correct){el.classList.add('ok');addScore(game,st,true);SND.ok();}
else{el.classList.add('no');var ok=el.parentNode.children[q.correct];if(ok)ok.classList.add('ok');st.lives--;addScore(game,st,false);SND.no();quake();}
setTimeout(function(){used.push(idx);if(st.lives<=0||used.length>=qs.length){finishScreen(game,opts,scored,st.score,st.lives>0,st.lives);}else wheel();},800);
};
wheel();
}
/* --- 🏃 سباق النقاط --- */
function playRush(game,opts,scored){
var qs=(game.questions||[]).slice(0,game.maxQ||20);
var total=gs_(game,'total',60),per=gs_(game,'per',2),minus=gs_(game,'minus',1);
var left=total,score=0,combo=0,locked=false,qi=0;
var order=qs.slice().sort(function(){return Math.random()-0.5;});
var box=document.getElementById('fcBox');
window.__fcDoHint=function(){
var btns=box.querySelectorAll('.fc-opt');
var q=order[qi];if(!q)return;
var wrongs=[];btns.forEach(function(b,i2){if(i2!==q.correct)wrongs.push(b);});
wrongs.sort(function(){return Math.random()-0.5;}).slice(0,2).forEach(function(b){b.disabled=true;b.style.opacity=.25;});
};
var iv=setInterval(function(){
left--;
var rn=document.getElementById('fcRingNum');if(rn)rn.textContent=left;
var rg=document.getElementById('fcRing');if(rg)rg.style.background='conic-gradient('+(left<=10?'#ef4444':'#22c55e')+' '+(Math.max(0,left/total)*360)+'deg, rgba(255,255,255,.12) 0deg)';
if(left<=5&&left>0)SND.tick();
if(left<=0){clearInterval(iv);finishScreen(game,opts,scored,score,score>0,3);}
},1000);
function show(){
locked=false;
if(left<=0||qi>=order.length){clearInterval(iv);return finishScreen(game,opts,scored,score,score>0,3);}
var q=order[qi];
box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><strong style="font-size:18px;">🏃 '+game.title+'</strong><div style="font-size:16px;">⭐ '+score+(combo>=2?' <span class="fc-combo" style="color:#facc15;">🔥x'+combo+'</span>':'')+' <button id="fcMuteBtn" class="btn btn-ghost btn-sm" onclick="fcToggleMute()">'+(MUTED?'🔇':'')+'</button> <button class="btn btn-ghost btn-sm" onclick="fcExit()">✕</button></div></div>'+
'<div id="fcRing" style="width:92px;height:92px;border-radius:50%;background:conic-gradient(#22c55e '+(Math.max(0,left/total)*360)+'deg, rgba(255,255,255,.12) 0deg);display:flex;align-items:center;justify-content:center;margin:10px auto;"><div style="width:70px;height:70px;border-radius:50%;background:#0b0e1a;display:flex;align-items:center;justify-content:center;font-family:var(--font-en);font-weight:900;font-size:24px;" id="fcRingNum">'+left+'</div></div>'+
'<div style="animation:fcSlideIn .3s;"><div style="font-size:18px;font-weight:900;text-align:center;margin-bottom:10px;">'+q.q+'</div>'+q.options.map(function(o,i){return '<button type="button" class="fc-opt" style="padding:10px 14px;margin-bottom:8px;animation-delay:'+(i*0.05)+'s" onclick="window.__fcRush('+i+',this)">'+o+'</button>';}).join('')+'</div>';
}
window.__fcRush=function(i,el){
if(locked)return;locked=true;
var q=order[qi];
if(i===q.correct){score+=per+(combo>=3?1:0);combo++;el.classList.add('ok');SND.ok();}
else{score=Math.max(0,score-minus);combo=0;el.classList.add('no');SND.no();quake();}
qi++;
setTimeout(show,420);
};
show();
}
/* --- 🗺️ طريق المغامرة --- */
function playPath(game,opts,scored){
var steps=gs_(game,'steps',10),traps=gs_(game,'traps',2);
var qs=(game.questions||[]).slice(0,game.maxQ||10);
var trapSet={};var tc=0;while(tc<traps&&steps>3){var r=1+Math.floor(Math.random()*(steps-2));if(!trapSet[r]){trapSet[r]=1;tc++;}}
var pos=0,qi=0,st={score:0,lives:game.lives||3,combo:0,run:0,res:[]};
var box=document.getElementById('fcBox');
window.__fcDoHint=null;
function mapHtml(){
var cells='';
for(var i=0;i<=steps;i++){
var cls='fc-path-cell';var txt=i;
if(i===steps){cls+=' goal';txt='👑';}
else if(trapSet[i]&&i<=pos){cls+=' revealed';txt='🕳️';}
else if(i<pos){cls+=' donecell';txt='✓';}
if(i===pos){cls+=' here';txt='🧍';}
cells+='<div class="'+cls+'">'+txt+'</div>';
}
return '<div class="fc-path">'+cells+'</div>';
}
function show(){
if(pos>=steps)return finishScreen(game,opts,scored,st.score,true,st.lives);
if(st.lives<=0)return finishScreen(game,opts,scored,st.score,false,0);
if(qi>=qs.length*2)return finishScreen(game,opts,scored,st.score,pos>=steps,st.lives);
var q=qs[qi%qs.length];
box.innerHTML=hudBase(game,opts,st)+mapHtml()+'<div style="animation:fcSlideIn .35s;margin-top:10px;"><div style="font-size:18px;font-weight:900;text-align:center;margin-bottom:10px;">'+q.q+'</div>'+q.options.map(function(o,i){return '<button type="button" class="fc-opt" onclick="window.__fcPath('+i+',this)">'+o+'</button>';}).join('')+'</div>';
window.__fcDoHint=function(){
var btns=box.querySelectorAll('.fc-opt');
var wrongs=[];btns.forEach(function(b,i2){if(i2!==q.correct)wrongs.push(b);});
wrongs.sort(function(){return Math.random()-0.5;}).slice(0,2).forEach(function(b){b.disabled=true;b.style.opacity=.25;});
};
}
window.__fcPath=function(i,el){
var q=qs[qi%qs.length];qi++;
if(i===q.correct){
pos++;addScore(game,st,true);el.classList.add('ok');SND.ok();
if(trapSet[pos]){st.lives--;SND.no();quake();if(window.safeToast)window.safeToast('🕳️ فخ! خسرت روح','warning');}
}else{addScore(game,st,false);st.lives--;el.classList.add('no');SND.no();quake();pos=Math.max(0,pos-1);}
setTimeout(show,650);
};
show();
}
/* --- 🎯 القنّاص --- */
function playTarget(game,opts,scored){
var qs=(game.questions||[]).slice(0,game.maxQ||10);
var speed=gs_(game,'speed',2);
var qi=0,st={score:0,lives:game.lives||3,combo:0,run:0,res:[]},locked=false;
var box=document.getElementById('fcBox');
function show(){
locked=false;
if(st.lives<=0||qi>=qs.length)return finishScreen(game,opts,scored,st.score,st.lives>0,st.lives);
var q=qs[qi];
box.innerHTML=hudBase(game,opts,st)+'<div style="font-size:17px;font-weight:900;text-align:center;margin:6px 0;">'+q.q+'</div><div class="fc-arena">'+q.options.map(function(o,i){var dur=Math.max(1.2,(6-speed))+Math.random()*2;var dx=(Math.random()*160-80).toFixed(0);var dy=(Math.random()*140-70).toFixed(0);return '<button type="button" class="fc-target" style="animation-duration:'+dur+'s;--dx:'+dx+'px;--dy:'+dy+'px;left:'+(8+Math.random()*60)+'%;top:'+(8+Math.random()*60)+'%;" onclick="window.__fcTarget('+i+',this)">'+o+'</button>';}).join('')+'</div><div class="text-xs" style="opacity:.7;text-align:center;margin-top:6px;">الأهداف بتطير — اصطاد الإجابة الصحيحة! 🎯</div>';
window.__fcDoHint=function(){
var tgs=box.querySelectorAll('.fc-target');
if(tgs[q.correct])tgs[q.correct].style.boxShadow='0 0 22px #facc15';
};
}
window.__fcTarget=function(i,el){
if(locked)return;locked=true;
var q=qs[qi];
if(i===q.correct){el.classList.add('burst2');addScore(game,st,true);SND.ok();}
else{el.classList.add('no');st.lives--;addScore(game,st,false);SND.no();quake();}
qi++;
setTimeout(show,650);
};
show();
}
/* --- 🌀🏰👹 تقدم (متاهة/برج/زعيم) --- */
function playProgress(game,opts,scored,skin){
var total=skin==='tower'?gs_(game,'floors',8):skin==='maze'?gs_(game,'levels',5):gs_(game,'bossHP',5);
var qs=(game.questions||[]).slice(0,game.maxQ||10);
var pos=0,qi=0,st={score:0,lives:game.lives||3,combo:0,run:0,res:[]};
var cols=colsOf(game);
var box=document.getElementById('fcBox');
function barHtml(){
if(skin==='boss')return '<div style="text-align:center;margin:8px 0;"><div style="font-size:46px;" id="fcBossEmoji">👹</div><div class="fc-timer" style="height:12px;"><div id="fcBossBar" style="width:'+((total-pos)/total*100)+'%;background:linear-gradient(90deg,#ef4444,#7c2d12);"></div></div><div style="font-size:11px;opacity:.8;">صحة الزعيم: '+(total-pos)+'/'+total+'</div></div>';
if(skin==='tower')return '<div style="display:flex;flex-direction:column-reverse;gap:3px;align-items:center;margin:8px 0;">'+Array.apply(null,Array(total)).map(function(_,i){return '<div style="width:140px;height:16px;border-radius:5px;background:'+(i<pos?'linear-gradient(90deg,#22c55e,#eab308)':'rgba(255,255,255,.08)')+';display:flex;align-items:center;justify-content:center;font-size:11px;">'+(i===pos?'🧗':(i<pos?'✓':''))+'</div>';}).join('')+'</div>';
return '<div class="fc-path">'+Array.apply(null,Array(total+1)).map(function(_,i){return '<div class="fc-path-cell '+(i===total?'goal':(i<pos?'donecell':(i===pos?'here':'')))+'">'+(i===total?'🏁':(i<pos?'✓':(i===pos?'🧍':i)))+'</div>';}).join('')+'</div>';
}
function show(){
if(pos>=total)return finishScreen(game,opts,scored,st.score,true,st.lives);
if(st.lives<=0)return finishScreen(game,opts,scored,st.score,false,0);
if(qi>=qs.length*3)return finishScreen(game,opts,scored,st.score,pos>=total,st.lives);
var q=qs[qi%qs.length];
var optsHtml;
if(skin==='maze'){
optsHtml='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+q.options.map(function(o,i){return '<button type="button" class="fc-gate" style="border-color:'+cols[i%cols.length]+'66;" onclick="window.__fcProg('+i+',this)"><span style="font-size:24px;">🚪</span>'+o+'</button>';}).join('')+'</div>';
}else{
optsHtml=q.options.map(function(o,i){return '<button type="button" class="fc-opt" style="border-color:'+cols[i%cols.length]+'55;" onclick="window.__fcProg('+i+',this)">'+(skin==='boss'?'⚔️ ':'')+o+'</button>';}).join('');
}
box.innerHTML=hudBase(game,opts,st)+barHtml()+'<div style="animation:fcSlideIn .35s;margin-top:8px;"><div style="font-size:18px;font-weight:900;text-align:center;margin-bottom:10px;">'+q.q+'</div>'+optsHtml+'</div>';
window.__fcDoHint=function(){
var btns=box.querySelectorAll('.fc-opt,.fc-gate');
var wrongs=[];btns.forEach(function(b,i2){if(i2!==q.correct)wrongs.push(b);});
wrongs.sort(function(){return Math.random()-0.5;}).slice(0,2).forEach(function(b){b.disabled=true;b.style.opacity=.25;});
};
}
window.__fcProg=function(i,el){
var q=qs[qi%qs.length];qi++;
if(i===q.correct){
pos++;addScore(game,st,true);el.classList.add('ok');SND.ok();
if(skin==='boss'){var be=document.getElementById('fcBossEmoji');if(be){be.classList.remove('fc-bosshit');void be.offsetWidth;be.classList.add('fc-bosshit');}var bb=document.getElementById('fcBossBar');if(bb)bb.style.width=((total-pos)/total*100)+'%';}
}else{
addScore(game,st,false);st.lives--;el.classList.add('no');SND.no();quake();
if(skin==='tower')pos=Math.max(0,pos-1);
}
setTimeout(show,650);
};
show();
}

/* ========== 📊 ليدربورد + نتائجي ========== */
window.fcGameBoard=function(gameId){
var d=db();var game=(d.gameBank||[]).find(function(x){return x.id===gameId;});
var plays=(d.gamePlays||[]).filter(function(p){return p.gameId===gameId&&p.scored;}).sort(function(a,b){return b.points-a.points;}).slice(0,10);
var h='<div class="modal-header"><h3 class="modal-title">📊 ترتيب: '+(game?game.title:'')+'</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
h+=plays.length?plays.map(function(p,i){var u=DataService.getUserById?DataService.getUserById(p.sid):null;return '<div class="sub-row" style="padding:8px;'+(i<3?'border-right:3px solid '+['#facc15','#c0c0c0','#cd7f32'][i]+';':'')+'"><div style="display:flex;gap:8px;align-items:center;"><span style="font-size:18px;">'+(['🥇','🥈','🥉'][i]||(i+1)+'.')+'</span><strong>'+(p.name||(u?u.name:'طالب')||'-')+'</strong></div><span class="badge badge-primary" style="font-family:var(--font-en);">'+p.points+' نقطة</span></div>';}).join(''):'<p class="text-muted" style="text-align:center;padding:16px;">لسه مفيش نتائج مسجلة</p>';
ThemeManager.openModal(h,'modal-md');
};
window.fcMyResults=function(){
var u=cur();if(!u)return;
var d=db();var mine=(d.gamePlays||[]).filter(function(p){return p.sid===u.id;}).sort(function(a,b){return String(b.at).localeCompare(String(a.at));}).slice(0,20);
var total=mine.filter(function(p){return p.scored;}).reduce(function(a,p){return a+(p.points||0);},0);
var h='<div class="modal-header"><h3 class="modal-title">📊 نتائجي في الألعاب</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
h+='<div class="filter-info">🎮 إجمالي نقاط الألعاب: <strong>'+total+'</strong> · المحاولات: '+mine.length+'</div>';
h+=mine.length?mine.map(function(p){var g=(d.gameBank||[]).find(function(x){return x.id===p.gameId;});return '<div class="sub-row" style="padding:8px;"><div><strong>'+(TPL[g?g.template:'']?TPL[g.template].i:'🎮')+' '+(g?g.title:'-')+'</strong><div class="text-xs text-muted">'+new Date(p.at).toLocaleString('ar-EG')+(p.scored?'':' · تدريب')+'</div></div><span class="badge '+(p.win?'badge-success':'badge-muted')+'">'+p.points+' نقطة</span></div>';}).join(''):'<p class="text-muted" style="text-align:center;padding:16px;">لسه مولعبتش أي لعبة</p>';
ThemeManager.openModal(h,'modal-md');
};

/* ========== قوائم الألعاب ========== */
window.fcRenderStudentGames=function(){
var el=document.getElementById('fcStudentGames');if(!el)return;
var u=cur(),d=db();if(!u)return;
return Object.assign({quizPoints:5,streak7:10,streak14:25,streak30:60,ach:true,board:true,fact:true,mPlay:3,mQuiz:2,mWin:5},g.engagement||{});
el.innerHTML=list.length?list.map(function(g){
var play=(d.gamePlays||[]).find(function(p){return p.gameId===g.id&&p.sid===u.id&&p.scored;});
var best=(d.gamePlays||[]).filter(function(p){return p.gameId===g.id&&p.sid===u.id;}).reduce(function(a,p){return Math.max(a,p.points||0);},0);
return '<div class="card fc-game-card" style="margin:0;padding:14px;text-align:center;transition:all .2s;" onmouseover="this.style.transform=\'translateY(-4px)\'" onmouseout="this.style.transform=\'\'"><div class="fc-gicon" style="background:'+(THEMES[themeOf(g)]||THEMES.classic).bg+';"><span class="'+((TPL[g.template]||{}).pv||'')+'">'+(TPL[g.template]||{}).i+'</span></div><strong style="font-size:13px;">'+g.title+'</strong><div class="text-xs text-muted" style="margin:4px 0;">'+(g.questions||[]).length+' سؤال · ⭐'+g.pointsPer+' · ❤️'+g.lives+(g.timeLimit?' · ⏱️'+g.timeLimit+'ث':' · ⏱️ مفتوح')+'</div>'+(play?'<span class="badge badge-success">✓ '+play.points+' نقطة</span>':'<span class="badge badge-primary">🚀 جديد</span>')+(best?'<div class="text-xs" style="margin-top:4px;color:var(--primary);font-weight:800;">🏅 أحسن نتيجة: '+best+'</div>':'')+'<div style="margin-top:8px;display:flex;gap:6px;"><button class="btn btn-primary btn-sm" style="flex:1;" onclick="fcPlay(\''+g.id+'\')">'+(play?'🔁 تدريب':'🎮 العب واكسب')+'</button><button class="btn btn-ghost btn-sm" onclick="fcGameBoard(\''+g.id+'\')">📊</button></div></div>';
}).join(''):'<div class="card" style="grid-column:1/-1;text-align:center;padding:24px;"><div style="font-size:48px;">🎮</div><strong>مفيش ألعاب منشورة لصفك حالياً</strong></div>';
};
window.fcRenderStaffGames=function(){
var el=document.getElementById('fcStaffGames');if(!el)return;
var u=cur(),d=db();
var list=(d.gameBank||[]).filter(function(g){return (u.role==='teacher')?g.owner===u.id:true;});
el.innerHTML=list.length?list.map(function(g){
var plays=(d.gamePlays||[]).filter(function(p){return p.gameId===g.id&&p.sid!=='board';});
return '<div class="card" style="margin:0;padding:14px;"><div style="display:flex;justify-content:space-between;"><div><div class="fc-gicon" style="width:56px;height:56px;margin:0 0 6px;font-size:26px;border-radius:14px;background:'+(THEMES[themeOf(g)]||THEMES.classic).bg+';"><span class="'+((TPL[g.template]||{}).pv||'')+'">'+(TPL[g.template]||{}).i+'</span></div><strong>'+g.title+'</strong><div class="text-xs text-muted">'+(g.questions||[]).length+' سؤال · '+(g.grade||'كل الصفوف')+' · ❤️'+g.lives+' · '+(g.timeLimit?g.timeLimit+'ث':'مفتوح')+'</div></div><span class="badge '+(g.status==='published'?'badge-success':'badge-muted')+'">'+(g.status==='published'?'📢 منشور':'🔒 مسودة')+'</span></div><div class="text-xs text-muted" style="margin:8px 0;">👥 '+plays.length+' لاعب · 🖥️ '+(d.gamePlays||[]).filter(function(p){return p.gameId===g.id&&p.sid==='board';}).length+' جلسة سبورة</div><div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="fcPlay(\''+g.id+'\',{board:true,score:false})">🖥️ السبورة</button><button class="btn btn-ghost btn-sm" onclick="fcPlay(\''+g.id+'\',{score:false})">🧪</button><button class="btn btn-ghost btn-sm" onclick="fcGameBoard(\''+g.id+'\')">📊</button><button class="btn btn-secondary btn-sm" onclick="fcOpenBuilder(\''+g.id+'\')">✏️</button><button class="btn btn-ghost btn-sm" onclick="fcDupGame(\''+g.id+'\')">📋</button><button class="btn btn-danger btn-sm" onclick="fcDelGame(\''+g.id+'\')">🗑</button></div></div>';
}).join(''):'<div class="card" style="grid-column:1/-1;text-align:center;padding:24px;"><div style="font-size:48px;">🏭</div><strong>مفيش ألعاب</strong><div class="text-xs text-muted">دوس "🏭 لعبة جديدة" وابدأ</div></div>';
};
window.fcRenderStaffResults=function(){
var el=document.getElementById('fcStaffResults');if(!el)return;
var d=db();
var plays=(d.gamePlays||[]).slice().sort(function(a,b){return String(b.at||'').localeCompare(String(a.at||''));}).slice(0,30);
el.innerHTML=plays.length?plays.map(function(p){var g=(d.gameBank||[]).find(function(x){return x.id===p.gameId;});var s=p.sid==='board'?null:(DataService.getUserById?DataService.getUserById(p.sid):null);return '<div class="sub-row" style="padding:8px;"><div><strong>'+(TPL[g?g.template:'']?TPL[g.template].i:'🎮')+' '+(g?g.title:'-')+'</strong><div class="text-xs text-muted">'+(p.sid==='board'?'🖥️ جلسة سبورة':(p.name||(s?s.name:'-')))+' · '+new Date(p.at).toLocaleString('ar-EG')+'</div></div><span class="badge '+(p.scored?'badge-success':'badge-muted')+'">'+p.points+' نقطة</span></div>';}).join(''):'<p class="text-muted" style="text-align:center;padding:16px;">مفيش نتائج بعد</p>';
};

/* ========== 🎯 إدارة التحفيز ========== */
window.openEngagementManager=function(tab){
var u=cur();if(!u)return;
var canSet=(u.role==='admin'||u.role==='super_admin'||u.role==='assistant');
tab=tab||'quiz';var c=cfg();
var h='<div class="modal-header"><h3 class="modal-title">🎯 إدارة التحفيز</h3><button class="btn btn-ghost btn-icon" onclick="ThemeManager.closeModal()">✕</button></div><div class="modal-body">';
h+='<div class="tabs" style="margin-bottom:12px;"><button class="tab-btn '+(tab==='quiz'?'active':'')+'" onclick="openEngagementManager(\'quiz\')">🧠 سؤال اليوم</button><button class="tab-btn '+(tab==='facts'?'active':'')+'" onclick="openEngagementManager(\'facts\')">💡 حقائق</button>'+(canSet?'<button class="tab-btn '+(tab==='set'?'active':'')+'" onclick="openEngagementManager(\'set\')">⚙️ الإعدادات</button>':'')+'</div>';
if(tab==='quiz'){
h+='<div class="filter-info">💡 أسئلة الأستاذ لطلابه بس — وأسئلة المركز للكل.</div>';
h+='<div class="form-group"><label>السؤال *</label><input type="text" id="eqQ" class="form-input"></div>';
for(var i=0;i<4;i++)h+='<div class="form-group"><label>اختيار '+(i+1)+' *</label><input type="text" id="eqO'+i+'" class="form-input"></div>';
h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;"><div class="form-group"><label>الصح</label><select id="eqC" class="form-select"><option value="0">1</option><option value="1">2</option><option value="2">3</option><option value="3">4</option></select></div><div class="form-group"><label>المادة</label><input type="text" id="eqSub" class="form-input" placeholder="عام"></div><div class="form-group"><label>الصف</label><select id="eqGr" class="form-select">'+gradeOptions('')+'</select></div></div>';
h+='<button class="btn btn-primary w-full" onclick="window.fcAddQuizQ()">➕ إضافة</button>';
h+='<div style="margin-top:12px;max-height:200px;overflow:auto;">'+(pool().length?pool().slice().reverse().map(function(q){return '<div class="sub-row"><div style="flex:1;"><strong>'+q.q+'</strong><div class="text-xs text-muted">'+(q.grade||'كل الصفوف')+' · الصح: '+q.options[q.correct]+'</div></div><button class="btn btn-danger btn-sm" onclick="window.fcDelQuizQ(\''+q.id+'\')">🗑</button></div>';}).join(''):'<p class="text-muted">مفيش أسئلة</p>')+'</div>';
}else if(tab==='facts'){
h+='<div class="form-group"><label>حقيقة جديدة</label><input type="text" id="efT" class="form-input"></div><button class="btn btn-primary w-full" onclick="window.fcAddFact()">➕ إضافة</button>';
h+='<div style="margin-top:12px;max-height:200px;overflow:auto;">'+((db().factsPool||[]).length?(db().factsPool||[]).map(function(f,i){return '<div class="sub-row"><div style="flex:1;">'+f.text+'</div><button class="btn btn-danger btn-sm" onclick="window.fcDelFact('+i+')">🗑</button></div>';}).join(''):'<p class="text-muted">شغال بالافتراضي</p>')+'</div>';
}else{
h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
'<div class="form-group"><label>نقاط سؤال اليوم</label><input type="number" id="esQP" class="form-input" value="'+c.quizPoints+'"></div>'+
'<div class="form-group"><label>مكافأة 7 أيام</label><input type="number" id="esS7" class="form-input" value="'+c.streak7+'"></div>'+
'<div class="form-group"><label>مكافأة 14 يوم</label><input type="number" id="esS14" class="form-input" value="'+c.streak14+'"></div>'+
'<div class="form-group"><label>مكافأة 30 يوم</label><input type="number" id="esS30" class="form-input" value="'+c.streak30+'"></div>'+
'<div class="form-group"><label>🎯 مهمة اللعب</label><input type="number" id="esMP" class="form-input" value="'+c.mPlay+'"></div>'+
'<div class="form-group"><label>🎯 مهمة السؤال</label><input type="number" id="esMQ" class="form-input" value="'+c.mQuiz+'"></div>'+
'<div class="form-group"><label>🎯 مهمة الفوز</label><input type="number" id="esMW" class="form-input" value="'+c.mWin+'"></div>'+
'<div class="form-group"><label>🏆 عتبة الفوز (نقاط)</label><input type="number" id="esMWP" class="form-input" value="'+(c.mWinPts||6)+'"></div></div>'+
'<label style="display:flex;gap:8px;margin:6px 0;"><input type="checkbox" id="esAch" '+(c.ach?'checked':'')+' style="width:18px;height:18px;"> 🏅 الإنجازات</label>'+
'<label style="display:flex;gap:8px;margin:6px 0;"><input type="checkbox" id="esBoard" '+(c.board?'checked':'')+' style="width:18px;height:18px;"> 📊 ترتيب اليوم</label>'+
'<label style="display:flex;gap:8px;margin:6px 0;"><input type="checkbox" id="esFact" '+(c.fact?'checked':'')+' style="width:18px;height:18px;"> 💡 حقيقة اليوم</label>'+
'<button class="btn btn-primary w-full" onclick="window.fcSaveSettings()">💾 حفظ</button>';
}
ThemeManager.openModal(h,'modal-md');
};
window.fcAddQuizQ=function(){
var u=cur();var q=(document.getElementById('eqQ')||{}).value||'';
var opts=[];for(var i=0;i<4;i++)opts.push((document.getElementById('eqO'+i)||{}).value||'');
if(!q||opts.some(function(o){return !o;})){if(window.safeToast)window.safeToast('أكمل السؤال والاختيارات','error');return;}
var d=db();d.dailyQuizPool=d.dailyQuizPool||[];
d.dailyQuizPool.push({id:'eq_'+Date.now(),q:q,options:opts,correct:parseInt((document.getElementById('eqC')||{}).value)||0,subject:(document.getElementById('eqSub')||{}).value||'عام',grade:(document.getElementById('eqGr')||{}).value||'',owner:(u&&u.role==='teacher')?u.id:'center',createdAt:new Date().toISOString()});
saveD(d);if(window.safeToast)window.safeToast('✅ اتضاف','success');window.openEngagementManager('quiz');
};
window.fcDelQuizQ=function(id){var d=db();d.dailyQuizPool=(d.dailyQuizPool||[]).filter(function(q){return q.id!==id;});saveD(d);window.openEngagementManager('quiz');};
window.fcAddFact=function(){var t=(document.getElementById('efT')||{}).value||'';if(!t)return;var d=db();d.factsPool=d.factsPool||[];d.factsPool.push({text:t});saveD(d);window.openEngagementManager('facts');};
window.fcDelFact=function(i){var d=db();d.factsPool=(d.factsPool||[]).filter(function(_,j){return j!==i;});saveD(d);window.openEngagementManager('facts');};
window.fcSaveSettings=function(){
var c=cfg();
c.quizPoints=parseInt((document.getElementById('esQP')||{}).value)||c.quizPoints;
c.streak7=parseInt((document.getElementById('esS7')||{}).value)||c.streak7;
c.streak14=parseInt((document.getElementById('esS14')||{}).value)||c.streak14;
c.streak30=parseInt((document.getElementById('esS30')||{}).value)||c.streak30;
c.mPlay=parseInt((document.getElementById('esMP')||{}).value)||c.mPlay;
c.mQuiz=parseInt((document.getElementById('esMQ')||{}).value)||c.mQuiz;
c.mWin=parseInt((document.getElementById('esMW')||{}).value)||c.mWin;
c.mWinPts=parseInt((document.getElementById('esMWP')||{}).value)||c.mWinPts||6;
c.ach=(document.getElementById('esAch')||{}).checked;
c.board=(document.getElementById('esBoard')||{}).checked;
c.fact=(document.getElementById('esFact')||{}).checked;
saveCfg(c);if(window.safeToast)window.safeToast('✅ اتحفظت الإعدادات','success');ThemeManager.closeModal();
};

/* ========== 🧩 بناء الأقسام ========== */
function sidebarItem(nav,sectionId,label,icon,afterSection){
if(!nav)return;
if(nav.querySelector('[data-section="'+sectionId+'"]'))return;
var html='<div class="sidebar-item" data-section="'+sectionId+'" onclick="window.showSection(\''+sectionId+'\')"><span class="sidebar-item-icon">'+icon+'</span><span class="sidebar-item-label">'+label+'</span></div>';
var a=nav.querySelector('[data-section="'+afterSection+'"]');
if(a)a.insertAdjacentHTML('afterend',html);else nav.insertAdjacentHTML('beforeend',html);
}
function buildStudent(){
var u=cur();if(!u||u.role!=='student')return;
if(!document.getElementById('section-fcGames')){
var sec=document.createElement('section');sec.className='section';sec.id='section-fcGames';
sec.innerHTML='<div class="section-header"><div><h2 class="section-title">🎮 الألعاب</h2><p class="text-sm text-muted">العب واكسب — أول مرة بنقاط وبعدها تدريب</p></div><div style="display:flex;gap:8px;"><button class="btn btn-ghost btn-sm" onclick="window.fcMyResults()">📊 نتائجي</button></div></div><div id="fcStudentGames" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;"></div>';
var ch=document.getElementById('section-challenges');
if(ch&&ch.parentNode)ch.parentNode.insertBefore(sec,ch.nextSibling);
else document.querySelector('.content-area').appendChild(sec);
}
sidebarItem(document.getElementById('sidebarNav'),'fcGames','الألعاب','🎮','challenges');
var ps=document.getElementById('section-points');
if(ps&&!ps.__fcPt){
ps.__fcPt=1;
var t=ps.querySelector('.section-title');if(t)t.textContent='🎯 مركز التحفيز';
var hdr=ps.querySelector('.section-header');
var wrap=document.createElement('div');wrap.id='fcPtMain';
Array.prototype.slice.call(ps.children).forEach(function(n){if(n!==hdr)wrap.appendChild(n);});
var bar=document.createElement('div');bar.className='filter-bar';bar.style.marginBottom='12px';
bar.innerHTML='<button class="filter-btn active" onclick="window.fcPtTab(\'main\',this)">🏆 نقاطي وترتيبي</button><button class="filter-btn" onclick="window.fcPtTab(\'quiz\',this)">🧠 سؤال اليوم</button><button class="filter-btn" onclick="window.fcPtTab(\'missions\',this)">🎯 مهامي</button><button class="filter-btn" onclick="window.fcPtTab(\'badges\',this)">🏅 شاراتي</button>';
ps.appendChild(bar);ps.appendChild(wrap);
var qz=document.createElement('div');qz.id='fcPtQuiz';qz.style.display='none';ps.appendChild(qz);
var ms=document.createElement('div');ms.id='fcPtMissions';ms.style.display='none';ps.appendChild(ms);
var bd=document.createElement('div');bd.id='fcPtBadges';bd.style.display='none';ps.appendChild(bd);
var nav=document.getElementById('sidebarNav');
var pi=nav?nav.querySelector('[data-section="points"]'):null;
if(pi){var lb=pi.querySelector('.sidebar-item-label');if(lb)lb.textContent='مركز التحفيز';var ic=pi.querySelector('.sidebar-item-icon');if(ic)ic.textContent='🎯';}
}
var nav2=document.getElementById('sidebarNav');
if(nav2){
var seen={};
Array.prototype.forEach.call(nav2.querySelectorAll('.sidebar-item'),function(it){
var lb=(it.querySelector('.sidebar-item-label')||{}).textContent||'';
if(lb.indexOf('مركز التحفيز')>=0){if(seen['تحفيز']){it.style.display='none';}else seen['تحفيز']=1;}
});
}
}
window.fcPtTab=function(k,btn){
['main','quiz','missions','badges'].forEach(function(x){var el=document.getElementById('fcPt'+x.charAt(0).toUpperCase()+x.slice(1));if(el)el.style.display=(x===k)?'':'none';});
if(btn)btn.parentNode.querySelectorAll('.filter-btn').forEach(function(b){b.classList.toggle('active',b===btn);});
SND.click();
renderPtTabs();
};
function renderPtTabs(){
var u=cur();if(!u)return;
var qz=document.getElementById('fcPtQuiz');if(qz&&qz.style.display!=='none')qz.innerHTML=renderQuiz(u.id);
var ms=document.getElementById('fcPtMissions');if(ms&&ms.style.display!=='none')ms.innerHTML=renderMissions(u.id);
var bd=document.getElementById('fcPtBadges');if(bd&&bd.style.display!=='none')bd.innerHTML=renderBadges(u.id)+renderBoard()+renderFact();
}
function buildStaff(){
var u=cur();if(!u||['teacher','assistant','admin','super_admin'].indexOf(u.role)<0)return;
if(!document.getElementById('section-fcGamesStaff')){
var sec=document.createElement('section');sec.className='section';sec.id='section-fcGamesStaff';
sec.innerHTML='<div class="section-header"><div><h2 class="section-title">🎮 مصنع الألعاب</h2><p class="text-sm text-muted">14 قالب + سبورة + ليدربورد + نشر للطلاب</p></div><div style="display:flex;gap:8px;"><button class="btn btn-success btn-sm" onclick="window.fcOpenBuilder()">🏭 لعبة جديدة</button><button class="btn btn-ghost btn-sm" onclick="window.openEngagementManager()">🎯 التحفيز</button></div></div>'+
'<div class="filter-bar" style="margin-bottom:12px;"><button class="filter-btn active" onclick="window.fcStaffTab(\'games\',this)">🎮 الألعاب والسبورة</button><button class="filter-btn" onclick="window.fcStaffTab(\'results\',this)">📊 النتائج والترتيب</button></div>'+
'<div id="fcTabGames"><div id="fcStaffGames" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;"></div></div>'+
'<div id="fcTabResults" style="display:none;"><div id="fcStaffResults"></div></div>';
var ch=document.getElementById('section-challenges');
if(ch&&ch.parentNode)ch.parentNode.insertBefore(sec,ch.nextSibling);
else document.querySelector('.content-area').appendChild(sec);
}
(function(){
var nav=document.getElementById('sidebarNav');if(!nav)return;
if(nav.querySelector('[data-section="fcGamesStaff"]'))return;
var html='<div class="sidebar-item" data-section="fcGamesStaff" onclick="window.showSection(\'fcGamesStaff\')"><span class="sidebar-item-icon">🎮</span><span class="sidebar-item-label">مصنع الألعاب</span></div>';
var a=nav.querySelector('[data-section="challenges"]')||nav.querySelector('[data-section="gamification"]')||nav.querySelector('[data-section="points"]');
if(a)a.insertAdjacentHTML('beforebegin',html);else nav.insertAdjacentHTML('afterbegin',html);
})();
}
window.fcStaffTab=function(k,btn){
var g=document.getElementById('fcTabGames'),r=document.getElementById('fcTabResults');
if(g)g.style.display=(k==='games')?'':'none';
if(r)r.style.display=(k==='results')?'':'none';
if(btn)btn.parentNode.querySelectorAll('.filter-btn').forEach(function(b){b.classList.toggle('active',b===btn);});
if(k==='games')window.fcRenderStaffGames();
if(k==='results')window.fcRenderStaffResults();
};
function hook(){
if(typeof window.showSection==='function'&&!window.__fcHook2){
window.__fcHook2=1;
var os=window.showSection;
window.showSection=function(id){
var r=os.apply(this,arguments);
try{
if(id==='fcGames'){window.fcRenderStudentGames();}
if(id==='fcGamesStaff'){window.fcRenderStaffGames();window.fcRenderStaffResults();}
if(id==='points'){renderPtTabs();}
}catch(e){}
return r;
};
}
}
function injectStaffTiles(){
try{
var u=cur();if(!u||u.role!=='admin')return;
var first=document.querySelector('#section-command .quick-action')||document.querySelector('#section-overview .quick-action');
if(!first||!first.parentNode)return;
if(!document.getElementById('qaGameFactory')){
var b=document.createElement('button');b.type='button';b.className='quick-action';b.id='qaGameFactory';
b.innerHTML='<div class="quick-action-icon">🏭</div><div class="quick-action-label">مصنع الألعاب</div>';
b.onclick=function(){window.showSection('fcGamesStaff');};
first.parentNode.insertBefore(b,first.nextSibling);
}
}catch(e){}
}

function init(){
var u=cur();if(!u)return;
if(u.role==='student'){streakBonus(u.id);buildStudent();hook();window.fcRenderStudentGames();renderPtTabs();setTimeout(function(){buildStudent();window.fcRenderStudentGames();},1200);}
else{buildStaff();hook();window.fcRenderStaffGames();setTimeout(function(){buildStaff();window.fcRenderStaffGames();},1200);}
}
injectStaffTiles();setTimeout(injectStaffTiles,1200);setTimeout(injectStaffTiles,3000);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,700);});else setTimeout(init,700);
setTimeout(init,2500);
})();