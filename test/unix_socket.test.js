var rpc = require('msgpack-rpc');

module.exports = {
  'should work over unix sockets' : function(assert, beforeExit) {
    var received_response = false;
    var s = rpc.createServer(function(stream) {
      stream.on('request', function(method, params, response) {
        response.result("sup");
      });
    });
    s.listen("/tmp/node.msgpack.rpc.sock", function() {

      var c = rpc.createClient("/tmp/node.msgpack.rpc.sock", function() {
        c.invoke("hello", "world", function(err, response) {
          received_response = true;
          assert.equal("sup", response);
          c.close();
          s.close();
        });
      });
    });

    beforeExit(function() {
      assert.ok(received_response);
    });
  }
}
