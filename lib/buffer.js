var Stream = require('stream'),
    util = require('util');

function Buffer() {
  Stream.call(this);
  this.writable = true;
};
util.inherits(Buffer, Stream);
Buffer.prototype = {
  write: function(chunk) {
    this.emit('done', chunk);
  }
};

module.exports = Buffer;
