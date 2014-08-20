var events = require('events'),
    util = require('util');

function Transcoder() {
  events.EventEmitter.call(this);
};
util.inherits(Transcoder, events.EventEmitter);

Transcoder.prototype.transcode = function(media) {
  var spawn = require('child_process').spawn,
      ffmpeg_path = '/opt/boxen/homebrew/bin/ffmpeg',
      ffmpeg = spawn(ffmpeg_path, this.options(media)),
      self = this;
  ffmpeg.stderr.setEncoding('utf8');
  ffmpeg.stderr.on('data', function(data) {
    console.log('[transcoder]: ' + data);
  });
  ffmpeg.on('exit', function() {
    self.emit('ready');
  });
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
    '-f', 'segment',
    '-segment_time', 5,
    '-segment_list', '/tmp/playlist.m3u8',
    '-segment_format',
    'mpegts',
    '/tmp/%05d.ts'
  ];
}

module.exports = Transcoder;
