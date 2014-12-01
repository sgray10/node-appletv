var http = require("http"),
    url = require("url"),
    fs = require("fs"),
    path = require("path"),
    Transcoder = require('./transcoder'),
    events = require('events'),
    util = require('util'),
    through = require('through');

function StreamServer(port) {
  events.EventEmitter.call(this);
  this.port = port;
  this.server = null;
};
util.inherits(StreamServer, events.EventEmitter);

StreamServer.prototype.start = function(fstream) {
  var self = this;
  console.log("[httpd]: starting on port " + this.port);
  self.server = http.createServer(function(req, res) {
    var uri = url.parse(req.url).pathname;
    if (uri === "/")
      uri += 'root.m3u8';
    fstream.once('segment', function(segment) {
      res.writeHead(200, {
        'User-Agent': 'iTunes/11.0.2\n',
        'Content-Type': segment.type,
        'Content-Length': segment.length
      });
      segment.data.pipe(res);
    });
    fstream.get(uri);
  }).listen(this.port);
  self.server.once('listening', function() { self.emit('ready'); });
}

module.exports = StreamServer;
