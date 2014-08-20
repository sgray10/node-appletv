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

StreamServer.prototype.start = function(stream) {
  var self = this;
  console.log("[server]: starting on port " + this.port);
  this.server = http.createServer(function(req, res) {
    var uri = url.parse(req.url).pathname;
    console.log('[server]: device requested ' + uri);
    if (uri === "/")
      uri += 'playlist.m3u8';
    if (path.extname(uri) === ".ts" || path.extname(uri) == ".m3u8") {
      var chunk = stream.resource(uri);
      res.writeHead(200, {
        "Content-Type": chunk.type,
        "Content-Length": '' + chunk.length
      });
      chunk.data.pipe(res);
    }
    else {
      res.writeHead(404);
      res.end();
    }
  }).listen(this.port);
}

module.exports = StreamServer;
