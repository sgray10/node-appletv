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

FileStream.prototype.resource = function(uri) {
  var result = {}
  result.length = fs.statSync('/tmp' + uri).size;
  result.data = fs.createReadStream('/tmp' + uri);
  if (path.extname(uri) === '.ts')
    result.type = 'video/MP2T'
  else {
    var plist = '#EXTM3U\n';
    plist += '#EXT-X-VERSION:3\n';
    plist += '#EXT-MEDIA-SEQUENCE:0\n';
    plist += '#EXT-ALLOW-CACHE:NO\n';
    plist += '#EXT-TARGETDURATION:6\n';
    for (var i = 0; i < this.nchunks; i++) {
      var str = '' + i, pad = '00000';
      plist += '#EXTINF:6.000000,\n';
      plist += pad.substring(0, pad.length - str.length) + str + '.ts' + '\n';
    }
    plist += '#EXT-X-ENDLIST';
    result.length = plist.length;
    result.data = new stream();
    result.data.pipe = function(dst) {
      dst.write(plist);
    }
    result.type  = 'application/vnd.apple.mpegurl';
  }
  return result;
};

module.exports = FileStream;
