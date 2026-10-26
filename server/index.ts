import {createServer} from 'node:http';
import {WebSocketServer,WebSocket} from 'ws';
import {pathToFileURL} from 'node:url';
import {Rooms,type Peer} from './rooms';
import {NET} from '../src/net/protocol';
export function createGameServer(options:{port?:number;host?:string;origins?:string[];grace?:number}={}){
 const rooms=new Rooms(options.grace),origins=new Set(options.origins||['http://127.0.0.1:5173','http://localhost:5173']);
 const http=createServer((req,res)=>{if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,rooms:rooms.rooms.size,uptime:Math.round(process.uptime()),tick:rooms.tick}));}else {res.writeHead(404);res.end();}});
 const wss=new WebSocketServer({noServer:true,maxPayload:NET.maxMessage,perMessageDeflate:false});
 const connections=new Map<string,number>();
 http.on('upgrade',(req,socket,head)=>{const address=req.socket.remoteAddress||'unknown';if(req.url!=='/ws'||!req.headers.origin||!origins.has(req.headers.origin)||(connections.get(address)||0)>=16){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
 wss.on('connection',(ws,req)=>{const key=req.socket.remoteAddress||'unknown';connections.set(key,(connections.get(key)||0)+1);let alive=true;const peer:Peer={key,messages:0,window:rooms.clock,send:m=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>256_000){ws.close(1013,'Slow connection');return;}ws.send(JSON.stringify(m));}},sendEncoded:data=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>256_000){ws.close(1013,'Slow connection');return;}ws.send(data);}},close:()=>ws.close()};
   ws.on('message',(data,binary)=>{if(binary){ws.close(1003,'JSON required');return;}try{rooms.receive(peer,JSON.parse(data.toString()));}catch{peer.send({type:'error',code:'INVALID',message:'Invalid JSON message.'});ws.close(1008,'Invalid message');}});
   ws.on('pong',()=>alive=true);ws.on('error',()=>{});ws.on('close',()=>{connections.set(key,Math.max(0,(connections.get(key)||1)-1));rooms.disconnect(peer);});
   const heartbeat=setInterval(()=>{if(!alive){ws.terminate();return;}alive=false;ws.ping();},10_000);ws.once('close',()=>clearInterval(heartbeat));
   const helloTimeout=setTimeout(()=>{if(!peer.joined)ws.close(1008,'Join timeout');},10_000);ws.once('close',()=>clearTimeout(helloTimeout));
 });
 let accumulator=0,last=performance.now();const epoch=last;const timer=setInterval(()=>{const now=performance.now();accumulator+=Math.min(.25,(now-last)/1000);last=now;let steps=0;while(accumulator>=1/NET.tick&&steps++<8){rooms.step(1/NET.tick,now-epoch);accumulator-=1/NET.tick;}if(steps>=8)accumulator=0;},4);
 const close=async()=>{clearInterval(timer);rooms.shutdown();for(const ws of wss.clients)ws.terminate();await new Promise<void>(r=>wss.close(()=>r()));await new Promise<void>(r=>http.close(()=>r()));};
 return {rooms,http,wss,close,listen:()=>new Promise<number>(resolve=>http.listen(options.port??Number(process.env.PORT||3001),options.host??process.env.HOST??'127.0.0.1',()=>resolve((http.address() as {port:number}).port)))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const origins=process.env.ALLOWED_ORIGINS?.split(',').map(v=>v.trim());if(process.env.NODE_ENV==='production'&&!origins?.length)throw Error('Production requires ALLOWED_ORIGINS');const server=createGameServer({origins});server.listen().then(port=>console.log(`BLACKOUT authoritative server listening on ${port}; in-memory rooms`));let stopping=false;for(const event of ['SIGINT','SIGTERM'] as const)process.on(event,()=>{if(stopping)return;stopping=true;void server.close().then(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref();});}
