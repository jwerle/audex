var audex = require('audex');
var encoder = null;
var output = [];

LoadAudioBuffer('/test/track-1.mp3', function (err, buffer) {
  function createEncoder () {
    return audex.createEncoder(
      [buffer.getChannelData(0), buffer.getChannelData(1)], {
      sampleRate: buffer.sampleRate,
      duration: buffer.duration
    })
    //.on('progress', console.log.bind(console)).scale(1);
  }

  var encoder = createEncoder();

  CrossfadeAudio(encoder, 0, 5, 0, 1, function (err, a) {
    SpliceAudio(encoder, 5, 10, function (err, b) {
      CrossfadeAudio(encoder, 10, 30, 1, .1, function (err, c) {
        FinalizeOutput(a.concat(b).concat(c));
      })
    })
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
  //console.log("splice start=(%d) stop=(%d) scale=(%f)", start, stop, scale);
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
  var scale = s;
  var stop = (end - start);
  var d = (e - s) / (end - start);
  void function work (i) {
    scale = scale > 1 ? 1 : scale + d;
    scale = scale < 0 ? 0 : scale;
    console.log("work=(%d) scale=(%f) d=(%f)", i, scale, d);

    if (i + 1 > stop) {
      fn(null, buffers);
      return;
    }

    SpliceAudioWithScale(
      encoder,
      start + i, start + i + 1, scale,
      function (err, out) {
        if (err) { return fn(err); }
        buffers.push(out);
        work(++i);
      });
  }(0);
}

function JoinBuffers (buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp;
}
