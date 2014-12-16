
/**
 * Module dependencies
 */

var AudexBuffer = require('../src/buffer')
  , AudioContext = require('../src/context')
  , Batch = require('Batch')

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

  it("should create a buffer source from a given context", function () {
    var buf = new AudexBuffer(audioBuffer, audioContext);
    assert(buf);
    assert('object' == typeof buf.source);
    assert(buf.source instanceof AudioBufferSourceNode);
  });

  describe("AudexBuffer.load(url, type, fn)", function () {
    it("should load a mp3 file and expose an `AudexBuffer'", function (done) {
      AudexBuffer.load(TRACK1, 'audio/mpeg', function (err, buf) {
        if (err) { return done(err); }
        assert(buf);
        assert('object' == typeof buf);
        assert(buf.type == 'audio/mpeg');
        assert(buf.buffer);
        assert(buf.source);
        assert(buf.context);
        assert(buf.length);
        assert(buf.length == buf.buffer.length);
        done();
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
