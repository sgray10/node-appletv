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
  console.log("[server]: starting on port " + this.port);
  this.server = http.createServer(function(req, res) {
    var uri = url.parse(req.url).pathname;
    console.log('[server]: device requested ' + uri);
    if (uri === "/")
      uri += 'playlist.m3u8';
    if (path.extname(uri) === ".ts" || path.extname(uri) == ".m3u8") {
      fstream.once('segment', function(segment) {
        res.writeHead(200, {
          'Content-Type': segment.type,
          'Content-Length': segment.length
        });
        segment.data.pipe(res);
      });
      fstream.resource(uri);
    }
    else {
      res.writeHead(404);
      res.end();
    }
  }).listen(this.port);
  self.server.setMaxListeners(0);
}

module.exports = StreamServer;
