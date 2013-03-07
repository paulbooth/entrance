var http = require('http');
var spawn = require('child_process').spawn;

// var deviceId = '30f911883803c643';
var deviceId = 'test';

function listen() {
  try{
  var play = spawn('play', ['-r', 44100, '-b', 16, '-L', '-c', 2, '-e', 'signed-integer', '-t', 'raw', '-']);
  // var play =   spawn('sox', ['-r', 44100, '-b', 16, '-L', '-c', 2, '-e', 'signed-integer', '-t', 'raw', '-', '-t', 'wav', 'boo.wav']);
  console.log('listening.');
  http.get('http://entranceapp.herokuapp.com/' + deviceId + '/stream', function(res) {
    var output = "";
    res.on('data', function(chunk) {
      console.log(chunk);
      output += chunk
    });
    res.on('end', function() {
      play.kill();
      console.log("end.");
      // console.log(output);
      return listen();
    });
    res.on('error', function(err) {
      console.log("ERROR");
      console.log(err);
      play.kill();
      return listen();
    })
    res.pipe(play.stdin);
  });
  } catch (e) {
    console.log("serious error.");
    console.log(e);
    listen();
  }
}

listen();
// to put someone pid '1' in the server room 'test'
// http post entranceapp.herokuapp.com/eimp/tap target=test value=1