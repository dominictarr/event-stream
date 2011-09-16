//filter will reemit the data if cb(err,pass) pass is truthy
// reduce is more tricky
// maybe we want to group the reductions or emit progress updates occasionally
// the most basic reduce just emits one 'data' event after it has recieved 'end'


var Stream = require('stream').Stream

// writable stream, collects all events into an array 
// and calls back when 'end' occurs
// mainly I'm using this to test the other functions

exports.writeArray = function (done) {
  if ('function' !== typeof done)
    throw new Error('function writeArray (done): done must be function')

  var a = new Stream ()
    , array = []
  a.write = function (l) {
    array.push(l)
  }
  a.end = function () {
    done(null, array)
  }
  a.writable = true
  a.readable = false
  return a
}

//return a Stream that reads the properties of an object
//respecting pause() and resume()

exports.readArray = function (array) {
  var stream = new Stream()
    , i = 0
    , paused = false
 
  stream.readable = true  
  stream.writable = false
 
  if(!Array.isArray(array))
    throw new Error('event-stream.read expects an array')
  
  stream.resume = function () {
    paused = false
    var l = array.length
    while(i < l && !paused) {
      stream.emit('data', array[i++])
    }
    if(i == l)
      stream.emit('end'), stream.readible = false
  }
  process.nextTick(stream.resume)
  stream.pause = function () {
     paused = true
  }
  return stream
}

//create an event stream and apply function to each .write
//emitting each response as data
//unless it's an empty callback

exports.map = function (mapper) {
  var stream = new Stream()
    , inputs = 0
    , outputs = 0
    , ended = false

  stream.writable = true
  stream.readible = true
   
  stream.write = function () {
    inputs ++
    var args = [].slice.call(arguments)
      , r
      , inNext = false 
    function next (err) {
      inNext = true
      outputs ++
      var args = [].slice.call(arguments)
      if(err)
       return inNext = false, stream.emit('error')    
      args.shift() //drop err
    
      if (args.length){
        args.unshift('data')
        r = stream.emit.apply(stream, args)
      }
      if(inputs == outputs) {
        stream.emit('drain') //written all the incoming events
        if(ended)
          stream.end()
      }
      inNext = false
    }
    args.push(next)
    
    try {
      //catch sync errors and handle them like async errors
      return mapper.apply(null,args)
    } catch (err) {
      //if the callback has been called syncronously, and the error
      //has occured in an listener, throw it again.
      if(inNext)
        throw err
      next(err)
      return true
    }
  }

  stream.end = function () {
    var args = [].slice.call(arguments)
    //if end was called with args, write it, 
    ended = true //write will emit 'end' if ended is true
    if(args.length)
      return stream.write.apply(emitter, args)
    else if (inputs == outputs) //wait for processing
      stream.emit('end')
  }

  return stream
}

//
// combine multiple streams together so that they act as a single stream
//

exports.pipe = function () {

  var streams = [].slice.call(arguments)
    , first = streams[0]
    , last = streams[streams.length - 1]
    , thepipe = new Stream() //this pipe of streams
    
  if(streams.length < 2)
    throw new Error('pipe expects at least two streams to join together')

  //pipe all the streams together

  function recurse (streams) {
    if(streams.length < 2)
      return
    streams[0].pipe(streams[1])
    recurse(streams.slice(1))  
  }
  
  recurse(streams)
 
  function onerror () {
    var args = [].slice.call(arguments)
    args.unshift('error')
    thepipe.emit.apply(thepipe, args)
  }
  
  streams.forEach(function (stream) {
    stream.on('error', onerror)
  })

  ;['write', 'writable', 'end', 'close', 'destroy', 'destroySoon'].forEach(function (prop) {
    thepipe.__defineGetter__(prop, function () { return first[prop] })
  })

  ;['readible', 'resume', 'pause', 'destroy', 'destroySoon'].forEach(function (prop) {
    thepipe.__defineGetter__(prop, function () { return last[prop] })
  })

  ;['data', 'end', 'close'].forEach(function (event) {
    last.on(event, function () { 
      var args = [].slice.call(arguments)
      args.unshift(event)
      thepipe.emit.apply(thepipe, args) 
      })  
  })

  return thepipe
}

exports.split = function (matcher) {
  var stream = new Stream()
    , soFar = ''  
  
  if (!matcher)
      matcher = '\n'

  stream.writable = true
  stream.write = function (buffer) {
    buffer = buffer.toString()
    var l = buffer.length
      , i = 0
    while (i < l) {
      var c = buffer[i].toString()
      soFar += c
      if (c == matcher) {
        var n = soFar;
        soFar = '' 
        this.emit('data', n)
        console.log('data',n)
      }
    i++
    }
  }

  stream.end = function () {
    stream.emit('data', soFar)  
    stream.emit('end')
  }

  return stream
}
