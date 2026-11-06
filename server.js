const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const path=require('path');
const app=express(),server=http.createServer(app),io=new Server(server,{cors:{origin:'*'}});
app.use(express.static(path.join(__dirname,'public')));
const rooms=new Map(), COLORS=['#ff657a','#58b8ff','#ffd166','#91e6a7','#c5a0ff'];
const W=900,H=550,R=42,PR=55;
const rand=(a,b)=>a+Math.random()*(b-a);
const code=()=>Math.random().toString(36).slice(2,8).toUpperCase();
function snapshot(room){return {code:room.code,phase:room.phase,host:room.host,players:room.players.map(p=>({id:p.id,name:p.name,color:p.color,x:p.x,y:p.y,angle:p.angle,alive:p.alive,connected:p.connected})),turn:room.turn,winner:room.winner,message:room.message,round:room.round};}
function emit(room){io.to(room.code).emit('state',snapshot(room));}
function active(room){return room.players.filter(p=>p.alive&&p.connected);}
function nextTurn(room){const alive=active(room);if(alive.length<=1){room.phase='finished';room.winner=alive[0]?.id||null;room.message=alive.length?`${alive[0].name} wins!`:'No winner';return;}let i=room.players.findIndex(p=>p.id===room.turn);for(let k=1;k<=room.players.length;k++){const p=room.players[(i+k+room.players.length)%room.players.length];if(p.alive&&p.connected){room.turn=p.id;room.message=`${p.name}'s turn`;break;}}}
function reset(room){room.phase='playing';room.winner=null;room.round++;room.players.forEach((p,i)=>{const a=(i/room.players.length)*Math.PI*2-Math.PI/2;p.x=W/2+Math.cos(a)*170;p.y=H/2+Math.sin(a)*155;p.angle=a+Math.PI/2;p.alive=true;});room.turn=room.players[0].id;room.message=`${room.players[0].name}'s turn`;emit(room);}
function err(socket,msg){socket.emit('errorMessage',msg);}
function cleanName(n){return String(n||'Player').trim().slice(0,18)||'Player';}
function leave(socket){const code=socket.data.room,room=rooms.get(code);if(!room)return;const p=room.players.find(p=>p.id===socket.id);if(p){if(room.phase==='lobby'){room.players=room.players.filter(x=>x.id!==socket.id);}else{p.connected=false;p.alive=false;}}if(!room.players.some(x=>x.connected)){rooms.delete(code);return;}if(room.host===socket.id)room.host=room.players.find(x=>x.connected)?.id;if(room.phase==='playing'){if(room.turn===socket.id||active(room).length<=1)nextTurn(room);}emit(room);socket.data.room=null;}
io.on('connection',socket=>{
 socket.on('create',({name}={})=>{leave(socket);let c;do{c=code()}while(rooms.has(c));const room={code:c,phase:'lobby',host:socket.id,players:[],turn:null,winner:null,message:'Waiting for players',round:0,busy:false};rooms.set(c,room);socket.join(c);socket.data.room=c;room.players.push({id:socket.id,name:cleanName(name),color:COLORS[0],connected:true,alive:true,x:0,y:0,angle:0});emit(room);});
 socket.on('join',({name,code:raw}={})=>{leave(socket);const c=String(raw||'').toUpperCase().trim(),room=rooms.get(c);if(!room)return err(socket,'Room not found. Check the code.');if(room.phase!=='lobby')return err(socket,'This match has already started.');if(room.players.length>=5)return err(socket,'Room is full (5 players).');const i=room.players.length;room.players.push({id:socket.id,name:cleanName(name),color:COLORS[i],connected:true,alive:true,x:0,y:0,angle:0});socket.join(c);socket.data.room=c;emit(room);});
 socket.on('start',()=>{const room=rooms.get(socket.data.room);if(!room||room.host!==socket.id)return;if(room.players.length<2)return err(socket,'At least 2 players are needed.');reset(room);});
 socket.on('restart',()=>{const room=rooms.get(socket.data.room);if(room&&room.host===socket.id&&room.phase==='finished')reset(room);});
 socket.on('flick',({dx,dy}={})=>{const room=rooms.get(socket.data.room);if(!room||room.phase!=='playing'||room.turn!==socket.id||room.busy)return;dx=Number(dx);dy=Number(dy);if(!Number.isFinite(dx)||!Number.isFinite(dy))return;const length=Math.hypot(dx,dy);if(length<5)return;room.busy=true;const bodies=room.players.filter(p=>p.alive).map(p=>({...p,vx:0,vy:0,spin:0}));const shooter=bodies.find(p=>p.id===socket.id);const power=Math.min(length,160)/160*16;shooter.vx=dx/length*power;shooter.vy=dy/length*power;room.message=`${shooter.name} flicked!`;const dt=1/60, frames=[];for(let step=0;step<330;step++){
 for(const b of bodies){b.x+=b.vx;b.y+=b.vy;b.angle+=b.spin;b.vx*=0.985;b.vy*=0.985;b.spin*=0.97;}
 for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){const a=bodies[i],b=bodies[j];if(!a.alive||!b.alive)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,min=PR*1.05;if(d<min){const nx=dx/d,ny=dy/d,overlap=min-d;a.x-=nx*overlap/2;a.y-=ny*overlap/2;b.x+=nx*overlap/2;b.y+=ny*overlap/2;const rel=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rel<0){const imp=-(1+0.87)*rel/2;a.vx-=imp*nx;a.vy-=imp*ny;b.vx+=imp*nx;b.vy+=imp*ny;a.spin+=rand(-0.025,0.025);b.spin+=rand(-0.025,0.025);}}}
 for(const b of bodies){if(b.alive&&(b.x<22||b.x>W-22||b.y<22||b.y>H-22)){b.alive=false;b.vx=0;b.vy=0;}}
 if(step%3===0)frames.push(bodies.map(b=>({id:b.id,x:+b.x.toFixed(2),y:+b.y.toFixed(2),angle:+b.angle.toFixed(3),alive:b.alive})));
 if(step>45&&bodies.every(b=>Math.hypot(b.vx,b.vy)<0.08))break;
 }
 room.players.forEach(p=>{const b=bodies.find(x=>x.id===p.id);p.x=b.x;p.y=b.y;p.angle=b.angle;p.alive=b.alive;});
 io.to(room.code).emit('animation',{frames});setTimeout(()=>{nextTurn(room);room.busy=false;emit(room);},Math.max(800,frames.length*50+150));
 });
 socket.on('disconnect',()=>leave(socket));
});
server.listen(process.env.PORT||3000,()=>console.log('Pen Fight 5 running on port '+(process.env.PORT||3000)));
