var rpc = require('msgpack-rpc');

var handler = {
  'n' : 0,
  'echo' : function(data, response) {
    response.result(data);
  },
  'hello' : function(data) {
    this.n += 1;
    if(this.n % 100000 == 0) {
      console.log(this.n)
    }
  }
}

var server = rpc.createServer();
server.setHandler(handler);
server.listen(8000);
