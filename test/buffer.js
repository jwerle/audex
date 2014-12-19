
/**
 * Module dependencies
 */

var Buffer = require('../src/buffer')

var TRACK1 = '/track-1.mp3';
var TRACK2 = '/track-2.mp3';

function fails (fn) {
  try {
    fn();
  } catch (e) {
    assert(e instanceof Error);
    return;
  }

  throw new Error("Failed to throw execption");
}

        window.codec = 0;
        /*codec = lame.init();

        var setScale = lame.Module.cwrap('lame_set_scale', 'number', ['number', 'number']);

        var j = 0;
        var i = 0;
        var l = buf.buffer.getChannelData(0);
        var r = buf.buffer.getChannelData(1);
        var b64 = null;
        var len = 15000;
        var enc = null;
        var now = Date.now();
        var data = null;
        var scale = 0.5;
        var chunks = [];
        var factor = 10;

        lame.set_mode(codec, lame.STEREO);
        lame.set_num_channels(codec, buf.buffer.numberOfChannels);
        lame.set_in_samplerate(codec, buf.buffer.sampleRate);
        lame.set_out_samplerate(codec, buf.buffer.sampleRate / buf.buffer.numberOfChannels);
        lame.set_bitrate(codec, 128);
        console.log("scale set", setScale(codec, scale));
        lame.init_params(codec);



        console.log("start encoding...");
        for (; i < len * factor; i += len) {
          console.log("encoding frame (offset=%d)\n", i);
          j = i + len < l.length - 1 ? i + len : r.length - 1;
          enc = lame.encode_buffer_ieee_float(codec,
                                              l.subarray(i, j),
                                              r.subarray(i, j));
          chunks.push(enc.data);
        }

        data = String.fromCharCode.apply(null, chunks);
        console.log("finished encoding in ", Date.now() - now);

        window.data = data
        window.enc = enc;
        window.blob = new Blob(chunks, {type: 'audio/mp3'});
        //console.log(data)
        console.log(enc)
*/
