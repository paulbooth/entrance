var https = require('https');


/*
 * Poll Facebook to find the favorite artists
 * of a user, then call a callback with the list of artists' names
 */
function getFavoriteArtists(facebookUser, callback) {

  if (!facebookUser || !facebookUser.tokens || !facebookUser.tokens.oauthAccessToken) {
    console.error("No available access token to retrieve artists from Facebook.");
    callback(null);
  }

  // Use the Facebook API to get all the music likes of a user
  var options = {
      host: 'graph.facebook.com',
      port: 443,
      path: '/me/music?access_token=' + facebookUser.tokens.oauthAccessToken
    };
  https.get(options, function(fbres) {
      var output = '';
      fbres.on('data', function (chunk) {
          //console.log("CHUNK:" + chunk);
          output += chunk;
      });

      fbres.on('end', function() {
        // console.log("favtracks output for %s:", facebookUser.name);
        // console.log(output);
        var data = JSON.parse(output).data;
        // console.log("favorite artists:");
        // console.log(data);
        callback(data.map(function (artist) { return artist.name;}));
      });
  });
}

module.exports.getFavoriteArtists = getFavoriteArtists;