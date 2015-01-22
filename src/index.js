
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

function ensureAudioContext () {
  if (null == ctx) {
    throw new TypeError(
      "`audex' has not been initialized with an AudioContext");
  }
}
