
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
      encoder = new Encoder(buffer);

      (window.enc = encoder)
      .mode(Encoder.MODE_JOINT_STEREO)
      .channels(buffer.numberOfChannels)
      .samplerate('in', buffer.sampleRate)
      .samplerate('out', buffer.sampleRate / buffer.numberOfChannels)
      .bitrate(128)
      .splice(0, 10)
      .encode('audio/mp3', function (err, blob) {
        if (err) { console.error(err); }
        console.log(blob)
        //window.open(URL.createObjectURL(blob));
      });
    });
  };

  // request
  req.send();
});
