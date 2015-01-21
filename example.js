var audex = require('audex');
var encoder = null;
var output = [];

LoadAudioBuffer('/test/track-1.mp3', function (err, buffer) {
  encoder = audex.createEncoder(
    [buffer.getChannelData(0), buffer.getChannelData(1)], {
    sampleRate: buffer.sampleRate,
    duration: buffer.duration
  });

  encoder.on('progress', console.log.bind(console));

  CrossfadeAudio(encoder, 0, 4, 0.1, 1, function (err, out) {
    FinalizeOutput(out);
  });

  /*SpliceAudio(encoder, 0, 2, function (err, out) {
    output.push(out);
    SpliceAudio(encoder, 2, 4, function (err, out) {
      output.push(out);
      FinalizeOutput(output);
    });
  });*/
});

function LoadAudioBuffer (url, fn) {
  var req = new XMLHttpRequest();
  req.responseType = 'arraybuffer';
  req.onerror = fn;
  req.onload = function (e) {
    GlobalAudioContext.decodeAudioData(e.target.response, function (buf) {
      fn(null, buf);
    });
  };

  req.open('GET', url, true);
  req.send();
}

function SpliceAudio (enc, start, stop, fn) {
  enc.splice(start, stop).encode(fn);
}

function SpliceAudioWithScale (enc, start, stop, scale, fn) {
  enc.splice(start, stop).scale(scale).encode(fn);
}

function FinalizeOutput (output) {
  var offset = 0;

  var joined = output.reduce(function (a, b) {
    return a.concat(b);
  }, []);

  /*var size = joined.reduce(function (n, b) {
    return n + b.length;
  }, 0);

  var buffer = joined.reduce(function (out, buf) {
    console.log(buf)
    out.set(buf, offset);
    offset = buf.length;
    return out;
  }, new Uint8Array(size));*/

  console.log(joined);

  var blob = new Blob(joined, {type: 'audio/mp3'});

  ViewOutputBlob(blob);
}

function ViewOutputBlob (blob) {
  var url = URL.createObjectURL(blob);
  window.open(url);
}

function CrossfadeAudio (encoder, start, end, s, e, fn) {
  var buffers = [];
  var d = (e - s) * 10;

  void function work (i) {
    var scale = s + (i/10);
    scale = scale > 1 ? 1: scale;
    console.log("work=(%d) scale=(%f) d=(%d)", i, scale, d);
    if (++i >= d) {
      fn(null, buffers);
      return;
    }
    SpliceAudioWithScale(
      encoder,
      start + i, start + i + 1, scale,
      function (err, out) {
        if (err) { return fn(err); }
        buffers.push(out);
        work(i);
      });
  }(0);
}

function JoinBuffers (buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
}
