var http = require('http');
var spawn = require('child_process').spawn;

var play = spawn('play', ['-r', 44100, '-b', 16, '-L', '-c', 2, '-e', 'signed-integer', '-t', 'raw', '-']);
http.get('http://localhost:3000/testtrackstream', function(res) {
  res.on('data', function(chunk) {
    console.log(chunk);
  });
  res.pipe(play.stdin);
});