const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

let playerArray = new Array();
let shooter;

app.use(express.static('./'));
app.get('/',function(req, res) {
    // console.log(res.sendFile);
    res.sendFile('./index.html');
});

console.log('starting...');

io.sockets.on('connection', function(socket){
  console.log('connection');
	socket.userData = { x:0, y:0, z:0, h:0 };//Default values;
  console.log(socket.userData);
  // if(!playerArray.includes(socket.id) && playerArray.length > 0){
  //   playerArray.push(socket.id);
  // }
  socket.emit('userData', {x: socket.userData.x, y: socket.userData.y, z: socket.userData.z });

	console.log(`${socket.id} connected`);
	socket.emit('setId', { id:socket.id });

    socket.on('disconnect', function(){
		console.log(`Player ${socket.id} disconnected`)
		socket.broadcast.emit('deletePlayer', { id: socket.id });
    });

	socket.on('init', function(data){
		console.log(`socket.init ${data.x}`);
		// socket.userData.model = data.model;
		// socket.userData.colour = data.colour;
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.h = data.h;
    // socket.userData.b = data.b;
    // socket.userData.bx = data.bx; // balls position x
    // socket.userData.by = data.by; // balls position y
    // socket.userData.bz = data.bz; // balls position z
		// socket.userData.pb = data.pb,
		// socket.userData.action = "Idle";
	});

	socket.on('update', function(data){
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.h = data.h;
    // socket.userData.b = data.b;
    // socket.userData.bx = data.bx; // balls position x
    // socket.userData.by = data.by; // balls position y
    // socket.userData.bz = data.bz; // balls position z
    // console.log("x: "+data.x);
		// socket.userData.pb = data.pb,
		socket.userData.action = data.action;
	});

  socket.on('ballShoot',function(data){
    const nsp = io.of('/');
    for(let id in io.sockets.sockets){
      const socket = nsp.connected[id];
  		if(socket.id != data.id){
        socket.emit('ballShoot', data.data);
  		}
    }
  });

  socket.on('touchPlayer',function(data){
    const nsp = io.of('/');
    for(let id in io.sockets.sockets){
      const socket = nsp.connected[id];
      if(socket.id != data){
        io.emit('touchPlayerReponse', data);
      }
    }
    // console.log(data+" as shoot");
  });

  socket.on('playerWin', function(data){
    io.emit('end', data);
  });


});

http.listen(2600, function(){
  console.log('listening on -p 2600 - origin set');
});

setInterval(function(){
	const nsp = io.of('/');
  let pack = [];

  for(let id in io.sockets.sockets){
    const socket = nsp.connected[id];
		if(socket.id != undefined){
			pack.push({
				id: socket.id,
				x: socket.userData.x,
				y: socket.userData.y,
				z: socket.userData.z,
				h: socket.userData.h,
				action: socket.userData.action
			});
		}
  }
	if (pack.length>0) {
    io.emit('remoteData', pack);
  }

}, 40);
