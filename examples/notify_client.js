var rpc = require('msgpack-rpc');
var assert = require('assert');

var client = rpc.createClient(8000);
client.on('ready', function() {
  var count = 0;
  setInterval(function() {
    for(var i = 0;i < 10000;i++) {
      client.notify('hello', "world") 
    }
  }, 500);
});
