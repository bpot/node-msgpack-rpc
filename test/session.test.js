var rpc = require('msgpack-rpc');

module.exports = {
  'should reuse clients' : function(assert, beforeExit) {
    var sp = new rpc.SessionPool();
    var server_listened = false;

    var s = rpc.createServer();
    s.listen(8010, function() {
      var client1 = sp.getClient(8010, '127.0.0.1');
      var client2 = sp.getClient(8010, '127.0.0.1');
      assert.equal(client1,client2);
      server_listened = true;
      s.close();
    });

    beforeExit(function() {
      assert.ok(server_listened);
    });
  },
  'closeClients() should close connections' : function(assert, beforeExit) {
    var sp = new rpc.SessionPool();

    var server_listened = false;
    var stream_ended = false;
    var s = rpc.createServer(function(rpc_stream) {
      rpc_stream.stream.on('close', function() {
        stream_ended = true;
        s.close();
      });
    });

    s.listen(9000, function() {
      server_listened = true;
      var client1 = sp.getClient(9000, '127.0.0.1');
      client1.on('ready', function() {
        sp.closeClients();
      });
    });

    beforeExit(function() {
      assert.ok(server_listened);
      assert.ok(stream_ended);
    });
  }
}
