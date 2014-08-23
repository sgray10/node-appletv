var events = require('events'),
    util = require('util'),
    net = require('net'),
    spawn = require('child_process').spawn,
    stream = require('stream');

function SegmentCache(min, max) {
  var self = this;
  events.EventEmitter.call(this);
  self._cache = [];
  self.min = min;
  self.max = max;
};
util.inherits(SegmentCache, events.EventEmitter);

SegmentCache.prototype.add = function(segment) {
  var self = this;
  self._cache.push(segment);
  if (self._cache.length === self.max)
    self.emit('cachefull');
};

SegmentCache.prototype.empty = function() {
  var self = this;
  self._cache = [];
};

SegmentCache.prototype.lookup = function(id) {
  var self = this;
  var result = undefined, buf = undefined, found = false;
  for (var j = 0; j < self._cache.length; j++) {
    if (self._cache[j].index === id) {
      result = self._cache.splice(0, j+1)[j];
      buf = Buffer.concat(result.fragments);
      result.data = new stream.Transform();
      result.data.push(buf);
      result.fragments = undefined;
      found = true;
      self.emit('hit', result);
    }
  }
  if (self._cache.length < self.min && found)
    self.emit('cachelow');
  if (!found) {
    self.emit('miss', id);
  }
};

function TranscodePipe(media, port) {
  events.EventEmitter.call(this);
  var self = this;
  self.ffmpeg_path = '/opt/boxen/homebrew/bin/ffmpeg',
  self.segmenter = undefined,
  self.ffmpeg = undefined,
  self.media = media,
  self.port = port,
  self.server = undefined,
  self.startpos = 0,
  self.offset = 0,
  self.isRunning = false;
  self.currentSegment = {index: -1, fragments: [], length: 0};
  self.start(self.startSegment, self.port);
};
util.inherits(TranscodePipe, events.EventEmitter);


TranscodePipe.prototype.start = function (segmentId, port) {
  var self = this;
  if (self.server === undefined) {
    self.startServer(port);
  }
  self.startJob(segmentId);
};

TranscodePipe.prototype.startJob = function(segmentId) {
  var self = this;
  self.ffmpeg = spawn(self.ffmpeg_path, self.options(self.media, segmentId)),
  self.segmenter = spawn('../lib/segmenter', ['5', '9001']);
  self.startSegment = segmentId;
  self.ffmpeg.stdout.pipe(self.segmenter.stdin);
  self.ffmpeg.stderr.on('data', function(data) {
    console.log('[transcoder]: ' + data);
  });
  self.segmenter.stderr.on('data', function(data) {
    console.log('[segmenter]: ' + data);
  });
  self.emit('started');
};

TranscodePipe.prototype.startServer = function(port) {
  var self = this;
  self.server = net.createServer(function(connection) {
    connection.on('data', function(data) {
      self.currentSegment.fragments.push(data);
      self.currentSegment.length += data.length;
    });
    connection.on('close', function() {
      if (connection.bytesRead === 0)
        self.emit('end-of-stream');
      else {
        self.currentSegment.index = self.startpos + self.offset;
        self.emit('segment', {
          index: self.currentSegment.index,
          fragments: self.currentSegment.fragments,
          length: self.currentSegment.length
        });
        self.currentSegment.index = -1,
        self.currentSegment.fragments = [],
        self.currentSegment.length = 0;
        self.offset++;
      }
    });
  }).listen(port);
  self.server.on('listening', function() {
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
  self.pipeline = new TranscodePipe(media, port);
  self.cache = new SegmentCache(12, 24),

  self.cache.on('cachelow', function(running) {
    self.pipeline.resume();
  });

  self.cache.on('cachefull', function() {
    self.pipeline.suspend();
  });

  self.pipeline.on('segment', function(segment) {
    self.cache.add(segment);
  });

  self.cache.on('hit', function(segment) {
    self.emit('segment', segment);
  });

  self.handleSuspended = function() {
    self.cache.lookup(self.seeking);
  };

  self.handleStopped = function() {
    self.pipeline.once('suspended', self.handleSuspended);
    self.cache.empty();
    self.pipeline.startJob(self.seeking);
  };

  self.handleMiss = function() {
    self.pipeline.once('stopped', self.handleStopped);
    self.pipeline.stop();
  };
  self.cache.on('miss', self.handleMiss);
};
util.inherits(Transcoder, events.EventEmitter);

Transcoder.prototype.getSegment = function(segmentId) {
  var self = this;
  self.seeking = segmentId;
  self.cache.lookup(segmentId);
};

module.exports = Transcoder;
