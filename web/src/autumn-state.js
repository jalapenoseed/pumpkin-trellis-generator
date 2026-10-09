/* Additive save extension. Existing cabin state/version remains owned by HomesteadRules. */
(function(root){'use strict';
const fresh=()=>({version:1,picked:[],seeds:12,carried:0,stored:0,harvested:0,day:1,plots:Array.from({length:4},(_,i)=>({planted:i<2,growth:i<2?240:0,water:0,seed:19350+i}))});
const valid=s=>s&&s.version===1&&['seeds','carried','stored','harvested','day'].every(k=>Number.isInteger(s[k])&&s[k]>=0&&s[k]<(k==='carried'?2:1000001))&&(!s.picked||(Array.isArray(s.picked)&&s.picked.length<=2000&&s.picked.every(k=>typeof k==='string'&&k.length<100)))&&Array.isArray(s.plots)&&s.plots.length===4&&s.plots.every(p=>p&&typeof p.planted==='boolean'&&Number.isFinite(p.growth)&&p.growth>=0&&p.growth<=240&&Number.isFinite(p.water)&&p.water>=0&&p.water<=180&&Number.isInteger(p.seed)&&p.seed>=0);
function ensure(h){if(!h.autumn)h.autumn=fresh();if(!valid(h.autumn))return null;h.autumn.picked??=[];return h.autumn;}
function act(h,id,index){const s=ensure(h),p=s?.plots[index];if(!s)return 'Autumn save needs repair; it has been preserved.';
 if(id==='store'){if(!s.carried)return 'Carry a pumpkin here first';if(s.stored>=999)return 'Pumpkin storage is full';s.carried=0;s.stored++;return 'Pumpkin stored · '+s.stored+' in the crate';}
 if(id==='gather'){if(s.carried||h.pack.wood||h.activities.tool!=='hands'||h.rod==='equipped'||h.wilds?.hunt?.gun==='carried')return 'Free your hands before harvesting';s.carried=1;s.harvested++;s.seeds=Math.min(999,s.seeds+2);return 'Field pumpkin harvested · carry it to the porch crate';}
 if(!p)return 'Choose a growing bed';
 if(id==='plant'){if(p.planted)return 'This bed is occupied';if(!s.seeds)return 'No pumpkin seeds left';if(h.activities.tool!=='trowel')return 'Equip the trowel to plant';s.seeds--;p.planted=true;p.growth=0;p.water=0;return 'Pumpkin planted · water it to grow';}
 if(id==='water'){if(!p.planted)return 'Plant the bed first';if(h.activities.tool!=='wateringCan')return 'Equip the watering can';if(!h.activities.water)return 'Refill the watering can at the yard pump';if(p.water>120)return 'The soil is still damp';h.activities.water--;p.water=180;return 'Pumpkin watered';}
 if(id==='harvest'){if(!p.planted||p.growth<240)return 'The pumpkin is not ripe';if(s.carried||h.pack.wood||h.activities.tool!=='hands'||h.rod==='equipped'||h.wilds?.hunt?.gun==='carried')return 'Free your hands before harvesting';s.carried=1;s.harvested++;s.seeds=Math.min(999,s.seeds+2);p.planted=false;p.growth=0;p.water=0;return 'Pumpkin in your arms · carry it to the porch crate';}
 return 'Unknown autumn action';}
function tick(h,dt){const s=ensure(h);if(!s||!Number.isFinite(dt)||dt<=0)return;const day=Math.max(0,h.day-s.day);s.day=h.day;for(const p of s.plots){const t=Math.min(180,dt+day*120);if(p.planted)p.growth=Math.min(240,p.growth+Math.min(t,p.water));p.water=Math.max(0,p.water-t);}}
const api={fresh,valid,ensure,act,tick};root.AutumnRules=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
