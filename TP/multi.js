class Game{
	constructor(){
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

		this.modes = Object.freeze({
			NONE:   Symbol("none"),
			PRELOAD: Symbol("preload"),
			INITIALISING:  Symbol("initialising"),
			CREATING_LEVEL: Symbol("creating_level"),
			ACTIVE: Symbol("active"),
			GAMEOVER: Symbol("gameover")
		});
		this.mode = this.modes.NONE;

    this.container;
    this.player;
    this.cameras;
    this.camera;
    this.scene;
    this.renderer;

    this.remotePlayers = [];
    this.remoteColliders = [];
    this.initialisingPlayers = [];
    this.remoteData = [];

		this.container = document.createElement( 'div' );
		this.container.style.height = '100%';
		document.body.appendChild( this.container );

		const game = this;
		game.init();

		this.mode = this.modes.PRELOAD;

    this.clock = new THREE.Clock();


		window.onError = function(error){
			console.error(JSON.stringify(error));
		}


	}

  init(){

		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 10, 200000 );

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0x6e7bbb );

		// ============== RENDER ==============
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.shadowMap.enabled = true; // ombre activer
		// this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // type d'encoding pour les ombres
		// document.body.appendChild( this.renderer.domElement );
		this.container.appendChild( this.renderer.domElement );


		const ambient = new THREE.AmbientLight( 0xaaaaaa );
        this.scene.add( ambient );

        const light = new THREE.DirectionalLight( 0xaaaaaa );
        light.position.set( 30, 100, 40 );
        light.target.position.set( 0, 0, 0 );

        light.castShadow = true;

		const lightSize = 500;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 500;
		light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
		light.shadow.camera.right = light.shadow.camera.top = lightSize;

        light.shadow.bias = 0.0039;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;

		this.sun = light;
		this.scene.add(light);

    this.player = new PlayerLocal(this);
    // player = new THREE.Mesh(
		// 		new THREE.BoxGeometry( 30, 30, 30 ),
		// 		new THREE.MeshBasicMaterial( { color: 0xFFFFFF } )
		// );
		// player.position.set(0, 0, 0);
		// scene.add( player );

		const sol = new THREE.Mesh(
				new THREE.BoxGeometry( 8000, 5, 8000 ),
				new THREE.MeshBasicMaterial( { color: 0x363b5c } )
		);
		sol.receiveShadow = true;
		sol.position.set(3500, -60, 3500);
		this.scene.add( sol );


		// ============= CAMERA =============
		// this.camera = new THREE.PerspectiveCamera( 80, window.innerWidth / window.innerHeight, 1, 1500 );
		// this.camera.position.set(0,120,250);
		// this.camera.lookAt(0, 30, 0); // cordonnées du point regarder par la camera
		// this.controls = new OrbitControls( camera, renderer.domElement ); // Faire bouger la caméra avec la souris
		// this.controls.minDistance = 150; // distance min
		// this.controls.maxDistance = 300; // distance max
		// this.controls.maxPolarAngle = Math.PI / 2.3; // angle max de la caméra

		// ============ EVENT LISTENER ============
		window.addEventListener( 'resize', () => game.onWindowResize(), false );
	}

	createCameras(){
		const offset = new THREE.Vector3(0, 80, 0);
		const front = new THREE.Object3D();
		front.position.set(112, 100, 600);
		front.parent = this.player.object;
		const back = new THREE.Object3D();
		back.position.set(0, 300, -1050);
		back.parent = this.player.object;
		const chat = new THREE.Object3D();
		chat.position.set(0, 200, -450);
		chat.parent = this.player.object;
		const wide = new THREE.Object3D();
		wide.position.set(178, 139, 1665);
		wide.parent = this.player.object;
		const overhead = new THREE.Object3D();
		overhead.position.set(0, 400, 0);
		overhead.parent = this.player.object;
		const collect = new THREE.Object3D();
		collect.position.set(40, 82, 94);
		collect.parent = this.player.object;
		this.cameras = { front, back, wide, overhead, collect, chat };
		this.activeCamera = this.cameras.back;
	}

	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( window.innerWidth, window.innerHeight );
	}

  updateRemotePlayers(dt){
		if (this.remoteData===undefined || this.remoteData.length == 0 || this.player===undefined || this.player.id===undefined) return;

		const newPlayers = [];
		const game = this;
		//Get all remotePlayers from remoteData array
		const remotePlayers = [];
		const remoteColliders = [];

		this.remoteData.forEach( function(data){
			if (game.player.id != data.id){
				//Is this player being initialised?
				let iplayer;
				game.initialisingPlayers.forEach( function(player){
					if (player.id == data.id) iplayer = player;
				});
				//If not being initialised check the remotePlayers array
				if (iplayer===undefined){
					let rplayer;
					game.remotePlayers.forEach( function(player){
						if (player.id == data.id) rplayer = player;
					});
					if (rplayer===undefined){
						//Initialise player
						game.initialisingPlayers.push( new Player( game, data ));
					}else{
						//Player exists
						remotePlayers.push(rplayer);
						remoteColliders.push(rplayer.collider);
					}
				}
			}
		});

		this.scene.children.forEach( function(object){
			if (object.userData.remotePlayer && game.getRemotePlayerById(object.userData.id)==undefined){
				game.scene.remove(object);
			}
		});

		this.remotePlayers = remotePlayers;
		this.remoteColliders = remoteColliders;
		this.remotePlayers.forEach(function(player){ player.update( dt ); });
	}

  getRemotePlayerById(id){
		if (this.remotePlayers===undefined || this.remotePlayers.length==0) return;

		const players = this.remotePlayers.filter(function(player){
			if (player.id == id) return true;
		});

		if (players.length==0) return;

		return players[0];
	}

  animate() {
		const game = this;
		const dt = this.clock.getDelta();

		requestAnimationFrame( function(){ game.animate(); } );
		this.updateRemotePlayers(dt);

		if (this.player.motion !== undefined) this.player.move(dt);

		if (this.speechBubble!==undefined) this.speechBubble.show(this.camera.position);

		this.renderer.render( this.scene, this.camera );
	}
}



class Player{
	constructor(game, options){
		this.local = true;
		// let model, colour;

		// const colours = ['Black', 'Brown', 'White'];
		// colour = colours[Math.floor(Math.random()*colours.length)];

		// if (options===undefined){
		// 	const people = ['BeachBabe', 'BusinessMan', 'Doctor', 'FireFighter', 'Housewife', 'Policeman', 'Prostitute', 'Punk', 'RiotCop', 'Roadworker', 'Robber', 'Sheriff', 'Streetman', 'Waitress'];
		// 	model = people[Math.floor(Math.random()*people.length)];
		// }else if (typeof options =='object'){
		// 	this.local = false;
		// 	this.options = options;
		// 	this.id = options.id;
		// 	model = options.model;
		// 	colour = options.colour;
		// }else{
		// 	model = options;
		// }
		// this.model = model;
		// this.colour = colour;
		this.game = game;
		// this.animations = this.game.animations;

		const loader = new THREE.FBXLoader();
		const player = this;
		// console.log(player);


		loader.load( `models/champiWalk.fbx`, function ( object ) {

			// object.mixer = new THREE.AnimationMixer( object );
			// player.root = object;
			// player.mixer = object.mixer;
		//
		// 	object.name = "Person";
		//
		// 	object.traverse( function ( child ) {
		// 		if ( child.isMesh ) {
		// 			child.castShadow = true;
		// 			child.receiveShadow = true;
		// 		}
		// 	} );


			// const textureLoader = new THREE.TextureLoader();

			// textureLoader.load(`${game.assetsPath}images/SimplePeople_${model}_${colour}.png`, function(texture){
			// 	object.traverse( function ( child ) {
			// 		if ( child.isMesh ){
			// 			child.material.map = texture;
			// 		}
			// 	} );
			// });

			// player.object = new THREE.Object3D();
			// player.object.position.set(3122, 0, -173);
			// player.object.rotation.set(0, 2.6, 0);

			// player.object.add(object);
			// if (player.deleted===undefined) game.scene.add(player.object);

			if (player.local){
				game.createCameras();
				game.sun.target = game.player.object;
				game.animations.Idle = object.animations[0];
				if (player.initSocket!==undefined) player.initSocket();
			}else{
				const geometry = new THREE.BoxGeometry(30,30,30);
				const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
				const box = new THREE.Mesh(geometry, material);
				// box.name = "Collider";
				box.position.set(0, 150, 0);
				player.object.add(box);
				player.collider = box;
				player.object.userData.id = player.id;
				player.object.userData.remotePlayer = true;
				const players = game.initialisingPlayers.splice(game.initialisingPlayers.indexOf(this), 1);
				game.remotePlayers.push(players[0]);
			}

			// if (game.animations.Idle!==undefined) player.action = "Idle";
		} );
	}
}
class PlayerLocal extends Player{
	constructor(game, model){
		super(game, model);

		const player = this;
		const socket = io.connect("localhost:2002");
		socket.on('setId', function(data){
			player.id = data.id;
		});
		socket.on('remoteData', function(data){
			game.remoteData = data;
		});
		socket.on('deletePlayer', function(data){
			const players = game.remotePlayers.filter(function(player){
				if (player.id == data.id){
					return player;
				}
			});
			if (players.length>0){
				let index = game.remotePlayers.indexOf(players[0]);
				if (index!=-1){
					game.remotePlayers.splice( index, 1 );
					game.scene.remove(players[0].object);
				}
			}else{
				index = game.initialisingPlayers.indexOf(data.id);
				if (index!=-1){
					const player = game.initialisingPlayers[index];
					player.deleted = true;
					game.initialisingPlayers.splice(index, 1);
				}
			}
		});

		socket.on('chat message', function(data){
			document.getElementById('chat').style.bottom = '0px';
			const player = game.getRemotePlayerById(data.id);
			game.speechBubble.player = player;
			game.chatSocketId = player.id;
			game.activeCamera = game.cameras.chat;
			game.speechBubble.update(data.message);
		});

		$('#msg-form').submit(function(e){
			socket.emit('chat message', { id:game.chatSocketId, message:$('#m').val() });
			$('#m').val('');
			return false;
		});

		this.socket = socket;
	}

	// initSocket(){
	// 	//console.log("PlayerLocal.initSocket");
	// 	this.socket.emit('init', {
	// 		model:this.model,
	// 		colour: this.colour,
	// 		x: this.object.position.x,
	// 		y: this.object.position.y,
	// 		z: this.object.position.z,
	// 		h: this.object.rotation.y,
	// 		pb: this.object.rotation.x
	// 	});
	// }

	// updateSocket(){
	// 	if (this.socket !== undefined){
	// 		//console.log(`PlayerLocal.updateSocket - rotation(${this.object.rotation.x.toFixed(1)},${this.object.rotation.y.toFixed(1)},${this.object.rotation.z.toFixed(1)})`);
	// 		this.socket.emit('update', {
	// 			x: this.object.position.x,
	// 			y: this.object.position.y,
	// 			z: this.object.position.z,
	// 			h: this.object.rotation.y,
	// 			pb: this.object.rotation.x,
	// 			action: this.action
	// 		})
	// 	}
	// }

	// move(dt){
	// 	const pos = this.object.position.clone();
	// 	pos.y += 60;
	// 	let dir = new THREE.Vector3();
	// 	this.object.getWorldDirection(dir);
	// 	if (this.motion.forward<0) dir.negate();
	// 	let raycaster = new THREE.Raycaster(pos, dir);
	// 	let blocked = false;
	// 	const colliders = this.game.colliders;
	//
	// 	if (colliders!==undefined){
	// 		const intersect = raycaster.intersectObjects(colliders);
	// 		if (intersect.length>0){
	// 			if (intersect[0].distance<50) blocked = true;
	// 		}
	// 	}
	//
	// 	if (!blocked){
	// 		if (this.motion.forward>0){
	// 			const speed = (this.action=='Running') ? 500 : 150;
	// 			this.object.translateZ(dt*speed);
	// 		}else{
	// 			this.object.translateZ(-dt*30);
	// 		}
	// 	}
	//
	// 	if (colliders!==undefined){
	// 		//cast left
	// 		dir.set(-1,0,0);
	// 		dir.applyMatrix4(this.object.matrix);
	// 		dir.normalize();
	// 		raycaster = new THREE.Raycaster(pos, dir);
	//
	// 		let intersect = raycaster.intersectObjects(colliders);
	// 		if (intersect.length>0){
	// 			if (intersect[0].distance<50) this.object.translateX(100-intersect[0].distance);
	// 		}
	//
	// 		//cast right
	// 		dir.set(1,0,0);
	// 		dir.applyMatrix4(this.object.matrix);
	// 		dir.normalize();
	// 		raycaster = new THREE.Raycaster(pos, dir);
	//
	// 		intersect = raycaster.intersectObjects(colliders);
	// 		if (intersect.length>0){
	// 			if (intersect[0].distance<50) this.object.translateX(intersect[0].distance-100);
	// 		}
	//
	// 		//cast down
	// 		dir.set(0,-1,0);
	// 		pos.y += 200;
	// 		raycaster = new THREE.Raycaster(pos, dir);
	// 		const gravity = 30;
	//
	// 		intersect = raycaster.intersectObjects(colliders);
	// 		if (intersect.length>0){
	// 			const targetY = pos.y - intersect[0].distance;
	// 			if (targetY > this.object.position.y){
	// 				//Going up
	// 				this.object.position.y = 0.8 * this.object.position.y + 0.2 * targetY;
	// 				this.velocityY = 0;
	// 			}else if (targetY < this.object.position.y){
	// 				//Falling
	// 				if (this.velocityY==undefined) this.velocityY = 0;
	// 				this.velocityY += dt * gravity;
	// 				this.object.position.y -= this.velocityY;
	// 				if (this.object.position.y < targetY){
	// 					this.velocityY = 0;
	// 					this.object.position.y = targetY;
	// 				}
	// 			}
	// 		}
	// 	}
		}
		// this.object.rotateY(this.motion.turn*dt);

// 		this.updateSocket();
// 	}
// }
