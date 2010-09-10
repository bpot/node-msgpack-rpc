var msgpack_rpc = require('msgpack-rpc');
module.exports = {
  'simple server handler' : function(assert, beforeExit) {
    var addition_called = false;
    var response_received = false;
    var notification_recieved = false;
    var handler = {
      'add' : function(a, b, response) { 
        addition_called = true;
        response.result(a + b);
      },
      'temperature' : function(temp, response) {
        assert.equal(102.1, temp);
        assert.equal(undefined, response);
        notification_received = true;
      }
    };

    var server = msgpack_rpc.createServer();
    server.setHandler(handler);

    server.listen(8030, function() {
      var client = msgpack_rpc.createClient(8030,function() {
        client.invoke('add', 5, 7, function(err, response) {
          response_received = true;
          assert.equal(5 + 7, response);
          server.close();
          client.stream.end();
        });

        client.notify('temperature', 102.1);
      });

    });

    beforeExit(function() {
      assert.ok(addition_called);
      assert.ok(response_received);
      assert.ok(notification_received);
    });
  },
}
