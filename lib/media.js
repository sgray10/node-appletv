var events = require('events'),
    probe = require('node-ffprobe'),
    util = require('util');

function MediaStats(filePath) {
  events.EventEmitter.call(this);
  var self = this;
  self.info = null;
  self.err = null;
  probe(filePath, function(err, data) {
    self.info = data;
    self.emit('ready', data);
  });
};
util.inherits(MediaStats, events.EventEmitter);

module.exports = MediaStats;
