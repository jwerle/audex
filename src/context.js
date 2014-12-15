
'use strict';

/**
 * Module dependencies
 */

var global = 'undefined' === typeof window ? global : window;

/**
 * `AudioContext' resolution
 *
 * @api public
 */

module.exports = global.AudioContext || webkitAudioContext || (function () {
  throw new TypeError("`AudioContext' is not supported");
}());
