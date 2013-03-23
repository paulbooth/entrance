var databaseHandler = require('./databaseHandler')
	, sp = require('libspotify')
	, arrayExtender = require('../utilities/arrayExtender')
	, spawn = require('child_process').spawn
	, knox = require('knox')
  , lame = require('lame');

var _spotifySession;
var _streamingResponses = [];
var _waitListener;

configure = function(callback) {
	var s3Client = knox.createClient({
      key: process.env.S3_KEY
    , secret: process.env.S3_SECRET
    , bucket: process.env.S3_BUCKET
  });

  console.log('configure')
  // Make the call to grab out key
  s3Client.get('spotify_appkey.key').on('response', function(res){
    // Create the buffer to store bits
    var appKey = [];
    
    // Build the app key buffer
    res.on('data', function (chunk){
      appKey.push(chunk);
    });

    res.on('error', function(err) {
    	callback(err);
    })

    // When we're done collecting the key, connect to spotify
    res.on("end", function() {
			connectSpotify(Buffer.concat(appKey), callback);
		});
	}).end();
}


/*
 * Beings a spotify session
 */
connectSpotify = function (appKey, callback) {
  // Create a spotify session wth our api key
  // appKey = "/Users/paul/Dev/entrance/remote-entrance/spotify_appkey.key"
  _spotifySession = new sp.Session({
    applicationKey:  appKey 
  });

  console.log("Connecting to Spotify...")
  // Log in with our credentials
  _spotifySession.login(process.env.SPOTIFY_USERNAME, process.env.SPOTIFY_PASSWORD); 

  // Once we're logged in, continue with the callback
  _spotifySession.once('login', function (err) {
    if (err) return console.error('Error:', err);

    console.log("Successfully logged in to spotify.")

    callback(err);
  });
}

stream = function (req, res) {
  databaseHandler.getCurrentStreamingSession(req.params.deviceId, function (error, currentStreamingSession) {
    // (Hopefully this session has tracks)
    // console.log("found streaming session:" + currentStreamingSession);
    if (currentStreamingSession && currentStreamingSession.tracks && currentStreamingSession.tracks.length) {

      // Grab a random track URL
     return streamTracks(req, res, currentStreamingSession);
      
    } else {

      // Something weird happened if there aren't any tracks
      res.send("{'error' : 'There are no tracks to stream.'}");
    }
  });
}

// stops the player and ends all responses.
stopStream = function() {
  console.log("Stop streaming for the "  + _streamingResponses.length + " streams.");
  var player = _spotifySession.getPlayer();
  player.stop();
  _streamingResponses.forEach(function(res) {
    res.end();
  });
  _streamingResponses = [];
}

waitStream = function (req, res) {

  databaseHandler.setTracksToStreamingSession(req.params.deviceId, [], function (err, newStreamingSession) {
    return waitStreamTracks(req, res, newStreamingSession);
    
  });
}

waitStreamTracks = function (req, res, streamingSession) {

	if (_waitListener) clearTimeout(_waitListener);

  if (streamingSession.tracks.length == 0) {
      var player = _spotifySession.getPlayer();

      player.pipe(res);

      _waitListener = setTimeout(function() { 
        return databaseHandler.getCurrentStreamingSession(req.params.deviceId, function (error, newCurrentStreamingSession) {
          waitStreamTracks(req, res, newCurrentStreamingSession); }) }, 2000);

      return;
  } else {
    return streamTracks(req, res, streamingSession);
  }
}

streamTracks = function (req, res, streamingSession) {
  console.log("stream tracks");

  if (streamingSession.tracks.length != 0) {

    // Grab a random URL
    var url = streamingSession.tracks[Math.floor(Math.random() * streamingSession.tracks.length)];

    console.log("Song starting : " + streamingSession.tracks.length + " songs left to play.");

    databaseHandler.removeTrackFromStreamingSession(req.params.deviceId, url, function (err, revisedStreamingSession) {
      // console.log("removed url, now revisedStreamingSession:" + revisedStreamingSession);
      // Fetch a track from the URL
      console.log("new url:" + url);
      var track = sp.Track.getFromUrl(url);

      // When the track is ready
      track.on('ready', function() {
        console.log('track ready.');
        res.header("Content-Type", "audio/mpeg");
        // Grab the player
        var player = _spotifySession.getPlayer();

        // Stop the player so we can load next track
        player.stop();

        // Load the given track
        player.load(track);

        // Start playing it
        player.play();

        // Create an mp3 encoder 
        var encoder = new lame.Encoder({
          channels: 2,
          bitDepth: 16,
          sampleRate: 44100
        });

        // Pipe the PCM into the encoder
        player.pipe(encoder);

        // Pipe the MP3 into the response
        encoder.pipe(res);
        
        _streamingResponses.push(res);
        // }

        // When the player finishes
        player.once('track-end', function() {

          // player.stop();

          // Log that it's over
          console.log("Song ended. " + revisedStreamingSession.tracks.length + "songs left to play.");
          res.end();

          // streamTracks(req, res, revisedStreamingSession);
        });
      });
    });
  }  

  else {

    console.log("There are no more tracks");

    var player = _spotifySession.getPlayer();

    // Stop the player
    player.stop();

        // End the response
    res.end();
  }
} 

arduino = function(req, res) {

  var url = "spotify:track:4W3Bkljqflf1SD5l2VEtfl";

  var track = sp.Track.getFromUrl(url);

  // When the track is ready
  track.on('ready', function() {
    res.header("Content-Type", "audio/mpeg");
    // Grab the player
    var player = _spotifySession.getPlayer();

    // Stop the player so we can load next track
    player.stop();

    // Load the given track
    player.load(track);

    // Start playing it
    player.play();

    // Create an mp3 encoder 
    var encoder = new lame.Encoder({
      channels: 2,
      bitDepth: 16,
      sampleRate: 44100
    });

    // Pipe the PCM into the encoder
    player.pipe(encoder);

    // Pipe the MP3 into the response
    encoder.pipe(res);

    // When the player finishes
    player.once('track-end', function() {

      res.end();
    });
  });
}
getTracksFromArtists = function(artists, callback) {
  var loadedTracks = 0;
  var tracks = [];
  if (!artists.length) {
    console.log("There are no artists.");
    return callback([]);
  }

  // For each artist
  artists.forEach(function(artist) {
    // console.log("searching for artist: " + artist)
    // Create a spotify search
    var search = new sp.Search("artist:" + artist);
    search.trackCount = 1; // we're only interested in the first result for now;

    // Execute the search
    search.execute();

    // When the search has been completed
    search.once('ready', function() {
      // If there aren't any searches
      if(!search.tracks.length) {
          // console.error('there is no track to play :[ for artist ' + artist);
      } else {
        // Add the track to the rest of the tracks
        for (var i = 0; i < search.tracks.length; i++) {
          if (search.tracks[i].availability == "AVAILABLE") {
            tracks.push(search.tracks[i]);
          }
        }
        // tracks = tracks.concat(search.tracks);
      }

      // Keep track of how far we've come
      loadedTracks++;
      // console.log("loaded: " + loadedTracks + "/" + artists.length + " : " + tracks.length);

      // If we've checked all the artists
      if (loadedTracks == artists.length) {
        // Shuffle up the tracks
        // tracks.shuffle();

        // sort in decreasing popularity so most popular is first
        tracks.sort(function(a, b) {return b.popularity - a.popularity});
        // Call our callback
        callback(tracks.map(function(track) { return track.getUrl();}));
      }
    });
  });
}
module.exports.arduino = arduino;
module.exports.getTracksFromArtists = getTracksFromArtists;
module.exports.configure = configure; 
module.exports.stopStream = stopStream;
module.exports.waitStream = waitStream;
module.exports.stream = stream;