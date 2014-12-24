
// init
require('mocha');
mocha.setup('bdd');
window.assert = require('assert')

// tests
require('audex/test/context.js');
require('audex/test/encoder.js');

// run
mocha.run();
