/* Autumn 0.4.0. Original procedural geometry; metres, Y-up. No game globals. */
(function(scope){
'use strict';
const VERSION='0.4.0',TAU=Math.PI*2;
const TIERS={high:{rings:48,segments:128,leafRings:9,leafSegments:80,maxPlants:400,leaves:16,shadow:true,near:22,far:60,cull:180},medium:{rings:24,segments:64,leafRings:6,leafSegments:48,maxPlants:300,leaves:12,shadow:true,near:16,far:50,cull:120},mobile:{rings:14,segments:36,leafRings:4,leafSegments:32,maxPlants:200,leaves:8,shadow:false,near:10,far:32,cull:80}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function options(o={}){const n=(k,d,a,b)=>clamp(Number.isFinite(+o[k])?+o[k]:d,a,b);return {...o,seed:n('seed',1935,0,4294967295)>>>0,width:n('width',12,1,120),length:n('length',10,1,120),density:n('density',.3,0,2),scale:n('scale',1,.2,2.5),sizeMin:n('sizeMin',.75,.2,2),sizeMax:n('sizeMax',1.25,.2,2.5),growth:n('growth',1,.05,1.25),vineLength:n('vineLength',2.1,.2,6),branching:n('branching',2,0,4)|0,leafDensity:n('leafDensity',1,0,2),internode:n('internode',.3,.15,.9),branchAngle:n('branchAngle',.7,.2,1.5),trellisWidth:n('trellisWidth',2.4,1,5),trellisHeight:n('trellisHeight',2.5,1.8,4),trellisLength:n('trellisLength',2,1,6),variation:n('variation',.5,0,1),pumpkinWidth:n('pumpkinWidth',1,.5,1.8),pumpkinHeight:n('pumpkinHeight',1,.4,1.8),ribCount:n('ribCount',10,5,18)|0,ribDepth:n('ribDepth',.1,0,.23),stemCurl:n('stemCurl',1,0,2.5),vineCurl:n('vineCurl',1,0,2.5),vineThickness:n('vineThickness',1,.5,2),tendrilTurns:n('tendrilTurns',2,1,5),flowerDensity:n('flowerDensity',.4,0,2),flowerSize:n('flowerSize',1,.4,2),flowerOpen:n('flowerOpen',1,.15,1),flowerPetals:n('flowerPetals',5,4,8)|0,archRise:n('archRise',1.2,.25,2.5),railSpacing:n('railSpacing',.35,.2,.8),supportThickness:n('supportThickness',1,.5,2),tier:TIERS[o.tier]?o.tier:'mobile',season:['summer','early-fall','late-fall'].includes(o.season)?o.season:'early-fall',health:['green','yellow','dried'].includes(o.health)?o.health:'green',color:['mixed','orange','green','white'].includes(o.color)?o.color:'mixed',shape:['mixed','round','tall','squat','flat','warty'].includes(o.shape)?o.shape:'mixed',trellis:['arch','wooden','fence'].includes(o.trellis)?o.trellis:'off',climbing:o.climbing!==false};}
function layout(input={},terrain={}){const o=options(input),r=rng(o.seed),budget=TIERS[o.tier].maxPlants,w=o.width,l=o.length,requested=Math.floor(w*l*o.density),plants=[],occupied=new Map(),sample=terrain.heightAt||(()=>0),suitable=terrain.suitable||(()=>true),minSpace=.52*o.scale,cell=minSpace;
 let attempts=0;while(plants.length<Math.min(requested,budget)&&attempts++<Math.min(requested,budget)*35){const x=(r()-.5)*w,z=(r()-.5)*l,y=sample(x,z);if(!Number.isFinite(y)||!suitable(x,z))continue;const slope=Math.hypot(sample(x+.25,z)-sample(x-.25,z),sample(x,z+.25)-sample(x,z-.25))/.5;if(slope>.65)continue;const ix=Math.floor(x/cell),iz=Math.floor(z/cell);let hit=false;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const p of occupied.get((ix+a)+','+(iz+b))||[])if(Math.hypot(x-p.x,z-p.z)<minSpace)hit=true;if(hit)continue;
 const p={id:o.seed+'-'+plants.length,x,y,z,yaw:r()*TAU,size:(o.sizeMin+(.5+(r()-.5)*o.variation)*Math.max(0,o.sizeMax-o.sizeMin))*o.scale,variant:o.shape==='mixed'?Math.floor(r()*7):({round:0,tall:1,squat:2,flat:3,warty:6}[o.shape]),color:o.color==='mixed'?Math.floor(r()*7):({orange:0,white:4,green:5}[o.color]),seed:Math.floor(r()*4294967295)};plants.push(p);const k=ix+','+iz;if(!occupied.has(k))occupied.set(k,[]);occupied.get(k).push(p);}
 return {version:VERSION,options:o,plants,requested,capped:requested>budget,rejected:attempts-plants.length};}
function createKit(T,tier='mobile',input={}){
 const settings=options(input);
 const q=TIERS[tier]||TIERS.mobile,geometries=new Map(),materials={},textures=[],clock={value:0};
 function textureSet(kind){
 const n=kind==='skin'?512:256,r=rng(kind==='leaf'?811:kind==='wood'?993:321),make=()=>{const c=document.createElement('canvas');c.width=c.height=n;return c;},canvas=make(),ctx=canvas.getContext('2d'),im=ctx.createImageData(n,n),h=new Float32Array(n*n),roughness=new Float32Array(n*n);
 const hash=(x,y)=>{let v=Math.imul(x,374761393)+Math.imul(y,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;};
 const noise=(x,y)=>{let ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 const i=y*n+x,fine=r(),broad=noise(x/43,y/43),mid=noise(x/12,y/12),micro=noise(x/2,y/2),grain=Math.sin(x*.7+noise(x/22,y/35)*9),pore=Math.max(0,fine-.91)*5;let c;
 if(kind==='skin'){
 const u=x/n*TAU,v=y/n*TAU,cloud=(Math.sin(u*7+Math.sin(v*3))*.5+Math.sin(v*11+Math.cos(u*4))*.3+Math.sin(u*21-v*9)*.2)*.5+.5;
 const fleck=Math.pow(Math.max(0,Math.sin(u*73+Math.sin(v*31)*2)*Math.sin(v*89+Math.sin(u*27))),14);
 const streak=Math.pow(Math.max(0,Math.sin(u*43+Math.sin(v*4)*.7)),28)*Math.pow(Math.max(0,Math.sin(v*9+u*3)),8);
 const pores=Math.sin(u*157+Math.cos(v*53))*Math.sin(v*173+Math.sin(u*39));
 const shade=225+cloud*25-fleck*59-streak*28;
 h[i]=.48+pores*.023-fleck*.025+streak*.075;
 c=[shade,shade-4-streak*12,shade-13-streak*18];roughness[i]=192+cloud*25+fleck*27+streak*20;
 }
 else if(kind==='wood'){const fissure=Math.pow(Math.max(0,grain),8);h[i]=.36+fissure*.25+mid*.12+fine*.035;c=[147+broad*62+grain*24,136+broad*58+grain*23,111+broad*52+grain*23];roughness[i]=211+broad*35;}
 else {const pale=Math.max(0,mid-.48),vein=Math.pow(Math.max(0,Math.cos((x-128)*.045+Math.abs(y-128)*.043)),24);h[i]=.47+vein*.07+(micro-.5)*.038;c=[137+broad*40+pale*70+vein*15,168+broad*32+pale*34+vein*10,100+broad*34+pale*52];roughness[i]=186+broad*33+fine*9;}
 for(let k=0;k<3;k++)im.data[i*4+k]=c[k];im.data[i*4+3]=255;
 }ctx.putImageData(im,0,0);
 const normal=make(),rough=make(),heightCanvas=make(),ni=ctx.createImageData(n,n),ri=ctx.createImageData(n,n),hi=ctx.createImageData(n,n);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,dx=(h[y*n+(x+1)%n]-h[y*n+(x+n-1)%n])*2,dy=(h[((y+1)%n)*n+x]-h[((y+n-1)%n)*n+x])*2,len=Math.hypot(dx,dy,1);ni.data.set([128-dx/len*127,128-dy/len*127,128+127/len,255],i*4);const v=roughness[i];ri.data.set([v,v,v,255],i*4);hi.data.set([h[i]*255,h[i]*255,h[i]*255,255],i*4);}
 normal.getContext('2d').putImageData(ni,0,0);rough.getContext('2d').putImageData(ri,0,0);heightCanvas.getContext('2d').putImageData(hi,0,0);
 return [canvas,normal,rough,heightCanvas].map((c,i)=>{const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;if(i===0)t.encoding=T.sRGBEncoding;textures.push(t);return t;});
 }
 const skin=textureSet('skin'),leaf=textureSet('leaf'),wood=textureSet('wood');
 function mat(name,color,maps,roughness=.8,metalness=0){const m=new T.MeshStandardMaterial({name,color:new T.Color(color).convertSRGBToLinear(),roughness,metalness,map:maps?.[0],normalMap:maps?.[1],roughnessMap:maps?.[2]});m.normalScale?.set(.32,.32);materials[name]=m;return m;}
 mat('fruit',0xffffff,skin,.78);mat('stem',0xa38e68,wood,.98);materials.fruit.metalness=0.02;materials.fruit.normalScale.set(0.85,0.85);if(materials.fruit.clearcoat!==undefined){materials.fruit.clearcoat=0.12;materials.fruit.clearcoatRoughness=0.4;}mat('leaf',0xffffff,leaf,.88);mat('vine',0x597134,wood,.92);mat('flower',0xffbe27,skin,.8);mat('metal',0x465151,null,.48,.78);mat('timber',0x978267,wood,.95);mat('vein',0x94ab52,null,.97);
 materials.fruit.normalScale.set(.65,.65);materials.stem.normalScale.set(.7,.7);
 for(const key of ['map','normalMap','roughnessMap']){const t=materials.stem[key].clone();t.center.set(.5,.5);t.rotation=Math.PI/2;t.needsUpdate=true;textures.push(t);materials.stem[key]=t;}
 function wind(m,depth=false){m.onBeforeCompile=s=>{s.uniforms.autumnTime=clock;s.vertexShader='uniform float autumnTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vec3 ap=position;\n #ifdef USE_INSTANCING\n ap=(instanceMatrix*vec4(position,1.0)).xyz;\n #endif\n float aw=length(position.xz); transformed.y+=sin(autumnTime*1.8+ap.x*1.7+ap.z)*0.025*aw;');if(!depth)s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n if(!gl_FrontFacing)diffuseColor.rgb*=vec3(1.16,1.12,.85);');};m.customProgramCacheKey=()=> 'autumn-wind-v2'+depth;}
 materials.leaf.vertexColors=true;wind(materials.leaf);wind(materials.vein);const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});wind(depth,true);
 function buffer(pos,uv,idx){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g;}
 function fruit(variant=0,lod=0){const key='fruit'+variant+':'+lod;if(geometries.has(key))return geometries.get(key);
  const baseRings = settings.inspection ? 64 : q.rings;
  const baseSegs  = settings.inspection ? 160 : q.segments;
  const nr = Math.max(8, Math.round(baseRings / (lod===0?1:lod===1?2:3.5)));
  const ns = Math.max(20, Math.round(baseSegs / (lod===0?1:lod===1?1.6:3)));
  const P=[], U=[], I=[];
  const rib = settings.ribCount + variant % 3;
  const ratio = [1, 1.45, 0.68, 0.5, 1.08, 0.78, 0.92][variant] * settings.pumpkinHeight;
  const widthMul = settings.pumpkinWidth;
  const ribDepth = settings.ribDepth * (1 + settings.variation * 0.4);
  const organic = settings.variation;
  for(let j=0; j<=nr; j++){
    const t = Math.PI * j / nr;
    const sy = Math.sin(t), cy = Math.cos(t);
    for(let i=0; i<=ns; i++){
      const a = TAU * i / ns;
      const phase = rib * a + 0.12 * organic * Math.sin(t*2.3 + a*2.7);
      const ribShape = Math.cos(phase) - 0.22 * Math.cos(phase * 2) + 0.04 * Math.sin(phase * 3);
      let rr = 0.30 * widthMul * Math.pow(sy, 0.76)
        * (1 + ribDepth * ribShape)
        * (1 + 0.08 * organic * Math.sin(a*3.2 + t*1.8))
        * (1 + 0.04 * cy);
      const micro = 0.008 * organic * Math.sin(a*47 + t*31) * Math.sin(t*53 - a*19);
      rr += micro * sy;
      let wart = 0;
      if(variant === 6){
        wart = 0.022 * Math.pow(Math.max(0, Math.sin(a*31 + t*17)*Math.sin(t*41 - a*9)), 8);
      }
      const y = 0.3 * ratio * (1 + cy)
        - 0.07 * ratio * Math.exp(-Math.pow(t / 0.22, 2))
        + 0.025 * Math.exp(-Math.pow((Math.PI - t) / 0.18, 2));
      P.push((rr + wart * sy) * Math.cos(a), y + wart * cy, (rr + wart * sy) * Math.sin(a));
      U.push(i / ns, j / nr);
      if(j < nr && i < ns){
        const k = j * (ns + 1) + i;
        I.push(k, k+1, k+ns+1, k+1, k+ns+2, k+ns+1);
      }
    }
  }
  let g = buffer(P, U, I);
  if(variant === 6 && lod === 0){
    const parts = [g];
    const wr = rng(6767 + variant);
    const count = tier === 'high' ? 68 : tier === 'medium' ? 42 : 24;
    for(let i=0; i<count; i++){
      const t = 0.35 + wr() * 2.4;
      const a = wr() * TAU;
      const phase = rib * a + 0.12 * organic * Math.sin(t*2.3 + a*2.7);
      const r = 0.30 * widthMul * Math.pow(Math.sin(t), 0.76)
        * (1 + ribDepth * (Math.cos(phase) - 0.22 * Math.cos(phase*2)))
        * (1 + 0.08 * organic * Math.sin(a*3.2 + t*1.8));
      const y = 0.3 * ratio * (1 + Math.cos(t));
      const b = new T.SphereGeometry(0.011 + wr()*0.018, lod?6:9, lod?4:7);
      b.scale(1, 0.7, 1);
      b.translate(r * Math.cos(a), y, r * Math.sin(a));
      parts.push(b);
    }
    g = merge(parts);
  }
  g.userData = {socket:[0, 0.532*ratio, 0], height:0.6*ratio, variant};
  geometries.set(key, g);
  return g;
}
function tube(points,radius=.01,sides=5){const curve=new T.CatmullRomCurve3(points.map(p=>p.isVector3?p:new T.Vector3(...p)));return new T.TubeGeometry(curve,Math.max(3,points.length*2),radius,sides,false);}
 function merge(list){if(!list.length)return new T.BufferGeometry();const P=[],N=[],U=[];for(const g0 of list){const g=g0.index?g0.toNonIndexed():g0,p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;P.push(...p.array);N.push(...n.array);if(u)U.push(...u.array);else U.push(...new Array(p.count*2).fill(0));if(g!==g0)g.dispose();g0.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('normal',new T.Float32BufferAttribute(N,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.computeBoundingSphere();return g;}
 function leafGeometry(lod=0,variant=0){const key='leaf'+lod+':'+variant;if(geometries.has(key))return geometries.get(key);const rings=Math.max(2,q.leafRings-lod*2),segments=Math.max(20,q.leafSegments-lod*12),P=[],U=[],I=[];
 for(let side=0;side<2;side++)for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){const a=TAU*i/segments,r=j/rings,tip=.78+.22*Math.cos(5*a+.3),notch=1-.50*Math.exp(-Math.pow((a-Math.PI*1.5)/.29,2)),edge=1+.045*Math.sin(a*23+variant)-(variant===2?.16*Math.pow(Math.max(0,Math.cos(a*11)),5):0),len=.34*tip*notch*edge;const x=Math.cos(a)*len*r,z=Math.sin(a)*len*r+.07*r,y=.10*r*r+.025*Math.sin(a*4+variant)*r*r*r+(side?-.004:0);P.push(x,y,z);U.push(.5+x/ .8,.5+z/.8);if(j<rings&&i<segments){let k=side*(rings+1)*(segments+1)+j*(segments+1)+i,b=k+segments+1;if(!side)I.push(k,b,k+1,k+1,b,b+1);else I.push(k,k+1,b,k+1,b+1,b);}}
 const stride=(rings+1)*(segments+1);for(let i=0;i<segments;i++){const k=rings*(segments+1)+i;I.push(k,k+1,k+stride,k+1,k+stride+1,k+stride);}const g=buffer(P,U,I),C=[];for(let i=0;i<P.length/3;i++)C.push(...(i>=stride?[1.3,1.18,.92]:[1,1,1]));g.setAttribute('color',new T.Float32BufferAttribute(C,3));geometries.set(key,g);return g;}
 function veins(){if(geometries.has('veins'))return geometries.get('veins');const pieces=[];for(let b=0;b<5;b++){const a=TAU*b/5-.05,len=.26;pieces.push(tube([[0,.007,0],[Math.cos(a)*len*.5,.037,Math.sin(a)*len*.5],[Math.cos(a)*len,.073,Math.sin(a)*len+.04]],.0026,4));for(const t of [.4,.65])for(const s of [-1,1])pieces.push(tube([[Math.cos(a)*len*t,.01+.07*t*t,Math.sin(a)*len*t],[Math.cos(a+s*.36)*len*(t+.18),.03+.07*t*t,Math.sin(a+s*.36)*len*(t+.18)+.02]],.0012,3));}const g=merge(pieces);geometries.set('veins',g);return g;}
 function stem(v){const key='stem'+v;if(geometries.has(key))return geometries.get(key);const h=fruit(v).userData.socket[1],curl=settings.stemCurl,curve=new T.CatmullRomCurve3([new T.Vector3(0,h-.012,0),new T.Vector3(.004*curl,h+.055,0),new T.Vector3(.027*curl,h+.13,.012*curl),new T.Vector3(.063*curl,h+.16,.03*curl)]),sides=tier==='mobile'?7:10,segments=tier==='mobile'?10:18,g=new T.TubeGeometry(curve,segments,.027,sides,false),pos=g.attributes.position;
 for(let j=0;j<=segments;j++){const t=j/segments,c=curve.getPointAt(t);for(let i=0;i<=sides;i++){const k=j*(sides+1)+i,rad=(1-.55*t)*(1+.13*Math.cos(i/sides*TAU*5));pos.setXYZ(k,c.x+(pos.getX(k)-c.x)*rad,c.y+(pos.getY(k)-c.y)*rad,c.z+(pos.getZ(k)-c.z)*rad);}}
 g.computeVertexNormals();g.computeBoundingSphere();
 const collar=new T.SphereGeometry(.054,16,8);collar.scale(1,.27,1);collar.translate(0,h+.002,0);
 const tip=curve.getPoint(1),cap=new T.CircleGeometry(.012,10);
 cap.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),curve.getTangent(1)));cap.translate(tip.x,tip.y,tip.z);
 const complete=merge([g,collar,cap]);geometries.set(key,complete);return complete;}
 function flower(){if(geometries.has('flower'))return geometries.get('flower');const P=[],U=[],I=[],n=35;for(let j=0;j<4;j++)for(let i=0;i<=n;i++){const a=TAU*i/n,r=j/3*.10*(.8+.2*Math.cos(a*settings.flowerPetals))*settings.flowerOpen;P.push(Math.cos(a)*r,.02+Math.pow(j/3,.7)*(.095-.04*settings.flowerOpen)+Math.cos(a*settings.flowerPetals)*.012*Math.pow(j/3,3)+Math.sin(a*settings.flowerPetals*3)*.005*(j/3),Math.sin(a)*r);U.push(.5+Math.cos(a)*r*4,.5+Math.sin(a)*r*4);if(j<3&&i<n){const k=j*(n+1)+i;I.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);}}const petal=buffer(P,U,I),parts=[petal];for(let k=0;k<3;k++){const a=TAU*k/3;parts.push(tube([[Math.cos(a)*.012,.022,Math.sin(a)*.012],[Math.cos(a)*.008,.105,Math.sin(a)*.008]],.006,5));}const g=merge(parts),colors=[];for(let i=0;i<g.attributes.position.count;i++)colors.push(...(g.attributes.position.getY(i)>.09?[1,.8,.35]:[1,.72+.28*Math.min(1,Math.hypot(g.attributes.position.getX(i),g.attributes.position.getZ(i))/.075),.7]));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));materials.flower.vertexColors=true;geometries.set('flower',g);materials.flower.side=T.DoubleSide;return g;}
 function trellis(o){const pieces=[],w=o.trellisWidth,h=o.trellisHeight,d=o.trellisLength,rise=Math.min(o.archRise,h*.8);const rail=pts=>pieces.push(tube(pts,.022*o.supportThickness,7));if(o.trellis==='arch'){for(const z of [-d/2,d/2]){const pts=[[-w/2,0,z],[-w/2,h-rise,z]];for(let i=0;i<=24;i++){const a=Math.PI-Math.PI*i/24;pts.push([Math.cos(a)*w/2,h-rise+Math.sin(a)*rise,z]);}pts.push([w/2,0,z]);rail(pts);}for(let i=0,n=Math.ceil(Math.PI*w/2/o.railSpacing);i<=n;i++){const a=Math.PI*i/n;rail([[Math.cos(a)*w/2,h-rise+Math.sin(a)*rise,-d/2],[Math.cos(a)*w/2,h-rise+Math.sin(a)*rise,d/2]]);}for(const x of [-w/2,w/2])for(let y=.3;y<h-rise;y+=o.railSpacing)rail([[x,y,-d/2],[x,y,d/2]]);}else{for(const x of [-w/2,0,w/2]){const g=new T.BoxGeometry(.075*o.supportThickness,h,.075*o.supportThickness);g.translate(x,h/2,0);pieces.push(g);}for(let y=.35;y<h;y+=o.railSpacing){const g=new T.BoxGeometry(w,.055*o.supportThickness,.045*o.supportThickness);g.translate(0,y,0);pieces.push(g);}if(o.trellis==='wooden')for(let x=-w/2;x<=w/2;x+=o.railSpacing){const g=new T.BoxGeometry(.035*o.supportThickness,h,.04*o.supportThickness);g.translate(x,h/2,.05);pieces.push(g);}}return merge(pieces);}
 function dispose(){for(const g of geometries.values())g.dispose();for(const m of Object.values(materials))m.dispose();depth.dispose();textures.forEach(t=>t.dispose());}
 return {T,tier,q,materialMaps:{skin,leaf,wood},materials,clock,depth,fruit,leaf:leafGeometry,veins,stem,flower,tube,merge,trellis,dispose};
}
function build(T,input={},terrain={},existingKit){const data=layout(input,terrain),o=data.options,kit=existingKit||createKit(T,o.tier,o),root=new T.Group(),chunks=[],owned=[],sample=terrain.heightAt||(()=>0),suitable=terrain.suitable||(()=>true),q=kit.q;root.name='Autumn procedural patch';
 const palette=[0xe07918,0xd86414,0xe49730,0xb96826,0xe9dfb3,0x647950,0xb37e36],lc=o.health==='dried'?0x817140:o.health==='yellow'||o.season==='late-fall'?0xaaa343:0x467830;
 const matrix=(x,y,z,scale=1,yaw=0,pitch=0)=>{const m=new T.Matrix4();m.compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(pitch,yaw,0)),new T.Vector3(scale,scale,scale));return m;};
 function inst(g,mat,items,parent,wind=false){if(!items.length)return;const mesh=new T.InstancedMesh(g,mat,items.length);mesh.name=g.userData.variant!==undefined?'Pumpkin instances':'Shared '+mat.name;items.forEach((a,i)=>{mesh.setMatrixAt(i,a.m);mesh.setColorAt(i,new T.Color(a.color??0xffffff).convertSRGBToLinear());});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.frustumCulled=false;mesh.castShadow=q.shadow||mat.name==='fruit';mesh.receiveShadow=true;if(wind)mesh.customDepthMaterial=kit.depth;parent.add(mesh);return mesh;}
 const byChunk=new Map();for(const p of data.plants){const key=Math.floor(p.x/8)+','+Math.floor(p.z/8);if(!byChunk.has(key))byChunk.set(key,[]);byChunk.get(key).push(p);}
 function populate(plants,lod,parent){const fruits=Array.from({length:7},()=>[]),leaves=[],veinItems=[],flowers=[],lines=[];
 for(const p of plants){const r=rng(p.seed),growth=clamp(o.growth,.1,1),s=p.size*(.3+.7*growth),variance=1+(r()-.5)*o.variation*.6,nodes=[];const angle=p.yaw,step=o.internode,steps=Math.max(3,Math.ceil(o.vineLength/step)),paths=[];
 const addRunner=(x,z,a,len)=>{const pts=[];for(let j=0;j<=steps;j++){const t=j/steps,px=x+Math.cos(a)*len*t+Math.sin(t*6+a)*.11*s*o.vineCurl,pz=z+Math.sin(a)*len*t+Math.cos(t*5+a)*.11*s*o.vineCurl;if(!suitable(px,pz))break;pts.push([px,sample(px,pz)+.04,pz]);}if(pts.length<2)return [];paths.push(pts);return pts;};
 const main=addRunner(p.x,p.z,angle,o.vineLength*s*growth*variance);if(!main.length)continue;
 for(let b=0;b<o.branching;b++){const start=main[Math.min(main.length-1,Math.floor((b+1)*main.length/(o.branching+2)))];addRunner(start[0],start[2],angle+(b%2?1:-1)*o.branchAngle,o.vineLength*s*.48*growth*variance);}
 const fruitNode=main[Math.min(main.length-1,Math.floor(main.length*.55))],fx=fruitNode[0]+Math.cos(angle+1.57)*.29*s,fz=fruitNode[2]+Math.sin(angle+1.57)*.29*s,fy=sample(fx,fz)+.005;
 if(growth>.30&&suitable(fx,fz)){const fs=s*clamp((growth-.2)/.8,.12,1),fm=matrix(fx,fy,fz,fs,p.yaw);fruits[p.variant].push({m:fm,color:growth<.75||o.season==='summer'?0x669141:o.growth>1.05?0x9d6435:palette[p.color]});if(lod<2){const h=kit.fruit(p.variant).userData.socket[1]*fs;lines.push(kit.tube([fruitNode,[fx+.1*fs,fy+h+.06,fz],[fx,fy+h,fz]],.013*s,4));}}
 if(lod===2)continue;
 let leafCount=0;for(const pts of paths){lines.push(kit.tube(pts,.010*s*o.vineThickness,4));for(let j=1;j<pts.length-1;j++){if(leafCount++>q.leaves*o.leafDensity/(lod+1))break;const n=pts[j],a=angle+(j%2?1:-1)*1.25,ls=s*(.75+r()*.6)*(.5+growth*.5)*variance,px=n[0]+Math.cos(a)*.18*s,pz=n[2]+Math.sin(a)*.18*s,py=sample(px,pz)+.22*s;if(!suitable(px,pz))continue;lines.push(kit.tube([n,[px,py-.07*s,pz],[px,py,pz]],.005*s,4));const m=matrix(px,py,pz,ls,a,(r()-.5)*.5);leaves.push({m,color:j%5===0?0x799441:lc});if(lod===0&&o.tier!=='mobile')veinItems.push({m,color:0xffffff});if(j%4===1){const spiral=[];for(let k=0;k<=18;k++){const t=k/18;spiral.push([n[0]+t*.15*s,n[1]+(.06+Math.sin(t*TAU*2)*.027)*s,n[2]+Math.cos(t*TAU*2)*.027*s]);}lines.push(kit.tube(spiral,.0025*s,3));}if(j%6===2&&o.growth<1.1&&o.season!=='late-fall'&&r()<o.flowerDensity){const fm=matrix(px,py+.03,pz,.9*s*o.flowerSize,a,.4);flowers.push({m:fm,color:0xffffff});}}}
 }
 for(let v=0;v<7;v++){inst(kit.fruit(v,lod),kit.materials.fruit,fruits[v],parent);if(lod<2)inst(kit.stem(v),kit.materials.stem,fruits[v].map(a=>({...a,color:0xffffff})),parent);}inst(kit.leaf(lod,o.health==='dried'?2:o.health==='yellow'?1:0),kit.materials.leaf,leaves,parent,true);inst(kit.veins(),kit.materials.vein,veinItems,parent,true);inst(kit.flower(),kit.materials.flower,flowers,parent);
 if(lines.length){const g=kit.merge(lines),m=new T.Mesh(g,kit.materials.vine);m.castShadow=q.shadow;m.receiveShadow=true;parent.add(m);owned.push(g);}
 }
 for(const plants of byChunk.values()){const g=new T.Group(),center=new T.Vector3(plants.reduce((a,p)=>a+p.x,0)/plants.length,plants.reduce((a,p)=>a+p.y,0)/plants.length,plants.reduce((a,p)=>a+p.z,0)/plants.length);root.add(g);const levels=[];for(let lod=0;lod<3;lod++){const l=new T.Group();g.add(l);populate(plants,lod,l);l.visible=lod===0;levels.push(l);}chunks.push({g,center,levels,lod:0});}
 if(o.trellis!=='off'){const support=new T.Group();support.name='Climbing support';support.position.y=sample(0,0);root.add(support);const tg=kit.trellis(o);owned.push(tg);const tm=new T.Mesh(tg,o.trellis==='arch'?kit.materials.metal:kit.materials.timber);tm.castShadow=q.shadow;tm.receiveShadow=true;support.add(tm);
 if(o.climbing){const lines=[],leaves=[],flowers=[],r=rng(o.seed+11),w=o.trellisWidth,h=o.trellisHeight,d=o.trellisLength;for(const side of [-1,1])for(const zbase of (o.trellis==='arch'?[-d/2,d/2]:[0])){const pts=[];for(let i=0;i<=42;i++){const t=i/42,ar=clamp((t-.48)/.52,0,1)*Math.PI*.57;const x=o.trellis==='arch'?(t<.48?side*w/2:side*Math.cos(ar)*w/2):side*w/2*(1-t*.7);const y=o.trellis==='arch'?(t<.48?t/.48*(h-w/2):h-w/2+Math.sin(ar)*w/2):t*h;pts.push([x+Math.sin(t*55)*.035,y,zbase+Math.cos(t*55)*.035]);if(i%2===0&&i>1){const px=x+side*(.11+r()*.12),py=y+.08,pz=zbase+(r()-.5)*.25;lines.push(kit.tube([pts.at(-1),[px,py,pz]],.006,4));leaves.push({m:matrix(px,py,pz,.8+r()*.55,r()*TAU,(r()-.5)*1.8),color:lc});if(i%8===0)flowers.push({m:matrix(px,py,pz,1,0,1.1),color:0xffffff});}}lines.push(kit.tube(pts,.013,5));}const g=kit.merge(lines);owned.push(g);support.add(new T.Mesh(g,kit.materials.vine));inst(kit.leaf(),kit.materials.leaf,leaves,support,true);inst(kit.flower(),kit.materials.flower,flowers,support);}}
 function update(camera,time=0){kit.clock.value=time;const local=camera.position.clone();root.worldToLocal(local);for(const c of chunks){const d=local.distanceTo(c.center),near=q.near*(c.lod===0?1.12:.9),far=q.far*(c.lod===1?1.12:.9),next=d<near?0:d<far?1:2;c.g.visible=d<q.cull;if(next!==c.lod){c.levels[c.lod].visible=false;c.levels[next].visible=true;c.lod=next;}}}
 function dispose(){root.removeFromParent();owned.forEach(g=>g.dispose());root.traverse(m=>{if(m.isInstancedMesh)m.dispose?.();});if(!existingKit)kit.dispose();}
 return {root,kit,data,chunks,update,dispose,stats:()=>({plants:data.plants.length,requested:data.requested,capped:data.capped,chunks:chunks.length,lods:chunks.reduce((a,c)=>(a[c.g.visible?c.lod:3]++,a),[0,0,0,0])})};
}
scope.AutumnAssets={VERSION,TIERS,rng,options,layout,createKit,build};
})(typeof window!=='undefined'?window:globalThis);
