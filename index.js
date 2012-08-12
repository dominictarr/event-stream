//filter will reemit the data if cb(err,pass) pass is truthy

// reduce is more tricky
// maybe we want to group the reductions or emit progress updates occasionally
// the most basic reduce just emits one 'data' event after it has recieved 'end'


var Stream = require('stream').Stream
  , es = exports
  , through = require('through')
  , from = require('from')
  , duplex = require('duplexer')

es.Stream = Stream //re-export Stream from core
es.through = through.through
es.from = from
es.duplex = duplex

// merge / concat
//
// combine multiple streams into a single stream.
// will emit end only once

es.concat = //actually this should be called concat
es.merge = function (/*streams...*/) {
  var toMerge = [].slice.call(arguments)
  var stream = new Stream()
  var endCount = 0
  stream.writable = stream.readable = true

  toMerge.forEach(function (e) {
    e.pipe(stream, {end: false})
    var ended = false
    e.on('end', function () {
      if(ended) return
      ended = true
      endCount ++
      if(endCount == toMerge.length)
        stream.emit('end') 
    })
  })
  stream.write = function (data) {
    this.emit('data', data)
  }
  stream.destroy = function () {
    merge.forEach(function (e) {
      if(e.destroy) e.destroy()
    })
  }
  return stream
}


// writable stream, collects all events into an array 
// and calls back when 'end' occurs
// mainly I'm using this to test the other functions

es.writeArray = function (done) {
  if ('function' !== typeof done)
    throw new Error('function writeArray (done): done must be function')

  var a = new Stream ()
    , array = [], isDone = false
  a.write = function (l) {
    array.push(l)
  }
  a.end = function () {
    isDone = true
    done(null, array)
  }
  a.writable = true
  a.readable = false
  a.destroy = function () {
    a.writable = a.readable = false
    if(isDone) return
    done(new Error('destroyed before end'), array)
  }
  return a
}

//return a Stream that reads the properties of an object
//respecting pause() and resume()

es.readArray = function (array) {
  var stream = new Stream()
    , i = 0
    , paused = false
    , ended = false
 
  stream.readable = true  
  stream.writable = false
 
  if(!Array.isArray(array))
    throw new Error('event-stream.read expects an array')
  
  stream.resume = function () {
    if(ended) return
    paused = false
    var l = array.length
    while(i < l && !paused && !ended) {
      stream.emit('data', array[i++])
    }
    if(i == l && !ended)
      ended = true, stream.readable = false, stream.emit('end')
  }
  process.nextTick(stream.resume)
  stream.pause = function () {
     paused = true
  }
  stream.destroy = function () {
    ended = true
    stream.emit('close')
  }
  return stream
}

//
// readable (asyncFunction)
// return a stream that calls an async function while the stream is not paused.
//
// the function must take: (count, callback) {...
//

es.readable = function (func, continueOnError) {
  var stream = new Stream()
    , i = 0
    , paused = false
    , ended = false
    , reading = false

  stream.readable = true  
  stream.writable = false
 
  if('function' !== typeof func)
    throw new Error('event-stream.readable expects async function')
  
  stream.on('end', function () { ended = true })
  
  function get (err, data) {
    
    if(err) {
      stream.emit('error', err)
      if(!continueOnError) stream.emit('end')
    } else if (arguments.length > 1)
      stream.emit('data', data)

    process.nextTick(function () {
      if(ended || paused || reading) return
      try {
        reading = true
        func.call(stream, i++, function () {
          reading = false
          get.apply(null, arguments)
        })
      } catch (err) {
        stream.emit('error', err)    
      }
    })
  
  }
  stream.resume = function () {
    paused = false
    get()
  }
  process.nextTick(get)
  stream.pause = function () {
     paused = true
  }
  stream.destroy = function () {
    stream.emit('end')
    stream.emit('close')
    ended = true
  }
  return stream
}


//create an event stream and apply function to each .write
//emitting each response as data
//unless it's an empty callback

es.map = function (mapper) {
  var stream = new Stream()
    , inputs = 0
    , outputs = 0
    , ended = false
    , paused = false
    , destroyed = false

  stream.writable = true
  stream.readable = true
   
  stream.write = function () {
    if(ended) throw new Error('map stream is not writable')
    inputs ++
    var args = [].slice.call(arguments)
      , r
      , inNext = false 
    //pipe only allows one argument. so, do not 
    function next (err) {
      if(destroyed) return
      inNext = true
      outputs ++
      var args = [].slice.call(arguments)
      if(err) {
        args.unshift('error')
        return inNext = false, stream.emit.apply(stream, args)
      }
      args.shift() //drop err
      if (args.length) {
        args.unshift('data')
        r = stream.emit.apply(stream, args)
      }
      if(inputs == outputs) {
        if(paused) paused = false, stream.emit('drain') //written all the incoming events
        if(ended) end()
      }
      inNext = false
    }
    args.push(next)
    
    try {
      //catch sync errors and handle them like async errors
      var written = mapper.apply(null, args)
      paused = (written === false)
      return !paused
    } catch (err) {
      //if the callback has been called syncronously, and the error
      //has occured in an listener, throw it again.
      if(inNext)
        throw err
      next(err)
      return !paused
    }
  }

  function end (data) {
    //if end was called with args, write it, 
    ended = true //write will emit 'end' if ended is true
    stream.writable = false
    if(data !== undefined)
      return stream.write(data)
    else if (inputs == outputs) //wait for processing 
      stream.readable = false, stream.emit('end'), stream.destroy() 
  }

  stream.end = function (data) {
    if(ended) return
    end()
  }

  stream.destroy = function () {
    ended = destroyed = true
    stream.writable = stream.readable = paused = false
    process.nextTick(function () {
      stream.emit('close')
    })
  }
  stream.pause = function () {
    paused = true
  }

  stream.resume = function () {
    paused = false
  }

  return stream
}


//
// map sync
//

es.mapSync = function (sync) { 
  return es.through(function write(data) {
    var mappedData = sync(data)
    if (typeof mappedData !== 'undefined')
      this.emit('data', mappedData)
  })
}

//
// log just print out what is coming through the stream, for debugging
//

es.log = function (name) {
  return es.through(function (data) {
    var args = [].slice.call(arguments)
    if(name) console.error(name, data)
    else     console.error(data)
    this.emit('data', data)
  })
}

//
// combine multiple streams together so that they act as a single stream
//
es.pipeline = 
es.pipe = es.connect = function () {

  var streams = [].slice.call(arguments)
    , first = streams[0]
    , last = streams[streams.length - 1]
    , thepipe = es.duplex(first, last)

  if(streams.length == 1)
    return streams[0]
  else if (!streams.length)
    throw new Error('connect called with empty args')

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

  return thepipe
}

//
// child -- pipe through a child process
//

es.child = function (child) {

  return es.duplex(child.stdin, child.stdout)

}

es.split = function (matcher) {
  var soFar = ''
  if (!matcher)
    matcher = '\n'

  return es.through(function (buffer) { 
    var stream = this
      , pieces = (soFar + buffer).split(matcher)
    soFar = pieces.pop()

    pieces.forEach(function (piece) {
      stream.emit('data', piece)
    })

    return true
  },
  function () {
    if(soFar)
      this.emit('data', soFar)  
    this.emit('end')
  })
}

//
// gate 
//
// while the gate is shut(), buffer incoming. 
// 
// if gate is open() stream like normal.
//
// currently, when opened, this will emit all data unless it is shut again
// if downstream pauses it will still write, i'd like to make it respect pause, 
// but i'll need a test case first.

es.gate = function (shut) {

  var stream = new Stream()
    , queue = []
    , ended = false

    shut = (shut === false ? false : true) //default to shut

  stream.writable = true
  stream.readable = true

  stream.isShut = function () { return shut }
  stream.shut   = function () { shut = true }
  stream.open   = function () { shut = false; maybe() }
  
  function maybe () {
    while(queue.length && !shut) {
      var args = queue.shift()
      args.unshift('data')
      stream.emit.apply(stream, args)
    }
    stream.emit('drain')
    if(ended && !shut) 
      stream.emit('end')
  }
  
  stream.write = function () {
    var args = [].slice.call(arguments)
  
    queue.push(args)
    if (shut) return false //pause up stream pipes  

    maybe()
  }

  stream.end = function () {
    ended = true
    if (!queue.length)
      stream.emit('end')
  }

  return stream
}

//
// parse
//
// must be used after es.split() to ensure that each chunk represents a line
// source.pipe(es.split()).pipe(es.parse())

es.parse = function () { 
  return es.through(function (data) {
    var obj
    try {
      if(data) //ignore empty lines
        obj = JSON.parse(data.toString())
    } catch (err) {
      return console.error(err, 'attemping to parse:', data)
    }
    //ignore lines that where only whitespace.
    if(obj !== undefined)
      this.emit('data', obj)
  })
}
//
// stringify
//

es.stringify = function () { 
  return es.mapSync(function (e){ 
    return JSON.stringify(Buffer.isBuffer(e) ? e.toString() : e) + '\n'
  }) 
}

//
// replace a string within a stream.
//
// warn: just concatenates the string and then does str.split().join(). 
// probably not optimal.
// for smallish responses, who cares?
// I need this for shadow-npm so it's only relatively small json files.

es.replace = function (from, to) {
  return es.pipeline(es.split(from), es.join(to))
} 

//
// join chunks with a joiner. just like Array#join
// also accepts a callback that is passed the chunks appended together
// this is still supported for legacy reasons.
// 

es.join = function (str) {
  
  //legacy api
  if('function' === typeof str)
    return es.wait(str)

  var first = true
  return es.through(function (data) {
    if(!first)
      this.emit('data', str)
    first = false
    this.emit('data', data)
    return true
  })
}


//
// wait. callback when 'end' is emitted, with all chunks appended as string.
//

es.wait = function (callback) {
  var body = ''
  return es.through(function (data) { body += data },
    function () {
      this.emit('data', body)
      this.emit('end')
      if(callback) callback(null, body)
    })
}

//
// helper to make your module into a unix pipe
// simply add 
// 
// if(!module.parent)
//  require('event-stream').pipable(asyncFunctionOrStreams)
// 
// asyncFunctionOrStreams may be one or more Streams or if it is a function, 
// it will be automatically wrapped in es.map
//
// then pipe stuff into from the command line!
// 
// curl registry.npmjs.org/event-stream | node hello-pipeable.js | grep whatever
//
// etc!
//
// also, start pipeable running as a server!
//
// > node hello-pipeable.js --port 44444
// 

var setup = function (args) {
  return args.map(function (f) {
    var x = f()
      if('function' === typeof x)
        return es.map(x)
      return x
    })
}

es.pipeable = function () {
  console.error('warn: event-stream. I have decided that pipeable is a kitchen-sick and will remove soon if no objections')
  console.error('please post an issue if you actually use this. -- dominictarr')

  if(process.title != 'node')
    return console.error('cannot use es.pipeable in the browser')
  //(require) inside brackets to fool browserify, because this does not make sense in the browser.
  var opts = (require)('optimist').argv
  var args = [].slice.call(arguments)
  
  if(opts.h || opts.help) {
    var name = process.argv[1]
    console.error([
      'Usage:',
      '',
      'node ' + name + ' [options]',
      '  --port PORT        turn this stream into a server',
      '  --host HOST        host of server (localhost is default)',
      '  --protocol         protocol http|net will require(protocol).createServer(...',
      '  --help             display this message',
      '',
      ' if --port is not set, will stream input from stdin',
      '',
      'also, pipe from or to files:',
      '',
      ' node '+name+ ' < file    #pipe from file into this stream',
      ' node '+name+ ' < infile > outfile    #pipe from file into this stream',     
      '',
    ].join('\n'))
  
  } else if (!opts.port) {
    var streams = setup(args)
    streams.unshift(es.split())
    //streams.unshift()
    streams.push(process.stdout)
    var c = es.pipeline.apply(null, streams)
    process.openStdin().pipe(c) //there
    return c

  } else {
  
    opts.host = opts.host || 'localhost'
    opts.protocol = opts.protocol || 'http'
    
    var protocol = (require)(opts.protocol)
        
    var server = protocol.createServer(function (instream, outstream) {  
      var streams = setup(args)
      streams.unshift(es.split())
      streams.unshift(instream)
      streams.push(outstream || instream)
      es.pipe.apply(null, streams)
    })
    
    server.listen(opts.port, opts.host)

    console.error(process.argv[1] +' is listening for "' + opts.protocol + '" on ' + opts.host + ':' + opts.port)  
  }
}
