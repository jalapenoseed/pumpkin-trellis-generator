import bpy,json,math,sys
from pathlib import Path
root=Path(sys.argv[sys.argv.index('--')+1]);manifest=json.loads((root/'manifest.json').read_text());reports=[]
for asset in manifest['assets']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(root/asset['file']))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert meshes
 for o in meshes:
  assert all(math.isfinite(v) for p in o.data.vertices for v in p.co)
  assert len(o.data.polygons)>0
  assert all(len(p.vertices)>=3 for p in o.data.polygons)
 for img in bpy.data.images:
  if img.source=='FILE':assert img.size[0]>0 and img.size[1]>0
 reports.append({'id':asset['id'],'passed':True,'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'materials':len(bpy.data.materials),'images':len(bpy.data.images)})
(root/'blender-validation.json').write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'assets':reports},indent=2));print('AUTUMN_BLENDER_IMPORT_PASS',len(reports))
