var events = require('events'),
    probe = require('node-ffprobe'),
    util = require('util');

function MediaStats(filePath) {
  events.EventEmitter.call(this);
  var self = this;
  probe(filePath, function(err, data) {
    if (err) {
      console.log('error: ', err);
    }
    self.info = data;
    self.file = data.file;
    self.duration = data.format.duration;
    self.streams = data.streams;
    self.indexes = {};
    for (var i = 0; i < self.streams.length; i++) {
      var type = self.streams[i].codec_type;
      if (self.indexes[type] === undefined)
        self.indexes[type] = [];
      self.indexes[type].push(i);
    }
    self.vIndex = self.indexes.video[0];
    self.aIndex = self.indexes.audio[0];
    self.emit('ready', data);
  });
};
util.inherits(MediaStats, events.EventEmitter);

module.exports = MediaStats;
