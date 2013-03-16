
/*
 * Module dependencies.
 */
var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , path = require('path')
  , index = require('./routes/index')
  , databaseHandler= require('./controllers/databaseHandler')
  , tapHandler = require('./controllers/tapHandler')
  , streamHandler = require('./controllers/streamHandler');

/*
 * Configure application
 */
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('dburl', process.env.MONGOLAB_URI || 'mongodb://localhost:27017/entrance');
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', index.index);

// Electric imp endpoint for Entrance taps.
app.post('/eimp/tap', tapHandler.eImpTap);

app.post('/tap', tapHandler.postTap);

// Non-Electric Imp endpoint
app.get('/:deviceId/:pId/tap', tapHandler.getTap);

// Endpoint for receiving mp3 streams
app.get('/:deviceID/stream', streamHandler.stream);

app.get('/:deviceID/waitstream', streamHandler.waitStream);

// Start database and get things running
console.log("connecting to Mongo...");

databaseHandler.connectToDatabase(app.get('dburl'), function(db) {
  if (db) {

    console.log("Successfully connected to Mongo.");

    streamHandler.configure(function(err) {
      // Start server.
      if (!err) {
        server.listen(app.get('port'), function(){
          console.log("Express server listening on port", app.get('port'), "...");
        });
      } else {
        console.error("Serious Error: Could not configure Streamer. Something may be wrong with Spotify")
      }
    });
  }
  else {
    console.log("We couldn't connect to the database");
  }
});


