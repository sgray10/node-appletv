var net = require('net');

function CommandClient(address, port) {
  var self = this;
  self.address = address;
  self.port = port;
  self.userAgent = 'User-Agent: iTunes/11.0.2\n';
  self.reverseProtocol = 'PTTH/1.0\n';
  self.connection = net.Socket();
  self.connection.connect(self.port, self.address);
  self.connection.on('data', function(response) {
    console.log('[response]:\n' + response.toString() + '\n');
  });
};

CommandClient.prototype.doRequest = function(request) {
  var self = this;
  console.log('[request]:\n' + request + '\n');
  self.connection.write(request);
};

CommandClient.prototype.scrub = function() {
  var self = this;
  console.log("[controller: tcp://" + self.address + "/]: scrub");
  var req = 'GET /scrub HTTP/1.1\n';
  req += self.userAgent;
  req += '\n';
  self.doRequest(req);
};

CommandClient.prototype.reverse = function() {
  var self = this;
  console.log("[controller: tcp://" + self.address + "/]: reverse HTTP");
  var req = 'POST /reverse HTTP/1.1\n';
  req += self.userAgent;
  req += 'Upgrade: ' + self.reverseProtocol;
  req += 'Content-Length: 0\n';
  req += 'Connection: Upgrade\n\n';
  self.doRequest(req);
};

CommandClient.prototype.play = function(url) {
  var self = this;
  console.log("[controller: tcp://" + self.address + "/]: play " + url);
  var content = 'Content-Location: ' + url + '\nStart-Position: 0\n', req = '';
  req += 'POST /play HTTP/1.1\n';
  req += self.userAgent;
  req += 'Content-Length: ' + content.length + '\n\n';
  req += content;
  self.scrub();
  self.doRequest(req);
  self.reverse();
};

module.exports = CommandClient;
