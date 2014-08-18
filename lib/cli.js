function CLI() {
  this.consoles = [];
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
    this.usage();
  }
};

var cli = new CLI();
cli.main();
