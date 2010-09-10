var rpc = require('msgpack-rpc');
var assert = require('assert');

var client = rpc.createClient(8000);
client.on('ready', function() {
  var count = 0;
  setInterval(function() {
    var b = "asdkjfhksjadfhskdjflksdjlfewiurowieurowieuroi";
    for(var i = 0;i < 10000;i++) {
      client.invoke('echo', b, function(err, response) {
        if(!err) {
          count += 1;
          var the_buf = response;
          assert.equal(b.length, the_buf.length);
        } else {
          console.log("call failed");
        }
      });
    }
  }, 500);
});
