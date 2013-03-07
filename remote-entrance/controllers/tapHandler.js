var lifegraph = require('lifegraph')
	, databaseHandler = require('./databaseHandler')
	, streamHandler = require('./streamHandler')
	, facebookHelper = require('./facebookHelper');


// App key and secret (these are git ignored)
var _key = process.env.FBKEY || require('../config.json').fbapp_key;
var _secret = process.env.FBSECRET || require('../config.json').fbapp_secret;
var _namespace = 'entranceapp';

/**
 * Configure Lifegraph.
 */

lifegraph.configure(_namespace, _key, _secret);

eImpTap = function(req, res) {
	// Parse content.
  var deviceId = req.body.target;
  var pID = req.body.value; // assume whole body is the deviceId
  pID = pID.replace(/\u0010/g, ''); // don't know why this is here
  console.log("eimp with location: %s and device: %s", deviceId, pID);
  handleTap(deviceId, pID, function(json) {
    res.json(json);
  });
}

tap = function (req, res) {
  handleTap(req.params.deviceId, req.params.pId, function(json) {
    res.json(json);
  });
}

handleTap = function(deviceID, pID, hollaback) {

  lifegraph.connect(pID, function (error, user) {
    // If we have an error, then there was a problem with the HTTP call
    // or the user isn't in the db and they need to sync
    if (error) {
      console.log("We had an error with lifegraph:", error);

      if (error == 404) {

        return hollaback({'error': "Physical ID has not been bound to an account. Go to http://connect.lifegraphlabs.com/, Connect with Music Player App, and tap again."});

      } else if (error == 406) {

        return hollaback({'error': "No tokens found. User may have revoked access."});
      }
      else {
        return hollaback({'error': "Unspecified error from Lifegraph Connect."});
      }
      
    } 

    // Grab those who are already in the room 
    databaseHandler.getCurrentStreamingSession(deviceID, function (error, currentStreamingSession) {

    	// Find if they are streaming already (already tagged in)
      databaseHandler.indexOfStreamingUser(deviceID, user, function (err, index) {

        if (err) console.log("ERROR", err);

        // If the user is in the room, delete them
        if (index != -1) {
          console.log("User already in room... deleting user from room.");

          // Update the current streaming users
          databaseHandler.removeUserFromStreamingUsers(deviceID, user, function (err, newStreamingSession) {

            // If there are no more users 
            if (!newStreamingSession.streamingUsers.length) {

              console.log("No users remaining in room!");

              // Let the client know to stop playing
              databaseHandler.setTracksToStreamingSession(deviceID, [], function(err, streamingSession) {
                streamHandler.stopStream();
              });

              return hollaback({'action' : 'stop', 'message' : 'Empty session. Stopping Streaming.'});

            } 
            else {
              // User left room, but people are still in room
              return hollaback({'action' : 'continue', 'message' : 'User removed from session. Reforming track list on server.'});
            }
          });
        } 
        else {
          console.log("User NOT already in room! Adding user to array.");

          // If they're not streaming, make them start
          databaseHandler.addUserToStreamingUsers(deviceID, user, function(err, streamingSession) {

          	// Sanity check to make sure we added something
            if (streamingSession.streamingUsers.length > 0) {

            	// Grab the favorite artists of the new user
              facebookHelper.getFavoriteArtists(user, function (artists) {

              	// Grab some tracks from that artists 
                streamHandler.getTracksFromArtists(artists, function (tracks) {

                	// Assign the tracks to the streaming session
                  databaseHandler.setTracksToStreamingSession(deviceID, tracks, function (err, streamingSession) {

                    console.log("Added some tracks which are: " + streamingSession.tracks);

                    if (err) {

                      console.log(err.message);

                      return hollaback({'error': err.message});
                    }
                      return hollaback({'action': 'play', 'message': 'User added to session. Reforming track list on server.'});
                  });
                });
              });  
            }
          });
        }  
      });
    });
  });
}

module.exports.tap = tap;
module.exports.eImpTap = eImpTap;