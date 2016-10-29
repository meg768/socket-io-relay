#!/usr/bin/env node

var fs = require('fs');
var Path = require('path');
var mkpath = require('yow').mkpath;
var sprintf = require('yow').sprintf;
var isArray = require('yow').isArray;
var redirectLogs = require('yow').redirectLogs;
var prefixLogs = require('yow').prefixLogs;
var cmd = require('commander');

var App = function() {
	cmd.version('1.0.0');
	cmd.option('-l --log', 'redirect logs to file');
	cmd.option('-p --port <port>', 'specifies port to listen to (3000)', 3000);
	cmd.parse(process.argv);

	prefixLogs();

	if (cmd.log) {
		var date = new Date();
		var path = sprintf('%s/logs', __dirname);
		var name = sprintf('%04d-%02d-%02d-%02d-%02d-%02d.log', date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());

		mkpath(path);
		redirectLogs(Path.join(path, name));
	}

	console.log('Listening to port %d...', cmd.port);

	var io = require('socket.io').listen(cmd.port);

	io.on('connection', function(socket) {

		console.log('New socket connection ', socket.id);

		socket.on('disconnect', function(options) {
			console.log('Disconnect from ', socket.id);
		});

		socket.on('register', function(options) {

			console.log('A provider registered service \'%s\'...', options.service);

			// Save the provider, need to emit events to it
			var provider = socket;

			// Create a new name space with the service name
			var namespace = io.of('/' + options.service);

			namespace.on('connection', function(socket) {

				console.log('A consumer connected to service \'%s\'', options.service);

				socket.emit('helloX');

				socket.on('disconnect', function(data) {
					console.log('A consumer disconnected from service \'%s\'', options.service);

				});

				if (isArray(options.messages)) {
					options.messages.forEach(function(message) {
						console.log('Defining message \'%s\'.', message);
						socket.on(message, function(args) {
							io.to(provider.id).emit(message, args);
						});

					});
				}

			});

			if (isArray(options.events)) {
				options.events.forEach(function(event) {
					console.log('Defining event \'%s\'.', event);
					socket.on(event, function(args) {
						console.log('Sending event', event, args);
						namespace.emit(event, args);
					});

				});

			}

			socket.on('disconnect', function(data) {
				console.log('Lost provider for service \'%s\'...', options.service);
				socket.conn.close();
			});



		});

		socket.emit('hello');
	});

};

new App();
