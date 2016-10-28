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
	cmd.option('-c --consumer <port>', 'specifies consumer port (3000)', 3000);
	cmd.option('-p --provider <port>', 'specifies provider port (3001)', 3001);
	cmd.parse(process.argv);

	prefixLogs();

	if (cmd.log) {
		var date = new Date();
		var path = sprintf('%s/logs', __dirname);
		var name = sprintf('%04d-%02d-%02d-%02d-%02d-%02d.log', date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());

		mkpath(path);
		redirectLogs(Path.join(path, name));
	}

	console.log('Listening to ports %d (provider) and %d (consumer)...', cmd.provider, cmd.consumer);

	var provider = require('socket.io').listen(cmd.provider);
	var consumer = require('socket.io').listen(cmd.consumer);

	provider.on('connection', function(providerSocket) {

		console.log('A device connected.');


		providerSocket.on('register', function(options) {

			console.log('A provider registered service \'%s\'...', options.service);

			providerSocket.join(options.service);

			consumer.on('connection', function(consumerSocket) {


				console.log('A consumer connected in service \'%s\'', options.service);


				consumerSocket.join(options.service);

				consumerSocket.on('disconnect', function(data) {
					console.log('A consumer disconnected from service \'%s\'', options.service);

				});

				if (isArray(options.messages)) {
					options.messages.forEach(function(message) {
						console.log('Defining message \'%s\'.', message);
						consumerSocket.on(message, function(args) {
							provider.to(options.service).emit(message, args);
						});

					});
				}

				consumerSocket.emit('hello');
			});

			if (isArray(options.events)) {
				options.events.forEach(function(event) {
					console.log('Defining event \'%s\'.', event);
					providerSocket.on(event, function(args) {
						consumer.to(options.service).emit(event, args);
					});

				});

			}

			providerSocket.on('disconnect', function(data) {
				console.log('Lost provider for service \'%s\'...', options.service);
				providerSocket.conn.close();
			});



		});

		providerSocket.emit('hello');
	});

};

new App();
