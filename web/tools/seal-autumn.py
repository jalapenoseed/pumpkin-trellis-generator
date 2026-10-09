"""Inspect exported GLBs and provide dependency-closed glTF for the existing Forge importer."""
import json,struct,hashlib,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'assets/autumn/v0.2.2'
manifest=json.loads((root/'manifest.json').read_text())
reports=[]
for asset in manifest['assets']:
 src=root/asset['file'];raw=src.read_bytes()
 magic,version,total=struct.unpack_from('<III',raw)
 assert magic==0x46546c67 and version==2 and total==len(raw)
 size,typ=struct.unpack_from('<II',raw,12);assert typ==0x4e4f534a
 doc=json.loads(raw[20:20+size]);off=20+size;bs,bt=struct.unpack_from('<II',raw,off);assert bt==0x004e4942
 binary=raw[off+8:off+8+bs];triangles=0;vertices=0;warnings=[]
 for mesh in doc['meshes']:
  for p in mesh['primitives']:
   assert p.get('mode',4)==4
   a=doc['accessors'][p['attributes']['POSITION']];bv=doc['bufferViews'][a['bufferView']]
   assert a['componentType']==5126 and a['type']=='VEC3'
   stride=bv.get('byteStride',12);start=bv.get('byteOffset',0)+a.get('byteOffset',0)
   for i in range(a['count']):assert all(math.isfinite(v) for v in struct.unpack_from('<fff',binary,start+i*stride))
   vertices+=a['count'];triangles+=(doc['accessors'][p['indices']]['count'] if 'indices' in p else a['count'])//3
 assert vertices>0 and triangles>0
 for mat in doc.get('materials',[]):
  assert 0<=mat.get('pbrMetallicRoughness',{}).get('roughnessFactor',1)<=1
 folder=src.with_suffix('');folder.mkdir(exist_ok=True)
 for i,image in enumerate(doc.get('images',[])):
  bv=doc['bufferViews'][image.pop('bufferView')];data=binary[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
  assert data[:8]==b'\x89PNG\r\n\x1a\n' or data[:2]==b'\xff\xd8'
  name='texture-'+str(i)+('.png' if image.get('mimeType')=='image/png' else '.jpg');(folder/name).write_bytes(data);image['uri']=name
 declared=doc['buffers'][0]['byteLength'];(folder/'mesh.bin').write_bytes(binary[:declared]);doc['buffers'][0]['uri']='mesh.bin';(folder/'model.gltf').write_text(json.dumps(doc,separators=(',',':')))
 files={p.name:{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in folder.iterdir() if p.is_file()}
 (folder/'asset.glb').write_bytes(raw);(folder/'thumbnail.png').write_bytes((root/asset['thumbnail']).read_bytes())
 asset['gltf']=str((folder/'model.gltf').relative_to(root)).replace('\\','/');asset['triangles']=triangles;asset['vertices']=vertices;asset['sha256']=hashlib.sha256(raw).hexdigest()
 reports.append({'id':asset['id'],'passed':True,'triangles':triangles,'vertices':vertices,'dependencies':files})
manifest['validation']={'passed':True,'scope':'GLB container, finite positions, triangle primitives, material ranges, decodable image signatures, dependency closure','assets':len(reports)}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2));(root/'validation.json').write_text(json.dumps(reports,indent=2));print('SEALED',len(reports),'GLB and glTF assets')
