var MediaStats = require('./media'),
    Transcoder = require('./transcoder'),
    fs = require('fs'),
    events = require('events'),
    util = require('util'),
    path = require('path'),
    stream = require('stream');

function FileStream(filePath) {
  console.log('[filestream]: creating stream for ' + filePath);
  events.EventEmitter.call(this);
  var self = this;

  self.transcoder = new Transcoder();
  self.transcoder.on('ready', function() {
    console.log('[transcoder]: done');
    console.log('[filestream]: ready to serve');
  });

  self.stats = new MediaStats(filePath),
  self.stats.on('ready', function() {
    self.nchunks = self.stats.info['format']['duration'] / 5;
    self.transcoder.transcode(self.stats);
  });
};
util.inherits(FileStream, events.EventEmitter);

FileStream.prototype.chunk = function(uri) {
  var result = {};
  result.length = fs.statSync('/tmp' + uri).size;
  result.data = fs.createReadStream('/tmp' + uri);
  result.type = 'video/MP2T'
  return result;
}

FileStream.prototype.playlist = function(uri) {
  var result = {};
  var plist = '#EXTM3U\n';
  plist += '#EXT-X-VERSION:3\n';
  plist += '#EXT-X-MEDIA-SEQUENCE:0\n';
  plist += '#EXT-X-ALLOW-CACHE:1\n';
  plist += '#EXT-X-TARGETDURATION:5\n';
  for (var i = 0; i < this.nchunks; i++) {
    var str = '' + i, pad = '00000';
    plist += '#EXTINF:5,\n';
    plist += pad.substring(0, pad.length - str.length) + str + '.ts' + '\n';
  }
  plist += '#EXT-X-ENDLIST\n';
  result.length = plist.length;
  result.data = new stream.Readable();
  result.data._read = function noop() {};
  result.data.push(plist);
  result.data.push(null);
  result.type  = 'application/vnd.apple.mpegurl';
  return result;
}

FileStream.prototype.resource = function(uri) {
  if (path.extname(uri) === '.ts')
    return this.chunk(uri);
  return this.playlist(uri);
};

module.exports = FileStream;
