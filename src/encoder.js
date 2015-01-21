
'use strict';

/**
 * Module dependencies
 */

var lame = require('libmp3lame-js')
  , Emitter = require('emitter')

/**
 * `lame' api
 */

lame.set_scale = lame.Module.cwrap('lame_set_scale', 'number', ['number', 'number']);

var SAMPLES_PER_FRAME = 1152;
var DEFAULT_SAMPLE_RATE = 44100;
var DEFAULT_BIT_RATE = 128;
var DEFAULT_DURATION = 30;

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
    bitrate: opts.bitrate || DEFAULT_BIT_RATE,
    channels: buffers.length,
    samplerate: {
      in: opts.sampleRate || DEFAULT_SAMPLE_RATE,
      out: (opts.sampleRate || DEFAULT_SAMPLE_RATE) / buffers.length
    },
  };

  this.opts.time.end = opts.duration || DEFAULT_DURATION;
}

// inherit from `Emitter'
Emitter(Encoder.prototype);

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
 * @param {Number} rate - optional
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
 * @param {Number} rate - optional
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
 * Sets or gets codec scale
 *
 * @api public
 * @param {Number} scale - optional
 */

Encoder.prototype.scale = function (scale) {
  if (null === scale) {
    delete this.opts.scale;
  } else if ('number' == typeof scale) {
    this.opts.scale = scale;
  } else if ('undefined' == typeof scale) {
    return this.opts.scale;
  }

  return this;
};

/**
 * Encodes audio and provides a `Float32Array'
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
  var self = this;
  var rate = this.opts.samplerate.in;
  var stop = this.opts.time.end * rate;
  var end = this.opts.time.end;

  // init lame options
  lame.set_mode(codec, this.mode());
  lame.set_bitrate(codec, this.bitrate());
  lame.set_num_channels(codec, this.channels());
  lame.set_in_samplerate(codec, this.samplerate('in'));
  lame.set_out_samplerate(codec, this.samplerate('out'));

  if ('number' == typeof this.opts.scale) {
    lame.set_scale(codec, this.opts.scale);
  }

  // init lame encoder for codec
  lame.init_params(codec);

  // defer
    var chunks = [];
    var chans = [];
    var parts = null;
    var right = null;
    var left = null;
    var blob = null;
    var size = 0;
    var buf = null;
    var max = 0;
    var err = null;
    var len = buffers[0].length;
    var i = start > 0 ? (start * rate) / 1000 : 0;
    var j = 0;
    var k = 0;

    for (; i < stop; i += rate) {
      for (j = 0; j < rate && j + i < len; ++j) {
        chans = [];
        for (k = 0; k < channels; ++k) {
          chans.push(buffers[k][i + j]);
        }
        spliced.push(chans);
      }
    }

    console.log('')
    console.log('')
    console.log('')
    console.log('')

    self.emit('spliced', spliced);

    // calculate channel size from spliced length
    // rounding to the nearest multiple of `4' to
    // ensure the proper size when creating left and
    // right 32 bit signed float buffers which is
    // achieved with `n + m - (n % m)' where `n'
    // is the number to round and `m' is the
    // multiple to round to.
    //  here we assign: `n = size' and `m = 4'
    size = spliced.length + 4 - (spliced.length % 4);

    // construct left/right channels from
    // calculated size
    left = new Float32Array(size);
    right = new Float32Array(size);

    // copy buffer data
    left.set(spliced.map(function (a) { return a[0] }));
    right.set(spliced.map(function (a) { return a[1] || a[0]; }));

    // empty spliced data. this may or may not have
    // a positive affect on performance
    spliced.splice(1, spliced.length);

    // calculate offset length from
    len = SAMPLES_PER_FRAME * (channels * channels);
    max = len * rate;

    var enc = null;

    // for each frame sample ram
    for (i = 0; i < max; i += len) {
      j = i + len < left.length - 1 ? i + len : left.length - 1;
      enc = lame.encode_buffer_ieee_float(
        codec,
        left.subarray(i, j),
        right.subarray(i, j));

      if (null == enc) {
        lame.encode_flush_nogap(codec);
        err = new Error("Failed to encode chunk");
        fn(err);
        self.emit('error', err);
        return this;
      }

      chunks.push(enc);

      if (0 == enc.size) {
        break;
      }

      // inform consumer of chunks and encode progress
      self.emit('chunk', chunks[chunks.length -1].data);
      self.emit('progress', {
        percent: (i / max) * 100,
        offset: (j - i),
        chunks: chunks,
        size: chunks.reduce(function (s, c) { return s + c.size; }, 0)
      });
    }

    size = chunks.reduce(function (s, c) { return s + c.size; }, 0);

    // flush
    lame.encode_flush_nogap(codec);

    self.emit('progress', {
      percent: 100,
      offset: size,
      chunks: chunks,
      size: size
    });

    // map and filter chunks
    chunks = (chunks
              .filter(function (c) { return c.size; })
              .map(function (c) { return c.data; }));

    self.emit('complete', {
      chunks: chunks,
      size: size
    });

    /// callback
    fn(null, chunks);

  return this;
};
