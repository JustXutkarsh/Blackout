"""Optimize downloaded Quaternius CC0 sources; input directory contains crew.gltf/bin and animations.glb."""
import json,struct,sys,io,hashlib
from pathlib import Path
from PIL import Image
src=Path(sys.argv[1]);out=Path('public/assets/characters');out.mkdir(parents=True,exist_ok=True)
def write_glb(name,j,data):
 j['buffers']=[{'byteLength':len(data)}];js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((-len(js))%4);data+=b'\0'*((-len(data))%4)
 blob=struct.pack('<III',0x46546c67,2,28+len(js)+len(data))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(data),0x004e4942)+data;(out/name).write_bytes(blob)
j=json.loads((src/'crew.gltf').read_text());data=bytearray((src/j['buffers'][0]['uri']).read_bytes())
for i,img in enumerate(j['images']):
 im=Image.open(src/img['uri']).convert('RGB');im.thumbnail((1024,1024) if 'Superhero' in img['name'] else (256,256));buf=io.BytesIO();im.save(buf,'JPEG',quality=90);payload=buf.getvalue();data+=b'\0'*((-len(data))%4);img.pop('uri');img['mimeType']='image/jpeg';img['bufferView']=len(j['bufferViews']);j['bufferViews'].append({'buffer':0,'byteOffset':len(data),'byteLength':len(payload)});data+=payload
j['asset']['copyright']='Quaternius, Universal Base Characters Standard, CC0-1.0; optimized textures by BLACKOUT';write_glb('crew-base.glb',j,bytes(data))
raw=(src/'animations.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n]);data=raw[28+n:];wanted={'A_TPose','Idle_Loop','Walk_Loop','Jog_Fwd_Loop','Sprint_Loop','Crouch_Fwd_Loop','Crouch_Idle_Loop','Death01','Hit_Chest','Hit_Head','Jump_Start','Jump_Loop','Jump_Land','Pistol_Aim_Neutral','Pistol_Reload','Pistol_Shoot'}
anims=[a for a in j['animations'] if a['name'] in wanted];accessors=[];views=[];packed=bytearray();remap={}
def accessor(old):
 if old in remap:return remap[old]
 a=dict(j['accessors'][old]);v=dict(j['bufferViews'][a['bufferView']]);offset=v.get('byteOffset',0);payload=data[offset:offset+v['byteLength']];packed.extend(b'\0'*((-len(packed))%4));v['byteOffset']=len(packed);v['buffer']=0;packed.extend(payload);a['bufferView']=len(views);views.append(v);remap[old]=len(accessors);accessors.append(a);return len(accessors)-1
for a in anims:
 for sampler in a['samplers']:sampler['input']=accessor(sampler['input']);sampler['output']=accessor(sampler['output'])
nodes=[{k:v for k,v in node.items() if k not in ('mesh','skin','camera')} for node in j['nodes']]
write_glb('crew-motion.glb',{'asset':{'version':'2.0','copyright':'Quaternius Universal Animation Library Standard, CC0-1.0; selected clips, no root-motion gameplay'},'nodes':nodes,'scenes':j['scenes'],'scene':j.get('scene',0),'animations':anims,'accessors':accessors,'bufferViews':views},bytes(packed))
(out/'CC0-Quaternius.txt').write_bytes((src/'License.txt').read_bytes())
for name in ['crew-base.glb','crew-motion.glb']:print(name,(out/name).stat().st_size,hashlib.sha256((out/name).read_bytes()).hexdigest())
