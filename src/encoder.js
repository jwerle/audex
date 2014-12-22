
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
  var factor = this.opts.time.end * 0.01;
  var chunks = [];
  var codec = this.codec;
  var start = this.opts.time.start;
  var type = this.opts.type;
  var left = buffers[0];
  var right = this.opts.channels > 1 ? buffers[1] : left;
  var rate = this.opts.samplerate.in;
  var len = buffers[0].length;
  var end = this.opts.time.end;

  samples = rate * (end - start);

  console.log(
    "type=(%s) samples=(%d) mode=%d, bitrate=%d, channels=%d, samplerate(in)=%d, samplerate(out)=%d",
    type,
    samples,
    this.mode(),
    this.bitrate(),
    this.channels(),
    this.samplerate('in'),
    this.samplerate('out'))

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
          mat.push(buffers[k][i + j]);
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
    len = 1152 * 2 * 2 // @TODO - move to constant
    for (i = 0; i <= len * end * 1000; i += len) {
      j = i + len < l.length - 1 ? i + len : r.length - 1;
      console.log("encoding offset=(%d) size=(%d)", i, j - i);
      chunks.push(lame.encode_buffer_ieee_float(codec,
                                                l.subarray(i, j),
                                                r.subarray(i, j)));
    }

    lame.encode_flush(codec);
    // output
    fn(null,
       new Blob(chunks.map(function (c) { return c.data }),
                {type: type}));
  });


  return this;
};
