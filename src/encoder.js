
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

var SAMPLES_PER_FRAME = 1152;
var DEFAULT_SAMPLE_RATE = 44100;
var DEFAULT_MIME_TYPE = 'audio/mp3';
var DEFAULT_BIT_RATE = 128;
var DEFAULT_DURATION = 30;

/**
 * `Encoder' constructor
 *
 * @api public
 * @param {Array} buffers
 * @param {Object} opts - optional
 */

module.exports = Encoder;
function Encoder (buffers, opts) {
  if (false == Array.isArray(buffers)) {
    throw new TypeError("Expecting an array of buffers");
  } else if (!(this instanceof Encoder)) {
    return new Encoder(buffers, opts);
  }

  opts = opts || {};

  this.buffers = buffers;
  this.codec = lame.init();
  this.opts = {
    mode: Encoder.MODE_JOINT_STEREO,
    time: {start: 0, end: 0},
    type: DEFAULT_MIME_TYPE,
    bitrate: opts.bitrate || DEFAULT_BIT_RATE,
    channels: buffers.length,
    samplerate: {
      in: opts.sampleRate || DEFAULT_SAMPLE_RATE,
      out: (opts.sampleRate || DEFAULT_SAMPLE_RATE) / buffers.length
    },
  };

  this.opts.time.end = opts.duration || DEFAULT_DURATION;
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
 * Sets or gets an encoder type count
 *
 * @api public
 * @param {String} type- optional
 */

Encoder.prototype.type = function (type) {
  if (null == type) {
    return this.opts.type;
  } else {
    this.opts.type = type;
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
 * @param {Function} fn
 */

Encoder.prototype.encode = function (fn) {
  fn = ('function' == typeof fn ? fn : function () {});

  // init
  var channels = this.channels();
  var spliced = [];
  var samples = 0;
  var buffers = this.buffers;
  var codec = this.codec;
  var start = this.opts.time.start;
  var type = this.opts.type;
  var rate = this.opts.samplerate.in * 1000; // in milliseconds
  var stop = this.opts.time.end * rate;
  var len = buffers[0].length;
  var end = this.opts.time.end;

  // samples to encode
  samples = rate * (end - start);

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
    var chunks = [];
    var chans = [];
    var parts = null;
    var right = null;
    var left = null;
    var blob = null;
    var size = 0;
    var buf = null;
    var max = 0;
    var i = start > 0 ? start * rate : 0;
    var j = 0;
    var k = 0;

    // splice for each chunk incrementing at
    // sample rate in milliseconds and stopping
    // at splice stop in milliseconds
    for (; i < stop; i += rate) {
      // for each sample in chunk within rate
      // and current offset range (j + i) so
      // sample index is less than buffer length
      for (j = 0; j < rate && j + i < len; ++j) {
        chans = [];
        // for each channel (k) read current
        // sample data from channel buffer (i +j)
        for (k = 0; k < channels; ++k) {
          chans.push(buffers[k][i + j]);
        }

        // store read channel data
        spliced.push(chans);
      }
    }

    // construct left/right channels
    size = spliced.length + 4 - (spliced.length % 4);
    left = new Float32Array(size);
    right = new Float32Array(size);

    left.set(spliced.map(function (a) { return a[0] }));
    right.set(spliced.map(function (a) { return a[1] || a[0]; }));

    len = SAMPLES_PER_FRAME * (channels * channels);
    max = len * (end / 100);

    // for each frame sample ram
    for (i = 0; i <= max; i += len) {
      j = i + len < left.length - 1 ? i + len : right.length - 1;
      chunks.push(
        lame.encode_buffer_ieee_float(
          codec,
          left.subarray(i, j),
          right.subarray(i, j)));
    }

    // flush
    chunks.push(lame.encode_flush(codec));

    // map and filter chunks
    chunks = (chunks
              .filter(function (c) { return c.size; })
              .map(function (c) { return c.data; }));

    // output blob
    blob = new Blob(chunks, {type: type});

    /// callback
    fn(null, blob);
  });

  return this;
};
