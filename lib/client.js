var net = require('net');
var events = require('events');
var util = require('util');
var http = require('http');
var HTTPParser = process.binding('http_parser').HTTPParser;

var reqParser = new HTTPParser(HTTPParser.REQUEST);
var parseRequest = function(request, callback) {
  var parsed = undefined;
  reqParser.onHeaders = function(info) {

  }
  reqParser.onHeadersComplete = function(info) {
    parsed = info;
    parsed._headers = info.headers;
  }
  reqParser.onBody = function(buf, start, len) {
    parsed.body = buf.slice(start, start + len);
  }
  reqParser.onMessageComplete = function() {
  }
  reqParser.execute(request, 0, request.length);
}

function CommandClient(address, port) {
  events.EventEmitter.call(this);
  var self = this;
  self.address = address;
  self.port = port;
  self.userAgent = 'User-Agent: iTunes/11.0.2\n';
  self.reverseProtocol = 'PTTH/1.0\n';
  self.connection = net.Socket();
  self.connection.connect(self.port, self.address);
  self.ptth = net.Socket();
  self.ptth.upgraded = false;
  self.ptth.connect(self.port, self.address);
  self.ptth.on('data', function(request) {
    if (self.ptth.upgraded == true) {
      parseRequest(request);
    }
    else {
      self.ptth.upgraded = true;
    }
  });
};
util.inherits(CommandClient, events.EventEmitter);

var parser = new HTTPParser(HTTPParser.RESPONSE);

var parseResponse = function(response, callback) {
  var parsed = undefined;
  parser.onHeadersComplete = function(data) {
    parsed = data;
    parsed._headers = data.headers;
    if ((data.headers.length % 2) == 0) {
      parsed.headers = {};
      for (var i = 0; i < parsed._headers.length - 1; i += 2) {
        var k = parsed._headers[i], v = parsed._headers[i+1];
        parsed.headers[k] = v;
      }
    }
  }
  parser.onBody = function(buf, start, len) {
    parsed.body = (len > 0) ? buf.slice(start, start + len) : undefined;
  }
  parser.onMessageComplete = function() {
    callback(parsed);
  }
  parser.execute(response, 0, response.length);
}

var doRequest = function(request, connection, callback) {
  if (callback != undefined) {
    connection.once('data', function(response) {
      parseResponse(response, callback);
    });
    connection.write(request);
  }
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
  doRequest(req, self.ptth, callback);
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
  return function(incoming) {
    emitter.emit(event);
    if (callback !== undefined)
      callback(incoming);
  };
};

CommandClient.prototype.playUrl = function(url, onInfo) {
  var self = this, emit = self.onResponseEmit;
  self.once('serverinfo', function() {
    self.play(url, emit(self, 'play'));
  });
  self.once('reverse', function() {
    setInterval(function() {
      self.playBackInfo(emit(self, 'playbackinfo', onInfo));
    }, 500);
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
