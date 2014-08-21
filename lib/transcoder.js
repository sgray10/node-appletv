var events = require('events'),
    util = require('util'),
    net = require('net'),
    spawn = require('child_process').spawn,
    stream = require('stream');

function Transcoder() {
  events.EventEmitter.call(this);
  var self = this;
  self.ffmpeg_path = '/opt/boxen/homebrew/bin/ffmpeg',
  self.segmenter = undefined,
  self.ffmpeg = undefined,
  self.media = undefined,
  self.server = undefined,
  self.segmentsRead = 0,
  self.isRunning = true,
  self.cache = [],
  self.cacheMax = 24,
  self.cacheMin = 12,
  self.currentSegment = {index: -1, fragments: [], size: 0};
};

util.inherits(Transcoder, events.EventEmitter);

Transcoder.prototype.createServer = function(port) {
  var self = this;
  return net.createServer(function(connection) {
    connection.on('data', function(data) {
      self.currentSegment.fragments.push(data);
      self.currentSegment.size += data.length;
    });
    connection.on('close', function() {
      if (connection.bytesRead === 0)
        self.emit('end-of-stream');
      else {
        self.currentSegment.index = self.segmentsRead;
        self.cache.push(self.currentSegment);
        self.currentSegment = {index: -1, fragments:[], size: 0};
        self.segmentsRead++;
        if (self.cache.length === self.cacheMax)
          self.emit('suspend');
      }
    });
  }).listen(port);
};

Transcoder.prototype.transcode = function(media) {
  var self = this;
  self.media = media;
  if (self.server === undefined)
    self.server = self.createServer(9001);
  self.start();
}

Transcoder.prototype.start = function() {
  var self = this;
  self.server.on('listening', function() {
    self.ffmpeg = spawn(self.ffmpeg_path, self.options(self.media)),
    self.segmenter = spawn('../lib/segmenter', ['5', '9001']);
    self.ffmpeg.stdout.pipe(self.segmenter.stdin);
    self.ffmpeg.stderr.on('data', function(data) {
      console.log('[transcoder]: ' + data);
    });
    self.ffmpeg.on('exit', function() {
      console.log('[transcoder]: exiting');
    });
    self.segmenter.stderr.on('data', function(data) {
      console.log('[segmenter]: ' + data);
    });
    self.segmenter.on('exit', function() {
      console.log('[segmenter]: exiting');
    });
    self.on('suspend', function() {
      console.log('[transcoder]: suspending');
      self.ffmpeg.kill('SIGSTOP');
      self.isRunning = false;
      self.emit('buffered');
    });
    self.on('continue', function() {
      console.log('[transcoder]: continuing');
      self.ffmpeg.kill('SIGCONT');
      self.isRunning = true;
    });
    self.on('end-of-stream', function() {
      console.log('[transcoder]: end of stream');
    });
  });
  self.server.on('error', function(err) {
    console.log('[transcoder]: error: ' + err);
  });
}

Transcoder.prototype.getSegment = function(id) {
  var self = this, result = undefined, buf = undefined;
  for (var j = 0; j < self.cache.length; j++) {
    if (self.cache[j].index === id) {
      result = self.cache.splice(0, j+1)[j];
      buf = Buffer.concat(result.fragments);
      result.data = new stream.Transform();
      result.data.push(buf);
      result.fragments = undefined;
    }
  }
  if (self.cache.length < self.cacheMin && self.isRunning === false)
    self.emit('continue');
  return result;
}

Transcoder.prototype.options = function(media) {
  return [
    '-ss', 0,
    '-i', media.info['file'],
    '-t', media.info['format']['duration'],
    '-vcodec', 'copy',
    '-vbsf', 'h264_mp4toannexb',
    '-map', '0:0',
    '-acodec', 'ac3',
    '-ar', '48000',
    '-async', 1,
    '-map', '0:1',
    '-flags',
    '-global_header',
    '-f',
    'mpegts',
    'pipe:1'
  ];
}

module.exports = Transcoder;
