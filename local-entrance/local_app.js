var serialport = require("serialport");
var spawn = require('child_process').spawn;
var SerialPort = serialport.SerialPort;
var arduino_port = "/dev/cu.usbmodemfd121";
var serialPort = new SerialPort(arduino_port, { 
  // parser: serialport.parsers.readline("\n"),
  baudrate: 115200
});
var play;


serialPort.on("open", function (){
	console.log("Successfully opened arduino port.")
  play = spawn('play', ['-t', 'mp3', '-']);
  console.log('listening.');
  serialPort.pipe(play.stdin);
});

// After initialized, when we get a tag from the RF Reader

serialPort.on("data", function (data) {

  // Print out the tag data
  // console.log("ID Data received: : "+ data);

  // var buffer = new Buffer(data);

  // buffer.pipe( play.stdin);
});


