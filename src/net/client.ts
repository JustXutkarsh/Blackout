import {NET,roomCode,type ClientMessage,type ServerMessage,type RoomWire} from './protocol';
import {serverReadiness,type ConnectionDiagnostic} from './endpoint';
export class RoomConnection {
 socket?:WebSocket;id='';token='';code='';name='';room?:RoomWire;closed=false;retry=0;deadline=0;ping=0;offset=0;lastReceived=0;timer=0;reconnectTimer=0;private handshakeTimer=0;private attempt=0;private initialRetries=0;
 state='idle';diagnostic?:ConnectionDiagnostic;getAccessToken?:()=>Promise<string|undefined>;
 onMessage:(m:ServerMessage)=>void=()=>{};onStatus:(s:string)=>void=()=>{};
 constructor(public url:string){}
 private status(state:string,message:string){this.state=state;this.onStatus(message);}
 private fail(stage:ConnectionDiagnostic['stage'],code:string,message:string){this.diagnostic={stage,code,message};if(import.meta.env.DEV)console.debug('BLACKOUT connection',stage,code);this.status('unavailable',message);}
 connect(hello:Extract<ClientMessage,{type:'hello'}>){this.closed=false;this.name=hello.name;this.initialRetries=0;void this.open(hello);}
 private async open(hello:Extract<ClientMessage,{type:'hello'}>){const attempt=++this.attempt;clearTimeout(this.handshakeTimer);if(!this.url){this.fail('configuration','MULTIPLAYER_URL_MISSING','Online service is not configured. Offline play is available.');return;}
  this.status('checking',hello.token?'Reconnecting…':'Checking online service…');
  try{await serverReadiness(this.url); }catch(e){if(this.closed||attempt!==this.attempt)return;const code=e instanceof Error?e.message:'HEALTH_UNAVAILABLE';this.fail('health',code,code==='AUTH_NOT_CONFIGURED'?'Online accounts are not configured on the server.':'Online service is unavailable. Try again shortly.');this.retryConnection(hello);return;}
  if(this.closed||attempt!==this.attempt)return;
  if(this.getAccessToken){const accessToken=await this.getAccessToken().catch(()=>undefined);if(!accessToken){this.fail('authentication','AUTH_REQUIRED','Sign in to play online.');return;}hello={...hello,accessToken};}
  let socket:WebSocket;try{socket=new WebSocket(this.url);}catch{this.fail('configuration','MULTIPLAYER_URL_INVALID','Invalid online configuration.');return;}this.socket=socket;this.status('connecting','Connecting…');
  this.handshakeTimer=window.setTimeout(()=>{if(attempt!==this.attempt||this.closed)return;this.fail(socket.readyState===WebSocket.OPEN?'authentication':'connection','HANDSHAKE_TIMEOUT','Connection timed out. Try again.');socket.close();},8000);
  socket.onopen=()=>{this.status('authenticating','Signing in to the room…');this.send(hello);};
  socket.onmessage=e=>{let m:ServerMessage;try{m=JSON.parse(e.data);}catch{return;}this.lastReceived=performance.now();if(m.type==='welcome'){clearTimeout(this.handshakeTimer);this.id=m.id;this.token=m.token;this.code=m.room.code;this.room=m.room;this.deadline=0;this.retry=0;this.initialRetries=0;this.status('connected','Connected');clearInterval(this.timer);this.timer=window.setInterval(()=>this.send({type:'ping',nonce:performance.now()}),1000);try{sessionStorage.setItem('blackout.session',JSON.stringify({token:this.token,code:this.code,name:this.name}));}catch{}}
    if(m.type==='room'||m.type==='snapshot')this.room=m.room;
    if(m.type==='pong'){this.ping=Math.max(0,performance.now()-m.nonce);this.offset+=(m.time-(m.nonce+performance.now())/2-this.offset)*.2;}
    if(m.type==='error'){clearTimeout(this.handshakeTimer);this.fail(m.code.startsWith('AUTH')?'authentication':'room',m.code,m.message);if(m.fatal){this.closed=true;this.forget();socket.close();}}
    this.onMessage(m);
  };
  socket.onerror=()=>this.fail('connection','WEBSOCKET_FAILED','Unable to connect. Try again shortly.');
  socket.onclose=()=>{clearInterval(this.timer);clearTimeout(this.handshakeTimer);if(this.closed||attempt!==this.attempt)return;this.retryConnection(hello);};
 }
 private retryConnection(hello:Extract<ClientMessage,{type:'hello'}>){if(this.closed)return;if(this.token){if(!this.deadline)this.deadline=performance.now()+NET.reconnectMs;if(performance.now()>this.deadline){this.fail('connection','RECONNECT_EXPIRED','Disconnected. Reconnect grace expired.');this.forget();return;}this.status('retrying','Reconnecting… your slot is reserved for 30 seconds.');this.reconnectTimer=window.setTimeout(()=>void this.open({type:'hello',version:NET.version,name:this.name,code:this.code,token:this.token}),Math.min(3000,500*2**this.retry++));}
  else if(this.initialRetries++<2&&this.diagnostic?.code!=='AUTH_NOT_CONFIGURED'){this.status('retrying','Online service unavailable. Retrying…');this.reconnectTimer=window.setTimeout(()=>void this.open(hello),500*this.initialRetries);}else this.status('unavailable','Online service is unavailable. Offline play remains available.');}
 send(m:ClientMessage){if(m.type!=='hello'&&this.state!=='connected')return;if(this.socket?.readyState===WebSocket.OPEN&&this.socket.bufferedAmount<32_000)this.socket.send(JSON.stringify(m));}
 refreshAuth(token:string){if(this.id)this.send({type:'auth_refresh',accessToken:token});}
 resume(){try{const s=JSON.parse(sessionStorage.getItem('blackout.session')||'null');if(s?.token&&s?.code){this.token=s.token;this.code=s.code;this.name=s.name;this.connect({type:'hello',version:NET.version,name:s.name,code:s.code,token:s.token});return true;}}catch{}return false;}
 forget(){this.token='';try{sessionStorage.removeItem('blackout.session');}catch{}}
 leave(){this.send({type:'leave'});this.detach();this.forget();}
 detach(){this.closed=true;this.attempt++;this.socket?.close();clearInterval(this.timer);clearTimeout(this.reconnectTimer);clearTimeout(this.handshakeTimer);}
 get serverNow(){return performance.now()+this.offset;}
}
export {roomCode};
