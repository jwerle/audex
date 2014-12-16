
'use strict';

/**
 * Module dependencies
 */

var Emitter = require('emitter')
  , Batch = require('batch')
  , AudioContext = require('./context')
  , agent = require('superagent')

function getContext () {
  return (AudioContext.context = AudioContext.context || new AudioContext());
}

/**
 * `AudexBuffer' constructor
 *
 * @api public
 * @param {AudioBuffer} buffer
 * @param {AudioContext} ctx
 * @param {String} type
 */

module.exports = AudexBuffer;
function AudexBuffer (buffer, ctx, type) {
  if (!(this instanceof AudexBuffer)) {
    return new AudexBuffer(buffer, ctx, type);
  }

  if (2 == arguments.length) {
    if ('string' == typeof ctx) {
      type = ctx;
      ctx = getContext();
    }
  } else if (1 == arguments.length) {
    ctx = getContext();
  } else if (0 == arguments.length) {
    throw new Error("Expecting at least 2 arguments.");
  }

  if (!(buffer instanceof AudioBuffer)) {
    throw new TypeError("Expecting an instance of `AudioBuffer'.");
  } else if (!(ctx instanceof AudioContext)) {
    throw new TypeError("Expecting an instance of `AudioContext'.");
  }

  this.type = 'string' == typeof type ? type : AudexBuffer.DEFAULT_MIMETYPE;
  this.buffer = buffer;
  this.source = ctx.createBufferSource();
  this.context = ctx;

  Object.defineProperty(this, 'length', {
    get: function () {
      return buffer.length;
    }
  });
}

// Inherit from `Emitter'
Emitter(AudexBuffer.prototype);

/**
 * `AudexBuffer' singleton context
 *
 * @api public
 */

AudexBuffer.context = null;

/**
 * Default `AudexBuffer' instance mimetype
 *
 * @api public
 */

AudexBuffer.DEFAULT_MIMETYPE = 'audio/mpeg';

/**
 * Concats multple `AudexBuffer' instance
 * buffers into a single buffer
 *
 * @api public
 * @static
 * @param {Array} buffers
 * @param {Object} opts - optional
 */

AudexBuffer.concat = function (buffers, opts) {
  if (1 == arguments.length) {
    opts = {};
  }

  if (false == Array.isArray(buffers)) {
    throw new TypeError("Expecting an array of buffers.");
  }

  var channels = opts.channels || 2;
  var channel = null;
  var offset = 0;
  var audioBuffer = null;
  var sampleRate = 0;
  var totalBufferSize = 0;
  var curr = null;
  var ctx = null;
  var buf = null;
  var bufLen = buffers.length;
  var i = 0;
  var j = 0;

  totalBufferSize = buffers.reduce(function (total, currBuf) {
    return total + currBuf.length;
  }, 0);

  ctx = getContext();
  sampleRate = ctx.sampleRate;
  audioBuffer = ctx.createBuffer(channels, totalBufferSize, sampleRate);
  buf = new AudexBuffer(audioBuffer, ctx);

  for (;i < channels; ++i) {
    // `TypedArray' offset
    offset = 0;

    for (j = 0; j < bufLen; ++j) {
      // current channel in final audio buffer
      channel = audioBuffer.getChannelData(i);

      // current buffer
      curr = buffers[j];

      // append current audio chanel to the
      // final audio buffer
      channel.set(curr.buffer.getChannelData(i), offset);

      // advance offset with current buffer length
      offset += curr.buffer.length;
    }
  }

  return buf;
};

/**
 * Loads a buffer from a source URL
 * and calls `fn' with an instance of
 * a `AudexBuffer' object
 *
 * @api public
 * @static
 * @param {String} url
 * @param {String} type
 * @param {Function} fn
 */

AudexBuffer.load = function (url, type, fn) {
  var buf = null;
  var ctx = getContext();
  var req = new XMLHttpRequest();
  var res = null;

  // init
  req.responseType = 'arraybuffer';
  req.open('GET', url, true);

  // events
  req.onload = onload;
  req.onerror = onerror;

  // request
  try { req.send(); }
  catch (e) { return fn(e); }

  function onload (e) {
    var status = e.target.status;

    res = e.target.response;

    if (null == res) {
      return fn(new Error("Failed to parse response"));
    } else if (status >= 400 && status < 500) {
      return fn(new Error(status + ': '+ e.target.statusText));
    }

    ctx.decodeAudioData(res, ondecoded);
    function ondecoded (buffer) {
      if (null == buffer) {
        return fn(new Error("Failed to decode audio data."));
      }

      // create buffer
      buf = new AudexBuffer(buffer, ctx, type);

      // callback
      fn(null, buf);
    }
  }

  function onerror (err) {
    fn(err);
  }
};

AudexBuffer.prototype.slice = function () {

};

AudexBuffer.prototype.copy = function () {

};

