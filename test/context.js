
/**
 * Module dependencies
 */

var AudioContext = require('../src/context')

describe('AudioContext', function () {
  it("should be a function", function () {
    assert('function' == typeof AudioContext);
  });

  it("should create an instance of `AudioContext'", function () {
    var ctx = new AudioContext();
    assert('object' == typeof ctx);
    assert(ctx instanceof AudioContext);
  });
});
