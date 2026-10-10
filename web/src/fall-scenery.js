/* Fall Scenery Generator 0.1.0 — Full autumn add-ons: colored trees, ground leaf litter, optional pumpkin patches & trellises.
   Seeded, tiered, Three.js compatible. Composes with AutumnAssets when available. Metres, Y-up. */
(function(scope){
'use strict';
const VERSION='0.1.0', TAU=Math.PI*2;
const TIERS={
  high:{treeLevels:4, leafClusters:80, litter:1200, trunkSegs:12, shadow:true},
  medium:{treeLevels:3, leafClusters:40, litter:600, trunkSegs:8, shadow:true},
  mobile:{treeLevels:2, leafClusters:18, litter:250, trunkSegs:6, shadow:false}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}

function options(o={}){
  const n=(k,d,a,b)=>clamp(Number.isFinite(+o[k])?+o[k]:d,a,b);
  return {
    ...o,
    seed:n('seed',42069,0,4294967295)>>>0,
    width:n('width',40,8,200),
    length:n('length',40,8,200),
    treeDensity:n('treeDensity',0.012,0,0.08),
    treeScale:n('treeScale',1,0.4,2.2),
    leafLitter:n('leafLitter',1,0,2.5),
    colorBias:['mixed','orange','yellow','red','brown'].includes(o.colorBias)?o.colorBias:'mixed',
    includePumpkins:o.includePumpkins!==false,
    includeTrellis:o.includeTrellis!==false,
    pumpkinDensity:n('pumpkinDensity',0.15,0,0.6),
    trellisCount:n('trellisCount',2,0,8)|0,
    tier:TIERS[o.tier]?o.tier:'medium',
    season:['early-fall','late-fall','peak'].includes(o.season)?o.season:'peak'
  };
}

function createKit(T,tier='medium'){
  const q=TIERS[tier]||TIERS.medium;
  const geometries=new Map(), materials={}, textures=[];
  function makeLeafTexture(colorHex){
    const c=document.createElement('canvas'); c.width=c.height=128;
    const ctx=c.getContext('2d');
    const g=ctx.createRadialGradient(64,64,8,64,64,60);
    const col=new T.Color(colorHex);
    g.addColorStop(0,col.getStyle());
    g.addColorStop(0.7,col.clone().offsetHSL(0,0,-0.15).getStyle());
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,128,128);
    ctx.strokeStyle='rgba(80,40,10,0.35)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(64,20); ctx.lineTo(64,100); ctx.stroke();
    const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; textures.push(t); return t;
  }
  const leafColors={
    orange:makeLeafTexture(0xe07a1a),
    yellow:makeLeafTexture(0xf0c040),
    red:makeLeafTexture(0xc43a1a),
    brown:makeLeafTexture(0x8a5a2a),
    green:makeLeafTexture(0x4a7a32)
  };
  function mat(name,color,map,rough=0.85,metal=0){
    const m=new T.MeshStandardMaterial({name,color:new T.Color(color).convertSRGBToLinear(),map,roughness:rough,metalness:metal,side:T.DoubleSide,transparent:!!map,alphaTest:map?0.15:0});
    materials[name]=m; return m;
  }
  mat('trunk',0x6b4a2a,null,0.92);
  mat('branch',0x5a3d22,null,0.9);
  Object.entries(leafColors).forEach(([k,tex])=>mat('leaf-'+k,0xffffff,tex,0.7));
  function simpleTreeGeometry(levels,scale,seed){
    const key='tree'+levels+':'+Math.floor(scale*10)+':'+seed;
    if(geometries.has(key))return geometries.get(key);
    const r=rng(seed);
    const pieces=[];
    function branch(origin,dir,len,rad,level){
      if(level>levels||len<0.3)return;
      const pts=[];
      for(let i=0;i<=6;i++){
        const t=i/6;
        const wobble=new T.Vector3((r()-.5)*0.15*t,(r()-.5)*0.08*t,(r()-.5)*0.15*t);
        pts.push(origin.clone().add(dir.clone().multiplyScalar(len*t)).add(wobble));
      }
      const curve=new T.CatmullRomCurve3(pts);
      const tube=new T.TubeGeometry(curve,6,rad,6,false);
      pieces.push(tube);
      if(level<levels){
        const kids=level===0?3:2;
        for(let k=0;k<kids;k++){
          const end=pts[pts.length-1];
          const yaw=(r()-.5)*1.4, pitch=0.6+r()*0.6;
          const childDir=dir.clone().applyEuler(new T.Euler(pitch,yaw,0)).normalize();
          branch(end,childDir,len*(0.55+r()*0.2),rad*0.55,level+1);
        }
      }
    }
    branch(new T.Vector3(0,0,0),new T.Vector3(0,1,0),2.8*scale,0.18*scale,0);
    const geo=pieces.length?merge(pieces):new T.BufferGeometry();
    geo.userData={canopyY:3.2*scale,canopyR:2.4*scale};
    geometries.set(key,geo);
    return geo;
  }
  function merge(list){
    if(!list.length)return new T.BufferGeometry();
    const P=[],N=[],U=[];
    for(const g0 of list){
      const g=g0.index?g0.toNonIndexed():g0;
      const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
      P.push(...p.array); N.push(...(n?n.array:new Array(p.count*3).fill(0)));
      if(u)U.push(...u.array); else U.push(...new Array(p.count*2).fill(0));
      if(g!==g0)g.dispose(); g0.dispose();
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(P,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(N,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(U,2));
    g.computeBoundingSphere();
    return g;
  }
  function leafPlane(){
    if(geometries.has('leafPlane'))return geometries.get('leafPlane');
    const g=new T.PlaneGeometry(0.28,0.22);
    g.translate(0,0.11,0);
    geometries.set('leafPlane',g);
    return g;
  }
  function dispose(){
    for(const g of geometries.values())g.dispose();
    for(const m of Object.values(materials))m.dispose();
    textures.forEach(t=>t.dispose());
  }
  return {T,tier,q,materials,leafColors,simpleTreeGeometry,leafPlane,merge,dispose};
}

function layoutTrees(o,terrain={}){
  const r=rng(o.seed), trees=[], sample=terrain.heightAt||(()=>0), suitable=terrain.suitable||(()=>true);
  const count=Math.floor(o.width*o.length*o.treeDensity);
  for(let i=0;i<count*3&&trees.length<count;i++){
    const x=(r()-.5)*o.width, z=(r()-.5)*o.length;
    if(!suitable(x,z))continue;
    const y=sample(x,z);
    if(!Number.isFinite(y))continue;
    trees.push({x,y,z,scale:o.treeScale*(0.7+r()*0.6),yaw:r()*TAU,seed:Math.floor(r()*1e9),color:o.colorBias==='mixed'?['orange','yellow','red','brown'][Math.floor(r()*4)]:o.colorBias});
  }
  return trees;
}

function build(T,input={},terrain={},existingKit){
  const o=options(input);
  const kit=existingKit||createKit(T,o.tier);
  const root=new T.Group(); root.name='Fall Scenery';
  const owned=[];
  const sample=terrain.heightAt||(()=>0);
  const trees=layoutTrees(o,terrain);
  const leafPlane=kit.leafPlane();
  const palette=o.colorBias==='mixed'?['orange','yellow','red','brown']:[o.colorBias];

  for(const t of trees){
    const g=new T.Group();
    g.position.set(t.x,t.y,t.z);
    g.rotation.y=t.yaw;
    const trunkGeo=kit.simpleTreeGeometry(kit.q.treeLevels,t.scale,t.seed);
    const trunk=new T.Mesh(trunkGeo,kit.materials.trunk);
    trunk.castShadow=kit.q.shadow;
    trunk.receiveShadow=true;
    g.add(trunk);
    owned.push(trunkGeo);

    const clusters=Math.floor(kit.q.leafClusters*(0.6+Math.random()*0.8));
    const leaves=[];
    const r=rng(t.seed+17);
    const canopyY=trunkGeo.userData.canopyY||3*t.scale;
    const canopyR=trunkGeo.userData.canopyR||2*t.scale;
    for(let i=0;i<clusters;i++){
      const a=r()*TAU, dist=Math.sqrt(r())*canopyR*0.85;
      const h=canopyY*(0.55+r()*0.5);
      const px=Math.cos(a)*dist, pz=Math.sin(a)*dist;
      const m=new T.Matrix4().compose(
        new T.Vector3(px,h,pz),
        new T.Quaternion().setFromEuler(new T.Euler((r()-.5)*0.6,r()*TAU,(r()-.5)*0.4)),
        new T.Vector3(0.7+r()*0.8,0.7+r()*0.8,0.7+r()*0.8)
      );
      const col=palette[Math.floor(r()*palette.length)];
      leaves.push({m,color:col});
    }
    const byColor={};
    leaves.forEach(l=>{(byColor[l.color]||(byColor[l.color]=[])).push(l);});
    for(const [col,items] of Object.entries(byColor)){
      const mesh=new T.InstancedMesh(leafPlane,kit.materials['leaf-'+col],items.length);
      items.forEach((a,i)=>mesh.setMatrixAt(i,a.m));
      mesh.instanceMatrix.needsUpdate=true;
      mesh.castShadow=false;
      mesh.frustumCulled=false;
      g.add(mesh);
    }
    root.add(g);
  }

  const litterCount=Math.floor(kit.q.litter*o.leafLitter);
  if(litterCount>0){
    const litter=[];
    const r=rng(o.seed+99);
    for(let i=0;i<litterCount;i++){
      const x=(r()-.5)*o.width*0.95, z=(r()-.5)*o.length*0.95;
      const y=sample(x,z)+0.015;
      const m=new T.Matrix4().compose(
        new T.Vector3(x,y,z),
        new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2+(r()-.5)*0.3,r()*TAU,0)),
        new T.Vector3(0.6+r()*0.7,0.6+r()*0.7,1)
      );
      const col=palette[Math.floor(r()*palette.length)];
      litter.push({m,color:col});
    }
    const byColor={};
    litter.forEach(l=>{(byColor[l.color]||(byColor[l.color]=[])).push(l);});
    for(const [col,items] of Object.entries(byColor)){
      const mesh=new T.InstancedMesh(leafPlane,kit.materials['leaf-'+col],items.length);
      items.forEach((a,i)=>mesh.setMatrixAt(i,a.m));
      mesh.instanceMatrix.needsUpdate=true;
      mesh.receiveShadow=true;
      mesh.frustumCulled=false;
      root.add(mesh);
    }
  }

  let autumnRoot=null;
  if((o.includePumpkins||o.includeTrellis)&&scope.AutumnAssets){
    const autumnOpts={
      seed:o.seed+1, width:o.width*0.7, length:o.length*0.7,
      density:o.includePumpkins?o.pumpkinDensity:0,
      scale:0.9, tier:o.tier==='high'?'high':o.tier,
      season:o.season==='peak'?'early-fall':o.season,
      trellis:o.includeTrellis&&o.trellisCount>0?'wooden':'off',
      trellisWidth:3.2, trellisHeight:2.6
    };
    const built=scope.AutumnAssets.build(T,autumnOpts,terrain);
    autumnRoot=built.root;
    root.add(autumnRoot);
  }

  function dispose(){
    root.removeFromParent();
    owned.forEach(g=>g.dispose());
    root.traverse(m=>{if(m.isInstancedMesh)m.dispose?.();});
    if(!existingKit)kit.dispose();
  }
  return {root,kit,trees:trees.length,litter:litterCount,dispose,stats:()=>({trees:trees.length,litter:litterCount,hasAutumn:!!autumnRoot})};
}

scope.FallScenery={VERSION,TIERS,rng,options,createKit,layoutTrees,build};
})(typeof window!=='undefined'?window:globalThis);
