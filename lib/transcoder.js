var events = require('events'),
    util = require('util'),
    net = require('net'),
    spawn = require('child_process').spawn,
    stream = require('stream');

function SegmentBuffer(min, max) {
  var self = this;
  events.EventEmitter.call(this);
  self.segments = [];
  self.min = min;
  self.max = max;
};
util.inherits(SegmentBuffer, events.EventEmitter);

SegmentBuffer.prototype.add = function(segment) {
  var self = this;
  self.segments.push(segment);
  if (self.segments.length === self.max)
    self.emit('full');
};

SegmentBuffer.prototype.empty = function() {
  var self = this;
  self.segments = [];
};

SegmentBuffer.prototype.lookup = function(id) {
  var self = this, found = false;
  for (var j = 0; j < self.segments.length; j++) {
    if (self.segments[j].id === id) {
      var result = self.segments.splice(0, j+1)[j];
      found = true;
      self.emit('segment', result);
    }
  }
  if (self.segments.length < self.min && found)
    self.emit('low');
  if (!found)
    self.emit('notfound', id);
};

function Segment(id, data) {
  this.id = id;
  this.data = data;
  this.length = data._readableState.length;
};

function TranscodePipe(media, port, position) {
  events.EventEmitter.call(this);
  var self = this;
  self.ffmpeg_path = '/opt/boxen/homebrew/bin/ffmpeg',
  self.segmenter = undefined,
  self.ffmpeg = undefined,
  self.media = media,
  self.port = port,
  self.server = undefined,
  self.begin = position,
  self.offset = 0,
  self.startServer(port);
  self.startJob(position);
};
util.inherits(TranscodePipe, events.EventEmitter);

TranscodePipe.prototype.startJob = function(segmentId) {
  var self = this;
  self.ffmpeg = spawn(self.ffmpeg_path, self.options(self.media, segmentId)),
  self.segmenter = spawn('../lib/segmenter', ['5', '9001']);
  self.ffmpeg.stdout.pipe(self.segmenter.stdin);
  self.ffmpeg.stderr.on('data', function(data) {
    console.log('[transcoder]: ' + data);
  });
  self.segmenter.stderr.on('data', function(data) {
    console.log('[segmenter]: ' + data);
  });
};

TranscodePipe.prototype.startServer = function(port) {
  var self = this, fragments = [];
  self.server = net.createServer(function(connection) {
    connection.on('data', function(data) {
      fragments.push(data);
    });
    connection.on('close', function() {
      if (connection.bytesRead === 0)
        self.emit('end-of-stream');
      else {
        var data = new stream.Transform(), id = self.startpos + self.offset;
        data.push(Buffer.concat(fragments));
        data.push(null);
        self.emit('segment', new Segment(self.startpos + self.offset, data));
        fragments = [];
        self.offset++;
      }
    });
  }).listen(port);
  self.server.once('listening', function() {
    console.log('[transcoder]: transcode job accepting requests');
  });
  self.server.on('error', function(err) {
    console.log('[transcoder]: error: ' + err);
  });
};

TranscodePipe.prototype.stop = function (id) {
  var self = this;
  self.segmenter.on('close', function() {
    self.ffmpeg.kill('SIGHUP');
  });
  self.ffmpeg.on('close', function() {
    self.offset = 0;
    self.emit('stopped');
  });
  self.segmenter.kill('SIGHUP');
};

TranscodePipe.prototype.suspend = function () {
  var self = this;
  self.ffmpeg.kill('SIGSTOP');
  self.emit('suspended');
};

TranscodePipe.prototype.resume = function () {
  var self = this;
  self.ffmpeg.kill('SIGCONT');
};

TranscodePipe.prototype.options = function(media, segmentId) {
  var self = this;
  self.startpos = (segmentId === undefined) ? 0 : segmentId;
  var opts = [
    '-ss', 5*self.startpos,
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
  return opts;
}


function Transcoder(media, port) {
  events.EventEmitter.call(this);
  var self = this;
  self.pipeline = new TranscodePipe(media, port, 0);
  self.buffer = new SegmentBuffer(12, 24),
  self.buffer.on('low', function() { self.pipeline.resume(); });
  self.buffer.on('full', function() { self.pipeline.suspend(); });
  self.pipeline.on('segment', function(s) { self.buffer.add(s); });
  self.buffer.on('segment', function(s) { self.emit('segment', s); });
  self.buffer.on('notfound', function(id) { self.seek(id); });
};
util.inherits(Transcoder, events.EventEmitter);

Transcoder.prototype.seek = function(id) {
  var self = this;
  self.pipeline.once('suspended', function() { self.buffer.lookup(id); });
  self.pipeline.once('stopped', function() {
    self.buffer.empty();
    self.pipeline.startJob(id);
  });
  self.pipeline.stop();
}

Transcoder.prototype.getSegment = function(id) {
  var self = this;
  self.buffer.lookup(id);
};

module.exports = Transcoder;
