var rpc = require('msgpack-rpc');

module.exports = {
  'outstanding request should be failed on transport errors' : function(assert, beforeExit) {
    var failure_triggered = false;
    var s = rpc.createServer(function(stream) {
      stream.on('request', function() {
        stream.stream.end();
        s.close();
      });
    });

    s.listen(8000, function() {
      var c = rpc.createClient(8000, function() {
        c.invoke("hello", "world", function(err, response) {
          failure_triggered = true;
          assert.equal("connection closed by peer", err.message);
        });
      });
    });

    beforeExit(function() {
      assert.ok(failure_triggered);
    });
  },
  'server side failures should be passed to the response method' : function(assert, beforeExit) {
    var failure_triggered = false;
    var s = rpc.createServer(function(stream) {
      stream.on('request', function(method, arg, responseHandler) {
        responseHandler.error("can't hello");
      });
    });

    s.listen(8001, function() {
      var c = rpc.createClient(8001, function() {
        c.invoke("hello", "world", function(err, response) {
          failure_triggered = true;
          c.close();
          s.close();
          assert.equal("can't hello", err);
        });
      });
    });

    beforeExit(function() {
      assert.ok(failure_triggered);
    });
  }
}
