
/**
 * Module dependencies
 */

var AudexBuffer = require('../src/buffer')
  , AudioContext = require('../src/context')
  , Batch = require('Batch')

window.lame = require('libmp3lame-js')

var TRACK1 = '/track-1.mp3';
var TRACK2 = '/track-2.mp3';

var audioContext = new AudioContext();
var audioBuffer = audioContext.createBuffer(2,
                                            audioContext.sampleRate * 2,
                                            audioContext.sampleRate);

function fails (fn) {
  try {
    fn();
  } catch (e) {
    assert(e instanceof Error);
    return;
  }

  throw new Error("Failed to throw execption");
}

describe("AudexBuffer(buffer, ctx, type)", function () {
  it("should be a function", function () {
    assert('function' == typeof AudexBuffer);
  });

  it("should fail on invalid arguments", function () {
    fails(function () {
      new AudexBuffer();
    });

    fails(function () {
      new AudexBuffer(null);
    });

    fails(function () {
      new AudioBuffer(null, audioContext);
    });
  });

  it("should set given  buffer and context", function () {
    var buf = new AudexBuffer(audioBuffer, audioContext);
    assert(buf);
    assert('object' == typeof buf.buffer);
    assert('object' == typeof buf.context);
    assert(buf.buffer instanceof AudioBuffer);
    assert(buf.context instanceof AudioContext);
    assert(audioBuffer == buf.buffer);
    assert(audioContext == buf.context);
  });

  describe("AudexBuffer.load(url, type, fn)", function () {
    it("should load a mp3 file and expose an `AudexBuffer'", function (done) {
      AudexBuffer.load(TRACK1, 'audio/mpeg', function (err, buf) {
        if (err) { return done(err); }
        assert(buf);
        assert('object' == typeof buf);
        assert(buf.type == 'audio/mpeg');
        assert(buf.buffer);
        assert(buf.context);
        assert(buf.length);
        assert(buf.length == buf.buffer.length);
        done();

        window.buf = buf;
        window.codec = 0;
        codec = lame.init();

        var setScale = lame.Module.cwrap('lame_set_scale', 'number', ['number', 'number']);

        var j = 0;
        var i = 0;
        var l = buf.buffer.getChannelData(0);
        var r = buf.buffer.getChannelData(1);
        var b64 = null;
        var len = 15000; // 15 seconds
        var enc = null;
        var now = Date.now();
        var data = null;
        var scale = 0.5;
        var chunks = [];
        var factor = 10;

        lame.set_mode(codec, lame.STEREO);
        lame.set_num_channels(codec, buf.buffer.numberOfChannels);
        lame.set_in_samplerate(codec, buf.buffer.sampleRate);
        lame.set_out_samplerate(codec, buf.buffer.sampleRate / buf.buffer.numberOfChannels);
        lame.set_bitrate(codec, 128);
        console.log("scale set", setScale(codec, scale));
        lame.init_params(codec);



        console.log("start encoding...");
        for (; i < len * factor; i += len) {
          console.log("encoding frame (offset=%d)\n", i);
          j = i + len < l.length - 1 ? i + len : r.length - 1;
          enc = lame.encode_buffer_ieee_float(codec,
                                              l.subarray(i, j),
                                              r.subarray(i, j));
          chunks.push(enc.data);
        }

        data = String.fromCharCode.apply(null, chunks);
        console.log("finished encoding in ", Date.now() - now);

        window.data = data
        window.enc = enc;
        window.blob = new Blob(chunks, {type: 'audio/mp3'});
        //console.log(data)
        console.log(enc)

      });
    });
  });

  describe("AudexBuffer.concat(buffers, opts)", function () {
    it("should concat `n' buffers into a single instance", function (done) {
      var batch = new Batch();
      var buffers = [];

      batch.push(function (next) {
        AudexBuffer.load(TRACK1, 'audio/mpeg', function (err, buf) {
          if (err) { return next(err); }
          buffers.push(buf);
          next();
        });
      });

      batch.push(function (next) {
        AudexBuffer.load(TRACK2, 'audio/mpeg', function (err, buf) {
          if (err) { return next(err); }
          buffers.push(buf);
          next();
        });
      });

      batch.end(function (err) {
        if (err) { return done(err); }
        var buf = null;
        var len = 0;
        assert(buffers.length);

        len = buffers.reduce(function (a, b) {
          return a + b.length;
        }, 0);


        buf = AudexBuffer.concat(buffers, {channels: 2});
        assert(len == buf.length);
        assert(buf);
        done();

      });
    });
  });

});
