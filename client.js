var talk      = require('seed-talker');
var shoe      = require('shoe');

var Vue       = require('vue');
var remote    = talk(function() {
  return shoe('/talk');
});

var rpc     = remote.rpc('chat');
var ps = remote.pubsub('chat');

var app = new Vue({
  el: '#app',
  data: {
    state: 'login',
    username: '',
    password: '',
    user: null,
    error: null,
    message: '',
    messages: []
  },
  methods: {
    login: function() {
      rpc.call('login', this.username, this.password, function(err, result) {
        if (err) { this.error = err };
        this.user = result;
        this.state = 'chat';
      }.bind(this));
    },
    createMessage: function() {
      if (!this.message.trim().length) return;
      rpc.call('createMessage', this.message, function(err, result) {
        if (err) console.log(err);
      });
      this.message = '';
    }
  },
  ready: function() {
    var sub = ps.subscribe('messages');
    var messages = this.messages;

    sub.onUpdate(function(arr) {
      arr.forEach(function(message) {
        messages.push(message);
      });
    });
  }
});


// create namespaced pubsub
var sync = remote.pubsub('sync');