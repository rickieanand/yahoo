const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const cors = require('cors');
const path = require('path');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 5000;
const router = require('./router')

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users')

// Multi-process to utilize all CPU cores.
if (!isDev && cluster.isMaster) {
	console.error(`Node cluster master ${process.pid} is running`);

	// Fork workers.
	for (let i = 0; i < numCPUs; i++) {
		cluster.fork();
	}

	cluster.on('exit', (worker, code, signal) => {
		console.error(`Node cluster worker ${worker.process.pid} exited: code ${code}, signal ${signal}`);
	});

} else {
	const app = express()
	const server = http.createServer(app)
	const io = socketio(server)
	app.use(cors())
	//  app.use(router)
    // Priority serve any static files.
	app.use(express.static(path.resolve(__dirname, '../react-ui/build')));

	// Answer API requests.
	app.get('/api', function (req, res) {
		res.set('Content-Type', 'application/json');
		res.send('{"message":"Hello from the custom server!"}');
	});

	// All remaining requests return the React app, so it can handle routing.
	app.get('*', function(request, response) {
		response.sendFile(path.resolve(__dirname, '../react-ui/build', 'index.html'));
	});


	io.on('connect', (socket) => {
		socket.on('join', ({ name, room }, callback) => {
			const { error, user } = addUser({ id: socket.id, name, room });
			console.log('1 joined')
			if (error) return callback(error);

			socket.join(room);

			socket.emit('message', { user: 'admin', text: `${name}, welcome to room ${room}.` });
			socket.broadcast.to(room).emit('message', { user: 'admin', text: `${name} has joined!` });

			io.to(room).emit('roomData', { room: room, users: getUsersInRoom(room) });

			callback();
		});

		socket.on('sendMessage', (message, callback) => {
			const user = getUser(socket.id);
			console.log('answer: ', user)
			io.to(user.room).emit('message', { user: user.name, text: message });

			callback();
		});

		socket.on('mouse',
			function (data) {
				socket.broadcast.emit('mouse', data);
			}
		)

		socket.on('disconnect', () => {
			const user = removeUser(socket.id);

			if (user) {
				io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
				io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
			}
		})
	})
	app.listen(PORT, function () {
		console.error(`Node ${isDev ? 'dev server' : 'cluster worker '+process.pid}: listening on port ${PORT}`);
	});
}
