
/**
 * Module dependencies
 */

var Encoder = require('../src/encoder')
  , assert = require('assert')

describe("Encoder(buffer)", function () {
  var buffer = null;
  var channels = null;
  var req = new XMLHttpRequest();
  var res = null;

  function createEncoder () {
    return new Encoder(channels, {
      sampleRate: buffer.sampleRate,
      duration: buffer.duration
    });
  }

  before(function (done) {
    req.responseType = 'arraybuffer';
    req.open('GET', '/track-1.mp3', true);
    req.onload = function (e) {
      res = e.target.response;
      assert(res);
      GlobalAudioContext.decodeAudioData(res, function (buf) {
        assert(buf);
        assert(buf);
        buffer = buf;
        channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
        assert(channels[0].length);
        assert(channels[1].length);
        done();
      });
    };

    // request
    req.send();
  });

  it("should set buffers, codec, and opts", function () {

    var enc = createEncoder();

    assert(enc, 'encoder');
    assert(enc.buffers, 'encoder.buffers');
    assert(enc.buffers.length == 2, 'encoder.buffers.length');
    assert(enc.codec, 'encoder.codec');
    assert(enc.opts, 'encoder.opts');
    assert(enc.opts.mode == Encoder.MODE_JOINT_STEREO, 'encoder.opts.mode');
    assert(enc.opts.time.start == 0, 'encoder.opts.time.start');
    assert(enc.opts.time.end == buffer.duration, 'encoder.opts.time.end');
    assert(enc.opts.bitrate == 128, 'encoder.opts.bitrate');
    assert(enc.opts.channels == 2, 'encoder.opts.channels');
    assert(enc.opts.samplerate.in == buffer.sampleRate, 'encoder.opts.samplerate.in');
    assert(enc.opts.samplerate.out == (buffer.sampleRate / 2), 'encoder.opts.samplerate.out');
  });

  describe("#mode(mode)", function () {
    it("should set the encoder mode", function () {
      var enc = createEncoder();
      assert(enc, 'encoder');
      assert(enc.mode(Encoder.MODE_MONO), 'encoder.mode(mode)');
      assert(enc.opts.mode == Encoder.MODE_MONO, 'encoder.opts.mode');
      assert(enc.mode() == Encoder.MODE_MONO, 'encoder.mode()');
    });
  });

  describe("#channels(count)", function () {
    it("should set the encoder channel count", function () {
      var enc = createEncoder();
      assert(enc, 'encoder');
      assert(enc.channels(1), 'encoder.channels(1)');
      assert(1 == enc.opts.channels, 'encoder.opts.channels');
      assert(1 == enc.channels(), 'encoder.channels()');
    });
  });

  describe("#samplerate(type, rate)", function () {
    it("should set the encoder I/O sample rate", function () {
      var enc = createEncoder();
      assert(enc, 'encoder');

      assert(enc.samplerate('in', 44100), 'encoder.type("in", 44100)');
      assert(44100 == enc.opts.samplerate.in, 'encoder.opts.samplerate.in');
      assert(44100 == enc.samplerate('in'), 'encoder.samplerate("in")');

      assert(enc.samplerate('out', 22050), 'encoder.type("out", 22050)');
      assert(22050 == enc.opts.samplerate.out, 'encoder.opts.samplerate.out');
      assert(22050 == enc.samplerate('out'), 'encoder.samplerate("out")');

    });
  });

  describe("#bitrate(bitrate)", function () {
    it("should set the encoder outout bitrate", function () {
      var enc = createEncoder();
      assert(enc, 'encoder');
      assert(enc.bitrate(64), 'encoder.bitrate(64)');
      assert(64 == enc.opts.bitrate, 'encoder.opts.bitrate');
      assert(64 == enc.bitrate(), 'encoder.bitrate()');
    });
  });

  describe("#splice(start, end)", function () {
    it("should set the encoder outout splicing", function () {
      var enc = createEncoder();
      assert(enc, 'encoder');
      assert(enc.splice(0, 3000), 'encoder.splice(0, 3000)');
      assert(0 == enc.opts.time.start, 'encoder.opts.time.start');
      assert(3000 == enc.opts.time.end, 'encoder.opts.time.end');
    });
  });

  describe("#scale(scale)", function () {
    it("should set the encoder outout gain scale", function () {
      var enc = createEncoder();
      assert(enc, 'encoder');
      assert('undefined' == typeof enc.opts.scale,
             'undefined == encoder.opts.scale');
      assert(enc.scale(0.5), 'encoder.scale(0.5)');
      assert(0.5 == enc.opts.scale, 'encoder.opts.scale');
      assert(enc.scale(null), 'encoder.scale(null)');
      assert('undefined' == typeof enc.opts.scale,
             'undefined == encoder.opts.scale');
    });
  });


  describe("#encode(fn)", function () {
    var enc = null;

    this.timeout(Infinity);

    before(function () {
      enc = createEncoder();
      assert(enc.mode(Encoder.MODE_JOINT_STEREO));
      assert(enc.splice(0, 1000));
    });

    it("should emit a 'chunk' event", function () {
      enc.once('chunk', function (chunk) {
        assert(chunk, 'chunk');
        assert(chunk.length, 'chunk.length');
      });
    });

    it("should emit a 'progress' event", function () {
      enc.once('progress', function (e) {
        assert(e, 'e');
        assert('number' == typeof e.size, 'e.size');
        assert('object' == typeof e.chunks, 'e.chunks');
        assert('number' == typeof e.offset, 'e.offset');
        assert('number' == typeof e.percent, 'e.percent');
      });
    });

    it("should encode and emit a `Float32Array'", function (done) {
      enc.encode(function (err, output) {
        assert(null == err, 'null == err');
        if (err) { console.error(err); }
        assert(output instanceof Float32Array);
        done();
      });
    });
  });

});
