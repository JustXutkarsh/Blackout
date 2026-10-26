import {NET,roomCode,type ClientMessage,type ServerMessage,type RoomWire} from './protocol';
export class RoomConnection {
 socket?:WebSocket;id='';token='';code='';name='';room?:RoomWire;closed=false;retry=0;deadline=0;ping=0;offset=0;lastReceived=0;timer=0;reconnectTimer=0;
 onMessage:(m:ServerMessage)=>void=()=>{};onStatus:(s:string)=>void=()=>{};
 constructor(public url:string){}
 connect(hello:Extract<ClientMessage,{type:'hello'}>){this.closed=false;this.name=hello.name;this.open(hello);}
 private open(hello:Extract<ClientMessage,{type:'hello'}>){let socket:WebSocket;try{socket=new WebSocket(this.url);}catch{this.onStatus('Invalid multiplayer connection configuration.');return;}this.socket=socket;this.onStatus(hello.token?'Reconnecting…':'Connecting…');
  socket.onopen=()=>{this.send(hello);this.timer=window.setInterval(()=>this.send({type:'ping',nonce:performance.now()}),1000);};
  socket.onmessage=e=>{let m:ServerMessage;try{m=JSON.parse(e.data);}catch{return;}this.lastReceived=performance.now();if(m.type==='welcome'){this.id=m.id;this.token=m.token;this.code=m.room.code;this.room=m.room;this.deadline=0;this.retry=0;this.onStatus('Connected');try{sessionStorage.setItem('blackout.session',JSON.stringify({token:this.token,code:this.code,name:this.name}));}catch{}}
    if(m.type==='room'||m.type==='snapshot')this.room=m.room;
    if(m.type==='pong'){this.ping=Math.max(0,performance.now()-m.nonce);this.offset+=(m.time-(m.nonce+performance.now())/2-this.offset)*.2;}
    if(m.type==='error'&&m.fatal){this.closed=true;this.forget();}
    this.onMessage(m);
  };
  socket.onerror=()=>this.onStatus('Connection failed. Check that the multiplayer server is running.');
  socket.onclose=()=>{clearInterval(this.timer);if(this.closed)return;if(!this.token){this.onStatus('Unable to reach the multiplayer server. Offline play remains available.');return;}if(!this.deadline)this.deadline=performance.now()+NET.reconnectMs;if(performance.now()>this.deadline){this.onStatus('Disconnected. Reconnect grace expired.');this.forget();return;}this.onStatus('Reconnecting… your slot is reserved for 30 seconds.');this.reconnectTimer=window.setTimeout(()=>this.open({type:'hello',version:NET.version,name:this.name,code:this.code,token:this.token}),Math.min(3000,500*2**this.retry++));};
 }
 send(m:ClientMessage){if(this.socket?.readyState===WebSocket.OPEN&&this.socket.bufferedAmount<32_000)this.socket.send(JSON.stringify(m));}
 resume(){try{const s=JSON.parse(sessionStorage.getItem('blackout.session')||'null');if(s?.token&&s?.code){this.token=s.token;this.code=s.code;this.name=s.name;this.connect({type:'hello',version:NET.version,name:s.name,code:s.code,token:s.token});return true;}}catch{}return false;}
 forget(){this.token='';try{sessionStorage.removeItem('blackout.session');}catch{}}
 leave(){this.closed=true;this.send({type:'leave'});this.socket?.close();clearInterval(this.timer);clearTimeout(this.reconnectTimer);this.forget();}
 detach(){this.closed=true;this.socket?.close();clearInterval(this.timer);clearTimeout(this.reconnectTimer);}
 get serverNow(){return performance.now()+this.offset;}
}
export {roomCode};
