var net = require('net'),
    msgpack = require('msgpack'),
    events = require('events'),
    sys = require('sys');

var REQUEST  = 0;
var RESPONSE = 1;
var NOTIFY   = 2;
var MAX_SEQID = Math.pow(2,32)-1;

function RPCResponse (stream, seqid) {
  this.stream = stream;
  this.seqid  = seqid;
}

RPCResponse.prototype.result = function(args) {
  this.stream.respond(this.seqid, null, args);
}

RPCResponse.prototype.error = function(error) {
  this.stream.respond(this.seqid, error, null);
}

// The heart of the beast, used for both server and client
var MsgpackRPCStream = function(stream, handler) {
  events.EventEmitter.call(this);
  var self              = this;
  this.last_seqid       = undefined;
  this.stream           = stream;
  this.handler          = handler;
  this.cbs              = [];
  this.timeout          = undefined;

  this.msgpack_stream = new msgpack.Stream(this.stream);
  this.msgpack_stream.on('msg', function(msg) {
    var type = msg.shift();
    switch(type) { 
      case REQUEST:
        var seqid  = msg[0];
        var method = msg[1];
        var params = msg[2];
        var response = new RPCResponse(self, seqid); 

        self.invokeHandler(method, params.concat(response));
        self.emit('request', method, params, response);
        break;
      case RESPONSE:
        var seqid  = msg[0];
        var error  = msg[1];
        var result = msg[2];

        if(self.cbs[seqid]) {
          self.triggerCb(seqid, [error, result]);
        } else {
          self.emit('error', new Error("unexpected response with unrecognized seqid (" + seqid + ")")) 
        }
        break;
      case NOTIFY:
        var method = msg[0];
        var params = msg[1];

        self.invokeHandler(method, params);
        self.emit('notify', method, params);
        break;
    }
  });
  this.stream.on('connect', function() { self.emit('ready'); });

  // Failures
  this.stream.on('end',     function() { self.stream.end(); self.failCbs(new Error("connection closed by peer")); });
  this.stream.on('timeout', function() { self.failCbs(new Error("connection timeout")); });
  this.stream.on('error',   function(error) { self.failCbs(error); });
  this.stream.on('close',   function(had_error) {
    if(had_error) return; 
    self.failCbs(new Error("connection closed locally"));
  });
}

sys.inherits(MsgpackRPCStream, events.EventEmitter);

MsgpackRPCStream.prototype.triggerCb = function(seqid, args) {
  this.cbs[seqid].apply(this, args);
  delete this.cbs[seqid];
}

MsgpackRPCStream.prototype.failCbs = function(error) {
  for(var seqid in this.cbs) { 
    this.triggerCb(seqid, [error]) 
  }
}

MsgpackRPCStream.prototype.invokeHandler = function(method, params) {
  if(this.handler) {
    if(this.handler[method]) {
      this.handler[method].apply(this.handler, params);
    } else {
      response.error(new Error("unknown method")); 
    }
  }
}

MsgpackRPCStream.prototype.nextSeqId = function() {
  if(this.last_seqid == undefined) {
    return this.last_seqid = 0;
  } else if(this.last_seqid > MAX_SEQID ) {
    return this.last_seqid = 0;
  } else {
    return this.last_seqid += 1;
  }
}

MsgpackRPCStream.prototype.invoke = function() {
  var self   = this;
  var seqid  = this.nextSeqId();
  var method = arguments[0];
  var cb     = arguments[arguments.length - 1];
  var args = [];
  for(var i = 1;i < arguments.length - 1;i++) {
    args.push(arguments[i]);
  }

  this.cbs[seqid] = cb;
  if(this.timeout) {
    setTimeout(function() { if(self.cbs[seqid]) self.triggerCb(seqid, ["timeout"]); }, this.timeout);
  }
  if(this.stream.writable) { return this.msgpack_stream.send([REQUEST, seqid, method, args]) };
}

MsgpackRPCStream.prototype.respond = function(seqid, error, result) {
  if(this.stream.writable) { return this.msgpack_stream.send([RESPONSE, seqid, error, result]) };
}

MsgpackRPCStream.prototype.notify = function(method, params) {
  var method = arguments[0];
  var args   = [];
  for(var i = 1;i < arguments.length;i++) {
    args.push(arguments[i]);
  }

  if(this.stream.writable) { return this.msgpack_stream.send([NOTIFY, method, args]) };
}

MsgpackRPCStream.prototype.setTimeout = function(timeout) {
  this.timeout = timeout;
}

MsgpackRPCStream.prototype.close = function() {
  this.stream.end();
}

exports.createClient = function(port, hostname,cb) {
  var s = new MsgpackRPCStream(new net.createConnection(port, hostname));
  if(typeof hostname == 'function') s.on('ready', hostname);
  if(cb) s.on('ready', cb);

  return s;
}

var Server = function(listener) {
  net.Server.call(this);
  var self = this;
  this.handler = undefined;

  this.on('connection', function(stream) {
    stream.on('end', function() { stream.end(); });
    var rpc_stream = new MsgpackRPCStream(stream, self.handler);
    if(listener) listener(rpc_stream);
  });
}
sys.inherits(Server, net.Server);

Server.prototype.setHandler = function(handler) {
  this.handler = handler;
}

exports.createServer = function(handler) {
  return new Server(handler);
}

var SessionPool = exports.SessionPool = function() {
  this.clients = {};
};

SessionPool.prototype.getClient = function(port, hostname) {
  var address = hostname + ":" + port;
  if(this.clients[address]) {
    return this.clients[address];
  } else {
    return this.clients[address] = exports.createClient(port, hostname);
  }
};

SessionPool.prototype.closeClients = function() {
  for(var i in this.clients) this.clients[i].stream.end();
};
