import * as T from 'three';
export type Finish='stone'|'plaster'|'timber'|'dirt'|'metal';
const ids:Record<Finish,string>={stone:'stone_wall_02',plaster:'grey_plaster_03',timber:'wood_planks_dirt',dirt:'brown_mud_dry',metal:'rusty_metal'};
const maps=new Map<Finish,{map:T.Texture;normalMap:T.Texture;roughnessMap:T.Texture}>();
export const assetStatus={started:0,finished:0,loaded:0,total:0,failed:[] as string[]};
const manager=new T.LoadingManager();manager.onStart=()=>{assetStatus.started ||= performance.now();};manager.onProgress=(_url,loaded,total)=>{assetStatus.loaded=loaded;assetStatus.total=total;};manager.onLoad=()=>{assetStatus.finished=performance.now();};manager.onError=url=>assetStatus.failed.push(url);
const loader=new T.TextureLoader(manager);
let shadowTexture:T.CanvasTexture|undefined;
export function contactMaterial(){if(!shadowTexture){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d')!,g=ctx.createRadialGradient(32,32,3,32,32,32);g.addColorStop(0,'#151a1370');g.addColorStop(1,'#151a1300');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);shadowTexture=new T.CanvasTexture(c);}return new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});}

export function surfaceMaterial(kind:Finish,color:number=0xffffff,world=true){
  let textures=maps.get(kind);
  if(!textures){const load=(channel:string)=>{const tex=loader.load(`${import.meta.env.BASE_URL}assets/materials/${ids[kind]}_${channel}.jpg`);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;tex.colorSpace=channel==='diff'?T.SRGBColorSpace:T.NoColorSpace;return tex;};textures={map:load('diff'),normalMap:load('nor_gl'),roughnessMap:load('rough')};maps.set(kind,textures);}
  const material=new T.MeshStandardMaterial({...textures,color,roughness:kind==='metal'?.72:1,metalness:kind==='metal'?.48:0,normalScale:new T.Vector2(kind==='plaster'?.3:.65,kind==='plaster'?.3:.65)});
  if(world){material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
      vec4 surfacePos=vec4(position,1.0); vec3 surfaceNormal=normal;
      #ifdef USE_INSTANCING
      surfacePos=instanceMatrix*surfacePos; surfaceNormal=mat3(instanceMatrix)*surfaceNormal;
      #endif
      surfacePos=modelMatrix*surfacePos; surfaceNormal=normalize(mat3(modelMatrix)*surfaceNormal);
      vec3 dominant=abs(surfaceNormal); vec2 tiled=dominant.y>0.7?surfacePos.xz:(dominant.x>0.7?surfacePos.zy:surfacePos.xy);
      tiled*= ${kind==='dirt'?'.5':kind==='timber'?'1.0':'.5'};
      vMapUv=tiled;vNormalMapUv=tiled;vRoughnessMapUv=tiled;`);
  };material.customProgramCacheKey=()=>`world-${kind}`;}
  return material;
}
export function disposeSurfaceMaps(){for(const set of maps.values())for(const map of Object.values(set))map.dispose();maps.clear();shadowTexture?.dispose();shadowTexture=undefined;}
