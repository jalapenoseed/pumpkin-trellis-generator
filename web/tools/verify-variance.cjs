const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
const tabs=await(await fetch('http://127.0.0.1:'+(process.env.AUTUMN_QA_PORT||9275)+'/json')).json(),ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const pending=new Map(),errors=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,t=setTimeout(()=>reject(Error(method+' timeout')),90000);pending.set(n,m=>{clearTimeout(t);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)});ws.send(JSON.stringify({id:n,method,params}));});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url:process.env.AUTUMN_PREVIEW_URL||'http://127.0.0.1:8136/autumn.html'});
for(let i=0;i<80;i++){if(await ev('!!window.autumnPreview'))break;await new Promise(r=>setTimeout(r,250));}
const result=await ev('('+function(){
 const A=AutumnAssets,T=THREE,P=autumnPreview,$=id=>document.getElementById(id),check=(v,m)=>{if(!v)throw Error(m);},set=(k,v)=>{$(k).value=v;},bounds=g=>{g.computeBoundingBox();return g.boundingBox.getSize(new T.Vector3()).toArray();};
 const defaults={};document.querySelectorAll('aside input,aside select').forEach(e=>defaults[e.id]=e.type==='checkbox'?e.checked:e.value);
 const restore=()=>{for(const [k,v] of Object.entries(defaults)){if($(k).type==='checkbox')$(k).checked=v;else $(k).value=v;}};
 P.setView('pumpkin');let base=bounds(P.kit.fruit(0));set('pumpkinWidth',1.8);set('pumpkinHeight',.4);P.generate();let changed=bounds(P.kit.fruit(0));check(changed[0]>base[0]*1.6&&changed[1]<base[1]*.5,'Pumpkin dimensions');
 const hash=g=>Array.from(g.attributes.position.array).reduce((a,v,i)=>a+v*(i%17+1),0);
 let ribs=hash(P.kit.fruit(0));set('ribCount',17);set('ribDepth',.22);P.generate();check(hash(P.kit.fruit(0))!==ribs,'Rib geometry changes');
 restore();P.setView('flower');base=bounds(P.kit.flower());set('flowerOpen',.15);P.generate();changed=bounds(P.kit.flower());check(changed[0]<base[0]*.3,'Flower opening');set('flowerPetals',8);P.generate();check(Number.isFinite(hash(P.kit.flower())),'Flower petals finite');
 restore();set('flowerDensity',0);P.setView('trellis');let flowers=0;P.patch.root.traverse(m=>{if(m.material?.name==='flower')flowers+=m.count||1;});check(flowers===0,'Zero blossom frequency');
 for(const support of ['arch','wooden','fence']){set('trellis',support);for(const [k,v] of Object.entries({trellisWidth:5,trellisHeight:1.8,archRise:2.5,trellisLength:6,railSpacing:.2,supportThickness:2,vineCurl:2.5,flowerDensity:2}))set(k,v);check(P.generate(true),'Extreme '+support);P.patch.root.traverse(m=>{if(m.geometry)check(Array.from(m.geometry.attributes.position.array).every(Number.isFinite),'Finite geometry '+support);});}
 restore();set('variation',0);set('shape','round');P.setView('field');check(new Set(P.patch.data.plants.map(p=>p.size)).size===1,'Zero variation gives uniform sizes');const before=JSON.stringify(P.patch.data.plants);P.generate();check(before===JSON.stringify(P.patch.data.plants),'Repeatable seed');set('seed',1936);P.generate();check(before!==JSON.stringify(P.patch.data.plants),'Different seed');
 restore();P.setView('vine');let vines=hash(P.patch.chunks[0].levels[0].children.find(m=>m.material?.name==='vine').geometry);set('vineCurl',2.5);set('tendrilTurns',5);set('vineThickness',2);P.generate();check(vines!==hash(P.patch.chunks[0].levels[0].children.find(m=>m.material?.name==='vine').geometry),'Vine geometry changes');
 // Exercise the actual debounced slider event, rather than only direct generation.
 restore();P.setView('pumpkin');set('ribDepth',.19);$('ribDepth').dispatchEvent(new Event('input',{bubbles:true}));
 return {pumpkinDimensions:true,ribs:true,flowerOpening:true,flowerCountZero:true,supportExtremes:true,finiteGeometry:true,seedRepeatable:true,zeroVariation:true,vines:true};
}.toString()+')()');
await new Promise(r=>setTimeout(r,600));assert.equal(await ev('autumnPreview.settings().ribDepth'),.19);assert.equal(await ev('document.getElementById("error").textContent'),'');
await ev('document.getElementById("ribDepth").value=.1;autumnPreview.generate()');
const out=path.resolve(__dirname,'../.qa/autumn');fs.mkdirSync(out,{recursive:true});
for(const view of ['pumpkin','flower','trellis']){await ev('autumnPreview.setView('+JSON.stringify(view)+')');await new Promise(r=>setTimeout(r,700));const s=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'v030-'+view+'.png'),Buffer.from(s.data,'base64'));}
assert.equal(errors.length,0,JSON.stringify(errors));result.errors=errors;result.device='Windows Chrome, 390x844 emulation; not physical Safari';fs.writeFileSync(path.join(out,'variance-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));ws.close();
})().catch(e=>{console.error(e);process.exit(1)});
