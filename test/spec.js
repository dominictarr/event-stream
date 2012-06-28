
/*
  assert that data is called many times
  assert that end is called eventually
*/

var macgyver = require('macgyver')
var es = require('..')
var it = require('it-is').style('colour')
var mac = macgyver()

process.on('exit', mac.validate)

var stream = es.through()

function noop () {}

/*
  actually, this spec is not quite right.
  write should not be called after end has returned.

  which is slightly different to the semantics of this.
 */

function onDrain() {console.log('drain')}
  var paused = false
stream.end = mac(stream.end).once()
  stream.write = 
    mac(stream.write)
    .beforeReturns(stream.end)
    .returns(function (written) {
        it(written)
          .typeof('boolean')     //be strict.
          .equal(!stream.paused) //expose pause state. must be consistant.

        if(!paused && !written) {
          //after write returns false, it must emit drain eventually.
          console.log('expect drain')
          stream.once('drain', mac(onDrain).once())
        }
        paused = !written
      })
var onClose = mac(noop).once()
var onEnd   = mac(noop).once().before(onClose)
var onData  = mac(noop).before(onEnd)

stream.on('close', onClose)
stream.on('end', onEnd)
stream.on('data', onData)

stream.write(1)
stream.write(1)
stream.pause()
stream.write(1)
stream.resume()
stream.write(1)
stream.end(2) //this will call write()

/*
  okay, that was easy enough, whats next?

  say, after you call paused(), write should return false
  until resume is called.

  simple way to implement this:
    write must return !paused
  after pause() paused = true
  after resume() paused = false

  on resume, if !paused drain is emitted again.
  after drain, !paused

  there are lots of subtle ordering bugs in streams.

  example, set !paused before emitting drain.

  the stream api is stateful. 
*/


