const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

let playerArray = new Array();

app.use(express.static('./'));
app.get('/',function(req, res) {
    // console.log(res.sendFile);
    res.sendFile('./index.html');
});

console.log('starting...');

io.sockets.on('connection', function(socket){
  console.log('connection');
	socket.userData = { x:0, y:0, z:0, heading:0 };//Default values;
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
		socket.userData.heading = data.h;
		// socket.userData.pb = data.pb,
		// socket.userData.action = "Idle";
	});

	socket.on('update', function(data){
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.heading = data.h;
    // console.log("x: "+data.x);
		// socket.userData.pb = data.pb,
		// socket.userData.action = data.action;
	});

	// socket.on('chat message', function(data){
	// 	console.log(`chat message:${data.id} ${data.message}`);
	// 	io.to(data.id).emit('chat message', { id: socket.id, message: data.message });
	// })
});

http.listen(3000, function(){
  console.log('listening on -p 3000 - origin set');
});

setInterval(function(){
	const nsp = io.of('/');
  let pack = [];

  for(let id in io.sockets.sockets){
    const socket = nsp.connected[id];
      // console.log(socket.id);
	 	  // Only push sockets that have been initialised
		if(socket.id != undefined){
			pack.push({
				id: socket.id,
				// model: socket.userData.model,
				// colour: socket.userData.colour,
				x: socket.userData.x,
				y: socket.userData.y,
				z: socket.userData.z,
				heading: socket.userData.heading,
				// pb: socket.userData.pb,
				// action: socket.userData.action
			});
		}
  }
	if (pack.length>0) {
    io.emit('remoteData', pack);
    console.log(pack);
    // console.log('emit remoteData');
  }
}, 40);
