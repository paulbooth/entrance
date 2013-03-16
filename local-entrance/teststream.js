var http = require('http');
var spawn = require('child_process').spawn;

// var deviceId = '30f911883803c643';
var deviceId = 'test';

function listen() {
  try{
   var play1 = spawn('play', ['-t', 'mp3', '-']);
  console.log('listening.');
  http.get('http://entranceapp.herokuapp.com/' + deviceId + '/stream', function(res) {
    var output = "";
    res.on('data', function(chunk) {
      console.log(chunk);
      output += chunk
    });
    res.on('end', function() {
      play1.kill();
      console.log("end.");
       console.log(output);
      return listen();
    });
    res.on('error', function(err) {
      console.log("ERROR");
      console.log(err);
      play1.kill();
      return listen();
    })
    res.pipe(play1.stdin);

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