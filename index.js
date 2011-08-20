
//create an event stream and apply function to each .write
//emitting each response as data
//unless it's an empty callback
//

var Stream = require('stream').Stream

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
    }
  }

  stream.end = function () {
    var args = [].slice.call(arguments)
    //if end was called with args, write it, 
    ended = true //write will emit 'end' if ended is true
    if(args.length)
      return stream.write.apply(emitter, args)
    else
      stream.emit('end')
  }

  return stream
}