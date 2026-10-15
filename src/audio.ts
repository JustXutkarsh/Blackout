import { Vector3 } from 'three';
export class Sound {
  context?:AudioContext; master?:GainNode; noise?:AudioBuffer; volume=.45; private ambience?:AudioBufferSourceNode;
  init() {if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=this.volume;this.master.connect(this.context.destination);this.noise=this.context.createBuffer(1,this.context.sampleRate*.6,this.context.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.55;
      const source=this.context.createBufferSource();source.buffer=this.noise;source.loop=true;const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=180;const gain=this.context.createGain();gain.gain.value=.025;source.connect(filter).connect(gain).connect(this.master);source.start();this.ambience=source;
    } void this.context.resume(); }
  setVolume(v:number){this.volume=v;if(this.master&&this.context)this.master.gain.setTargetAtTime(v,this.context.currentTime,.03);}
  pause(){if(this.context)void this.context.suspend();}
  listener(pos:Vector3,yaw:number){const l=this.context?.listener;if(!l)return;if(l.positionX){l.positionX.value=pos.x;l.positionY.value=pos.y;l.positionZ.value=pos.z;l.forwardX.value=-Math.sin(yaw);l.forwardY.value=0;l.forwardZ.value=-Math.cos(yaw);l.upX.value=0;l.upY.value=1;l.upZ.value=0;}}
  play(kind:'rifle'|'pistol'|'knife'|'step'|'reload'|'empty'|'hit'|'warning'|'down'|'up'|'scan'|'pickup',position?:Vector3,passage=false){const c=this.context;if(!c||c.state!=='running'||!this.master)return;const t=c.currentTime,gain=c.createGain();let output:AudioNode=this.master;let panner:PannerNode|undefined;
    if(position){panner=c.createPanner();panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=2;panner.maxDistance=45;panner.rolloffFactor=1.3;panner.positionX.value=position.x;panner.positionY.value=position.y;panner.positionZ.value=position.z;panner.connect(this.master);output=panner;}
    gain.connect(output);let source:AudioScheduledSourceNode;let filter:BiquadFilterNode|undefined;let duration=.12,level=.2;
    if(kind==='rifle'||kind==='pistol'||kind==='step'||kind==='knife'||kind==='reload'){const s=c.createBufferSource();s.buffer=this.noise!;source=s;filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='step'?(passage?650:360):kind==='reload'?2200:kind==='knife'?1600:kind==='rifle'?2800:3800;s.connect(filter).connect(gain);duration=kind==='step'?.075:kind==='reload'?.24:kind==='knife'?.16:kind==='rifle'?.14:.18;level=kind==='step'?(passage?.26:.16):kind==='reload'?.10:kind==='knife'?.17:.32;}
    else {const s=c.createOscillator();source=s;s.type=kind==='empty'?'triangle':'sine';const freq={empty:160,hit:900,warning:580,down:180,up:170,scan:420,pickup:700}[kind];s.frequency.setValueAtTime(freq,t);s.frequency.exponentialRampToValueAtTime(kind==='down'?35:kind==='up'?700:kind==='scan'?1200:freq*.65,t+.22);s.connect(gain);duration=kind==='warning'?.3:kind==='down'||kind==='up'?.55:.18;level=kind==='hit'?.12:.13;}
    gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(level,t+.006);gain.gain.exponentialRampToValueAtTime(.001,t+duration);source.start(t);source.stop(t+duration+.02);source.onended=()=>{source.disconnect();filter?.disconnect();gain.disconnect();panner?.disconnect();};
  }
  dispose(){this.ambience?.stop();void this.context?.close();}
}
