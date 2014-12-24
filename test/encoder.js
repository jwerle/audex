
/**
 * Module dependencies
 */

var Encoder = require('../src/encoder')
  , AudioContext = require('../src/context')

var ctx = window.ctx = new AudioContext();

describe("Encoder(buffer)", function () {
  var req = new XMLHttpRequest();
  var encoder = null;

  // init
  req.responseType = 'arraybuffer';
  req.open('GET', '/track-1.mp3', true);
  req.onload = function (e) {
    var res = e.target.response;
    ctx.decodeAudioData(res, function (buffer) {
      // left and right channels
      var channels = [buffer.getChannelData(0), buffer.getChannelData(1)];

      encoder = new Encoder(channels, {
        sampleRate: buffer.sampleRate,
        duration: buffer.duration
      });

      (window.enc = encoder)
      .type('audio/mp3')
      .mode(Encoder.MODE_JOINT_STEREO)
      .splice(0, 5000)
      .encode(function (err, blob) {
        if (err) { console.error(err); }
        console.log(blob)
        window.open(URL.createObjectURL(blob));
      });
    });
  };

  // request
  req.send();
});
