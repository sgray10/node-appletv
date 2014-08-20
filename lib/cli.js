var AppleTV = require("./appletv");
var CommandClient = require("./client");
var StreamServer = require("./server");

function CLI() {
  this.server = null;
};
CLI.prototype = {
  play: function(fpath) {
    console.log("CLI: Attempting to play " + fpath);
  },

  usage: function() {
    console.log("Usage: atv <command> [<args>]");
    console.log("\nOptions:");
    console.log("   play   Stream file to apple tv console(s)");
    console.log("   list   List available apple tv console(s)");
    console.log("   help   Get help with a command\n");
  },

  main: function() {
    //var tv = new AppleTV({name: "", address: "192.168.1.2", port: "7000"});
    //var client = new CommandClient(tv);
    var server = new StreamServer(9000);
    server.start();
    //client.scrub();
    //client.play("http://192.168.1.5:8080/");
    //client.reverse();
  }
};

var cli = new CLI();
cli.main();
