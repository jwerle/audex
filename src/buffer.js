
'use strict';

/**
 * Module dependencies
 */

var AudioContext = require('./context')

var context = null;

function getContext () {
  return (context = context || new AudioContext());
}

/**
 * `Buffer' constructor
 *
 * @api public
 */

function Buffer () {
}
