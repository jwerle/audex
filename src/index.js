
/**
 * Module dependencies
 */

var Encoder = require('./encoder')
  , agent = require('superagent')

var ctx = null;

/**
 * Initializes `audex' module with an
 * `AudioContext' instance
 *
 * @api public
 * @param {AudioContext} audioContext
 */

exports = module.exports = function (audioContext) {
  if (!(audioContext instanceof AudioContext)) {
    throw new TypeError("Expecting an instance of `AudioContext'");
  }

  ctx = audioContext;

  return this;
};

/**
 * Expose `Encoder'
 */

exports.createEncoder = exports.Encoder = Encoder;

/**
 * Ensures an audio context has been
 * initialized within the module. This
 * function will throw a `TypeError' if
 * the modules audio context reference
 * is `null'
 *
 * @api private
 */

function ensureAudioContext () {
  if (null == ctx) {
    throw new TypeError(
      "`audex' has not been initialized with an AudioContext");
  }
}

/**
 * Loads an audio buffer from a URL,
 * decodes audio data and calls a callback
 * with the decoded buffer
 *
 * @api public
 * @param {String} url
 * @param {Function} fn
 */


