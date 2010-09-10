node-msgpack-rpc
================

node-msgpack-rpc is an implementation of the [Msgpack-RPC](http://redmine.msgpack.org/projects/msgpack/wiki/RPCDesign) protocol specification for node.js.  Msgpack-RPC is built ontop of the very fast [MessagePack](http://msgpack.org) serialization format. This implementation supports tcp and unix socket transports (it may one day support UDP).

Simple Usage
------------

The easiest way to create a server is with a handler object.  All incoming calls will be invoked on the handler object:
    
    var handler = {
      'add' : function(a, b, response) {
         response.result( a + b );
       }
    }

    var rpc = require('msgpack-rpc');
    rpc.createServer();
    rpc.setHandler(handler);
    rpc.listen(8000);

a corresponding client might look like:

    var c = rpc.createClient(8000, '127.0.0.1', function() {
      c.invoke('add', 5, 4, function(err, response) {
        assert.equal(9, response);
        c.close();
      }
    });


Without a handler
-----------------

    rpc.createServer(function(rpc_stream) {
      rpc_stream.on('request', function(method, params, response) {
        if(method == 'add') {
          response.result( params[0] + params[1] );
        } else {
          response.error("unknown method!");
        }
      }

      rpc_stream.on('notify', function(method, params) {
        console.log("recieved notification: " + method);
      });
    });
    rpc.listen(8000);

Session Pool
------------

This module also provides a session pool which allows you to re-use client connections:

    var sp = new SesssionPool();
    sp.getClient(8000, '127.0.0.1').invoke('hello','world', function(err, response) { ... });;
    sp.getClient(8001, '127.0.0.1').invoke('hello','world', function(err, response) { ... });;
    
    // Uses same tcp connection as above
    sp.getClient(8000, '127.0.0.1').invoke('goodbye','world', function(err, response) { ... });;

    sp.closeClients();

Installation
------------

First you will need to install the [node-msgpack](http://github.com/pgriess/node-msgpack) add-on

To install node-msgpack-rpc with npm:

    git clone http://github.com/bpot/node-msgpack-rpc/
    cd node-msgpack-rpc
    npm link .


RPC Stream API
--------------

Clients and the streams passed to servers for incoming connections are both instances of MsgpackRPCStream.

Methods

    c.createClient(port, [hostname], [ready_cb]);
    c.invoke(method, [param1, param2, ...], cb);
    c.notify(method, [param1, param2, ...]);
    c.setTimeout(milliseconds);  // Setting this will cause requests to fail with err "timeout" if they don't recieve a response for the specified period
    c.close(); // Close the socket for this client
    c.stream // underlying net.Stream object

Events

    'ready' // emitted when we've connected to the server
    'request' // recieved request
    'notify' // recieved notification


TODO
----
* UDP Support?

