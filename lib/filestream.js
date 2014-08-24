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
  self.stats = new MediaStats(filePath),
  self.stats.once('ready', function() {
    self.nchunks = self.stats.info['format']['duration'] / 5;
    self.transcoder = new Transcoder(self.stats, 9001);
  });
};
util.inherits(FileStream, events.EventEmitter);

FileStream.prototype.getSegment = function(uri) {
  var self = this;
  var id = parseInt(uri.split('/')[1].split('.')[0]);

  self.transcoder.once('segment', function(segment) {
    segment.type = 'video/MP2T';
    self.emit('segment', segment);
  });
  self.transcoder.getSegment(id);
}

FileStream.prototype.getPlaylist = function(uri) {
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
  this.emit('segment', result);
}

FileStream.prototype.get = function(uri) {
  var self = this;
  if (path.extname(uri) === '.ts')
    this.getSegment(uri);
  else if (path.extname(uri) === '.m3u8')
    this.getPlaylist(uri);
  else
    self.emit('invalid', 'invalid HTTP live streaming resource');
};

module.exports = FileStream;
