
//create an event stream and apply function to each .write
//emitting each response as data
//unless it's an empty callback
//

var Stream = require('stream').Stream

//filter will reemit the data if cb(err,pass) pass is truthy
// reduce is more tricky
// maybe we want to group the reductions or emit progress updates occasionally
// the most basic reduce just emits one 'data' event after it has recieved 'end'

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

  //return a Stream that reads the properties of an object
  //respecting pause() and resume()

exports.read = function (array) {
  var stream = new Stream()
    , i = 0
    , paused = false
 
  stream.readable = true  
  stream.writable = false
 
  if(!Array.isArray(array))
    throw new Error('event-stream.read expects an array')
  
  stream.open = function () {
    paused = false
    var l = array.length
    while(i < l && !paused) {
      stream.emit('data', array[i++])
    }
    if(i == l)
      stream.emit('end'), stream.readible = false
  }
  stream.pause = function () {
     paused = true
  }
  stream.resume = stream.open
  return stream
}