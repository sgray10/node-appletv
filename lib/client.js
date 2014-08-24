function CommandClient(appletv) {
  this.appletv = appletv;
  this.url = "http://" + this.appletv.address + ":" + this.appletv.port;  
};
CommandClient.prototype = {
  userAgent: "iTunes/11.0.2",
  reverseProtocol: "PTTH/1.0",

  scrub: function() {
    console.log("[controller]: issuing scrub command to " + this.url);
  },

  play: function(url) {
    console.log("[controller]: issuing play command to " + this.url);
  },

  reverse: function() {
    console.log("[controller]: Issuing reverse command to " + this.url);
  }
};

module.exports = CommandClient;
