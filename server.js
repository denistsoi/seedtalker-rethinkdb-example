var http      = require('http');
var express   = require('express');
var enchilada = require('enchilada');
var talk      = require('seed-talker')
var app       = express();
var shoe      = require('shoe');
var fs        = require('fs');

var r   = require('rethinkdb');

var conn;


app.use(enchilada(__dirname));
app.use(express.static(__dirname));

var server = http.createServer(app);

shoe(talk(function(t, client) {
  
  t.rpc('chat', {
    login: function(username, password, cb) {
      r.table('users')
        .filter({ username: username, password: password })
        .run(conn, function(err, cursor) {
          if (err) return cb(err);
          cursor.toArray(function(err, results) {
            if (err) return cb(err);
            if (!results.length) return cb('User not Found');
            client = results[0];
            return cb(null, results[0]);
          })
        });
    },
    createMessage: function(message, cb) {
      if (!client) return cb('Unauthorized');
      r.table('messages').insert({
        user: client.id,
        message: message,
        timestamp: (new Date()).toISOString()
      }).run(conn, cb);
    }
  })
  
  t.pubsub('chat').publish({
    messages: function(args, context, sub) {
      var cur;
      var closed = false;
      r.table('messages').changes({ includeInitial: true }).run(conn, function(err, cursor) {
        if (err) return console.log(err);
        cur = cursor;
        if (closed) {
          cursor.close();
        }
        cursor.each(function(err, op) {
          if (err) return console.log(err);
          var message = op.new_val;

          r.table('users').get(message.user).run(conn, function(err, result) {
            message.username = result.username;
            sub.update([message]);
          });

        });
      });

      sub.onClose(function() {
        if (cur) {
          cur.close();
        }
        closed = true;
      });
    }
  })
  
})).install(server, '/talk');


// r.use('test');

r.connect({ host: 'localhost', port: 28015 }, function(err, c) {
  conn = c;

  c.use('test');

  server.listen(5000, function() {
    console.log('Server is listening on port 5000');
  });
});
