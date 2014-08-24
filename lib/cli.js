var AppleTV = require("./appletv"),
    CommandClient = require("./client"),
    StreamServer = require("./server"),
    FileStream = require('./filestream');

var usage = function() {
  console.log("Usage: atv [<args>]");
  console.log("\nOptions:");
  console.log("   play   Stream file to apple tv console(s)");
};

var arguments = require('commander');
arguments
  .version('0.0.1')
  .usage('[options] <file>')
  .option('-u, --url <url>', 'http live stream url')
  .option('-t, --tv <ip address>', 'apple tv ip address')
  .parse(process.argv);

if (!arguments.url || !arguments.tv || arguments.args.length === 0) {
  process.argv.push('--help')
  arguments.parse(process.argv);
  process.exit(1);
}

var playFile = function(url, ip, filepath) {
  var client = new CommandClient(ip, 7000);
  var fstream = new FileStream(filepath);
  fstream.once('ready', function() {
    var server = new StreamServer(9000);
    server.once('ready', function() {
      client.playUrl(url);
    });
    server.start(fstream);
  });
}

playFile(arguments.url, arguments.tv, arguments.args[0]);
