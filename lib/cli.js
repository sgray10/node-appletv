var AppleTV = require("./appletv"),
    CommandClient = require("./client"),
    StreamServer = require("./server"),
    FileStream = require('./filestream'),
    mdns = require('mdns'),
    os = require('os'),
    Table = require('cli-table'),
    plist = require('plist'),
    ProgressBar = require('progress');


function getLocalIP(interface) {
  var interfaces = os.networkInterfaces();
  var addresses = interfaces[interface];
  for (var i = 0; i < addresses.length; i++) {
    if (addresses[i].family === 'IPv4') {
      return addresses[i].address;
    }
  }
}

function getAirplayDevices(callback, timeout) {
  var devices = [];
  var browser = mdns.createBrowser(mdns.tcp('_airplay'));
  browser.on('serviceUp', function(service) {
    devices.push({
      deviceId: service.txtRecord.deviceid,
      address: service.addresses[1],
      networkInterface: service.networkInterface,
      port: service.port,
      host: service.host,
      name: service.name,
      fullname: service.fullname,
      _service: service,
    });
  });
  browser.start();
  setTimeout(function() {
    browser.stop();
    devices.sort(function(a, b) {
      var x = a.deviceId, y = b.deviceId;
      return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
    callback(devices);
  }, timeout);
}

function listDevices(timeout) {
  getAirplayDevices(function(devices) {
    var table = new Table({
      head:['device #', 'identifier', 'name', 'interface', 'address', 'port'],
      colWidths: [10, 20, 20, 10, 20, 15],
      chars: {
        'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
        'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
        'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '',
        'right': '', 'right-mid': '', 'middle': ' '
      },
      style: {
        'head': ['grey'],
        'padding-left': 0,
        'padding-right': 0,
        'compact': true
      }
    });
    for (var i = 0; i < devices.length; i++) {
      var dev = devices[i];
      table.push([
        i,
        dev.deviceId,
        dev.name,
        dev.networkInterface,
        dev.address,
        dev.port
      ]);
    }
    console.log("Available Devices:");
    console.log(table.toString());
    process.exit(0);
  }, timeout);
}

function playFileDevice(device, filepath, onInfo) {
  var address = device.address, port = device.port;
  var url = 'http://' + getLocalIP(device.networkInterface) + ':9000/';
  var client = new CommandClient(address, port);
  var fstream = new FileStream(filepath);
  fstream.once('ready', function() {
    var server = new StreamServer(9000);
    server.once('ready', function() {
      client.playUrl(url, onInfo);
    });
    server.start(fstream);
  });
}

function play(deviceId, filepath, onInfo) {
  getAirplayDevices(function(devices) {
    playFileDevice(devices[deviceId], filepath, onInfo);
  }, 1000);
}

var statusBar = undefined;
function updateStatusBar(position, duration) {
  if (position && duration) {
    if (!statusBar) {
      var fmt = '[\u001b[30;1mplayback\u001b[0m]: [:bar] :percent :current/';
      fmt += duration + '(s)';
      statusBar = new ProgressBar(fmt, {
        complete: '\u001b[32m=\u001b[0m',
        incomplete: ' ',
        width: 50,
        total: duration
      });
    }
    statusBar.update(position / duration);
  }
}

function onPlayInfo(response) {
  var info = plist.parse(response.body.toString());
  var duration = info.duration, position = info.position;
  if (JSON.stringify(info) !== '{}') {
    if (info.readyToPlay && info.rate != 0) {
      updateStatusBar(position, duration);
    }
  }
  else if (statusBar) {
      statusBar.terminate();
      statusBar = undefined;
      process.exit(0);
  }
}

function main() {
  var opts = require('commander');
  opts
    .version('0.0.1')
    .usage('[options] [file]')
    .option('-l, --list', 'list available airplay devices')
    .option('-t, --timeout <number>', 'time to search for airplay devices in milliseconds')
    .option('-d, --device <number>', 'select airplay device')
    .parse(process.argv);

  if (opts.list != undefined) {
    var timeout = (opts.timeout === undefined) ? 1000 : parseInt(opts.timeout);
    console.log(timeout);
    listDevices(timeout);
  }
  if (opts.device != undefined && opts.args.length != 0) {
    play(parseInt(opts.device), opts.args[0], onPlayInfo);
  }
}

main();
