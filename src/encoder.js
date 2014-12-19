
'use strict';

/**
 * Module dependencies
 */

var lame = require('libmp3lame-js')

// see: http://stackoverflow.com/a/22677317 (thank you)
function decibels (buffer) {
  var len = buffer.length;
  var total = 0;
  var i = 0;
  var rms;
  var db;

  while (i < len) {
    total += (buffer[i] * buffer[i++]);
  }

  rms = Math.sqrt(total / len);
  db = 20 * (Math.log(rms) / Math.LN10);
  return db;
}

/**
 * `Encoder' constructor
 *
 * @api public
 * @param {AudioBuffer} buffer
 */

module.exports = Encoder;
function Encoder (buffer) {
  if (!(this instanceof Encoder)) {
    return new Encoder(buffer);
  }

  if (!(buffer instanceof AudioBuffer)) {
    throw new TypeError("Expecting an instance of `AudioBuffer'");
  }

  this.buffer = buffer;
  this.codec = lame.init();
  this.opts = {
    mode: Encoder.MODE_JOINT_STEREO,
    time: {start: 0, end: 0},
    bitrate: 128,
    channels: 1,
    samplerate: {in: 0, out: 0},
  };

  this.opts.time.end = buffer.duration;
}

/**
 * Encoder modes
 *
 * @api public
 */

Encoder.MODE_MONO = lame.MONO;
Encoder.MODE_STEREO = lame.STEREO;
Encoder.MODE_JOINT_STEREO = lame.JOINT_STEREO;

/**
 * Sets or gets an encoder mode
 *
 * @api public
 * @param {Number} mode - optional
 */

Encoder.prototype.mode = function (mode) {
  if (null == mode) {
    return this.opts.mode;
  } else switch (mode) {
    case Encoder.MODE_MONO:
    case Encoder.MODE_STEREO:
    case Encoder.MODE_JOINT_STEREO:
      this.opts.mode = mode;
      break;

    default:
      throw new TypeError("Unknown encoder mode");
  }

  return this;
};

/**
 * Sets or gets an encoder channel count
 *
 * @api public
 * @param {Number} count - optional
 */

Encoder.prototype.channels = function (count) {
  if (null == count) {
    return this.opts.channels;
  } else {
    this.opts.channels = count;
  }

  return this;
};

/**
 * Sets or gets encoder in/out sample rate
 *
 * @api public
 * @param {String} type
 * @param {Number} rate
 */

Encoder.prototype.samplerate = function (type, rate) {
  if (0 == arguments.length) {
    throw new TypeError("Invalid arguments. Expecting at least 1 argument.");
  } else if (1 == arguments.length) {
    if ('string' != typeof type) {
      throw new TypeError("Expecting `type' to be a string.");
    } else {
      return this.opts.samplerate[type];
    }
  } else switch (type) {
    case 'in':
    case 'out':
      this.opts.samplerate[type] = rate;
      break;

    default:
      throw new TypeError("Unknown sample rate type `"+ type +"'");
  }

  return this;
};

/**
 * Sets or gets encoder bit rate
 *
 * @api public
 * @param {String} type
 * @param {Number} rate
 */

Encoder.prototype.bitrate = function (rate) {
  if (null == rate) {
    return this.opts.bitrate;
  } else {
    this.opts.bitrate = rate;
  }

  return this;
};

/**
 * Sets start and end time for
 * encoding splicing
 *
 * @api public
 * @param {Number} start
 * @param {Number} end - optional
 */

Encoder.prototype.splice = function (start, end) {
  if (1 == arguments.lenght) {
    this.opts.time.start = start;
  } else if (2 == arguments.length) {
    this.opts.time.start = start;
    this.opts.time.end = end;
  }
  return this;
};

/**
 * Encodes buffer and returns `Blob'
 * with a provided mime type
 *
 * @api public
 * @param {String} type
 */

Encoder.prototype.encode = function (type, fn) {
  fn = ('function' == typeof fn ? fn : function () {});

  if ('string' != typeof type) {
    fn(new TypeError("Expecting a mime type"));
    return this;
  }

  // init
  var channels = this.channels();
  var spliced = [];
  var samples = 0;
  var factor = this.buffer.duration * 0.01;
  var chunks = [];
  var buffer = this.buffer;
  var codec = this.codec;
  var start = this.opts.time.start;
  var left = buffer.getChannelData(0);
  var right = this.opts.channels > 1 ? buffer.getChannelData(1) : left;
  var rate = buffer.sampleRate;
  var len = buffer.length;
  var end = this.opts.time.end;

  samples = buffer.sampleRate * (end - start);

  console.log(
    "samples=(%d) mode=%d, bitrate=%d, channels=%d, samplerate(in)=%d, samplerate(out)=%d",
    samples,
    this.mode(),
    this.bitrate(),
    this.channels(),
    this.samplerate('in'),
    this.samplerate('out'),
    buffer);

  // init lame options
  lame.set_mode(codec, this.mode());
  lame.set_bitrate(codec, this.bitrate());
  lame.set_num_channels(codec, this.channels());
  lame.set_in_samplerate(codec, this.samplerate('in'));
  lame.set_out_samplerate(codec, this.samplerate('out'));

  // init lame encoder for codec
  lame.init_params(codec);

  // defer
  setTimeout(function () {
    var data = null;
    var parts = null;
    var mat = null;
    var buf = null;
    var i = start > 0 ? start * rate : 0;
    var stop = end * rate;
    var j = 0;
    var k = 0;

    console.log("start=(%d) end=(%d) stop=(%d) length=(%d)", start, end, stop, left.length);

    // for each chunk at rate
    for (; i < stop; i += rate) {
      // for each sample in chunk
      for (j = 0; j < rate && j + i < len; ++j) {
        mat = [];
        // for each channel
        for (k = 0; k < channels; ++k) {
          // current chunk plus offset of j
          mat.push(buffer.getChannelData(k)[i + j]);
        }

        spliced.push(mat);
      }
    }

    var size = spliced.length;
    var nsize = size + 4 - (size % 4);
    var lbuf = new ArrayBuffer(nsize * 4);
    var rbuf = new ArrayBuffer(nsize * 4);
    var l = new Float32Array(lbuf);
    var r = new Float32Array(rbuf);

    l.set(spliced.map(function (a) { return a[0] }))
    r.set(spliced.map(function (a) { return a[1] }))

    // for each frame
    len = 1152 * 2 * 2
    for (i = 0; i <= len * end * 1000; i+=len) {
      console.log("encoding frame=(%d)", i);
      j = i + len < l.length - 1 ? i + len : r.length - 1;
      console.log(i, j)
      chunks.push(lame.encode_buffer_ieee_float(codec,
                                                l.subarray(i, j),
                                                r.subarray(i, j)));
    }

    // output
    fn(null,
       new Blob(chunks.map(function (c) { return c.data }),
                {type: type}));
  });


  return this;
};
