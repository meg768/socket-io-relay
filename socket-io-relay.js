#!/usr/bin/env node

var fs = require('fs');
var Path = require('path');
var mkpath = require('yow').mkpath;
var sprintf = require('yow').sprintf;
var isArray = require('yow').isArray;
var readJSON = require('yow').readJSON;
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

	function register(provider, consumer, messages, events) {

		var providerNamespace = io.of('/' + provider);
		var consumerNamespace = io.of('/' + consumer);

		providerNamespace.on('connection', function(socket) {
			console.log('New provider socket connection', socket.id);

			events.forEach(function(event) {
				console.log('Defining event \'%s\'.', event);
				socket.on(event, function(args) {
					consumerNamespace.emit(event, args);
				});

			});

			socket.emit('hello');
		});

		consumerNamespace.on('connection', function(socket) {
			console.log('New consumer socket connection', socket.id);



			messages.forEach(function(message) {
				console.log('Defining message \'%s\'.', message);
				socket.on(message, function(args) {
					providerNamespace.emit(message, args);
				});

			});

			socket.emit('hello');
		});

	}




	function run() {
		var configFile = sprintf('%s/%s.config', __dirname, Path.parse(__filename).name);
		var config = readJSON(configFile);

		for (var key in config.namespaces) {
			var entry = config.namespaces[key];
			register(entry.provider, entry.consumer, entry.messages, entry.events);
		}

		io.of('/provider').on('connection', function(socket) {
			socket.on('register', function(entry) {

				console.log('register!!!');
				register(entry.provider, entry.consumer, entry.messages, entry.events);

			});
		});

	}

	run();

};
/*
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

	function register(provider, consumer, messages, events) {

		var providerNamespace = io.of('/' + provider);
		var consumerNamespace = io.of('/' + consumer);

		providerNamespace.on('connection', function(socket) {
			console.log('New provider socket connection', socket.id);

			events.forEach(function(event) {
				console.log('Defining event \'%s\'.', event);
				socket.on(event, function(args) {
					consumerNamespace.emit(event, args);
				});

			});

			socket.emit('hello');
		});

		consumerNamespace.on('connection', function(socket) {
			console.log('New consumer socket connection', socket.id);



			messages.forEach(function(message) {
				console.log('Defining message \'%s\'.', message);
				socket.on(message, function(args) {
					providerNamespace.emit(message, args);
				});

			});

			socket.emit('hello');
		});

	}

	function run() {
		var configFile = sprintf('%s/%s.config', __dirname, Path.parse(__filename).name);
		var config = readJSON(configFile);

		for (var key in config.namespaces) {
			var entry = config.namespaces[key];
			register(entry.provider, entry.consumer, entry.messages, entry.events);
		}

	}

	run();

};

*/
new App();
