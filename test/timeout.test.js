var rpc = require('msgpack-rpc');

module.exports = {
  'trigger timeout' : function(assert, beforeExit) {
    var cb_triggered = false;
    var s = new rpc.createServer();
    s.listen(8020, function() {
      var c = rpc.createClient(8020);
      c.setTimeout(3000);
      c.invoke("hello", "world", function(err, response) {
        cb_triggered = true;
        c.close();
        s.close();
        assert.equal("timeout", err);
      });
    });

    beforeExit(function() {
      assert.ok(cb_triggered);
    });
  }
}
