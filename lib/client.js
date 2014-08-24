var net = require('net'),
    events = require('events'),
    util = require('util');

function CommandClient(address, port) {
  events.EventEmitter.call(this);
  var self = this;
  self.address = address;
  self.port = port;
  self.userAgent = 'User-Agent: iTunes/11.0.2\n';
  self.reverseProtocol = 'PTTH/1.0\n';
  self.connection = net.Socket();
  self.connection.connect(self.port, self.address);
  self.connection.on('data', function(response) {
    //console.log(response.toString());
  });
};
util.inherits(CommandClient, events.EventEmitter);

var doRequest = function(request, connection, callback) {
  //console.log('[request]:\n' + request);
  if (callback !== undefined)
    connection.once('data', callback);
  connection.write(request);
};

CommandClient.prototype.playBackInfo = function(callback) {
  var self = this;
  var req = 'GET /playback-info HTTP/1.1\n';
  req += self.userAgent + '\n';
  doRequest(req, self.connection, callback);
};

CommandClient.prototype.serverInfo = function(callback) {
  var self = this;
  var req = 'GET /server-info HTTP/1.1\n';
  req += 'Content-Length: 0\n';
  req += self.userAgent + '\n';
  doRequest(req, self.connection, callback);
};

CommandClient.prototype.scrub = function(callback) {
  var self = this;
  var req = 'GET /scrub HTTP/1.1\n';
  req += self.userAgent + '\n';
  doRequest(req, self.connection, callback);
};

CommandClient.prototype.reverse = function(callback) {
  var self = this;
  var req = 'POST /reverse HTTP/1.1\n';
  req += self.userAgent;
  req += 'Upgrade: ' + self.reverseProtocol;
  req += 'Content-Length: 0\n';
  req += 'Connection: Upgrade\n\n';
  doRequest(req, self.connection, callback);
};

CommandClient.prototype.play = function(url, callback) {
  var self = this;
  var content = 'Content-Location: ' + url + '\nStart-Position: 0\n', req = '';
  req += 'POST /play HTTP/1.1\n';
  req += self.userAgent;
  req += 'Content-Length: ' + content.length + '\n\n' + content;
  doRequest(req, self.connection, callback);
};

CommandClient.prototype.onResponseEmit = function(emitter, event, callback) {
  return function(response) {
    emitter.emit(event);
    if (callback !== undefined)
      callback(response);
  };
};

CommandClient.prototype.playUrl = function(url) {
  var self = this, emit = self.onResponseEmit;
  self.once('serverinfo', function() {
    self.play(url, emit(self, 'play'));
  });
  self.once('reverse', function() {
    setInterval(function() {
      self.playBackInfo(emit(self, 'playbackinfo'));
    }, 5000);
  });
  self.once('play', function() {
    self.reverse(emit(self, 'reverse'));
  });
  self.once('scrub', function() {
    self.serverInfo(emit(self, 'serverinfo'));
  });
  self.scrub(emit(self, 'scrub'));
};

module.exports = CommandClient;
