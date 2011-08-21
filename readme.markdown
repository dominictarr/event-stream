# EventStreams

EventEmitters in node are a brilliant idea that are under utilized in the node community. 

they are at the heart of all the IO in node core, reading from files, or TCP, or the body 
of an http request or response is handled as a stream of events.

A stream of events is a bit like an array, but an array layed out in time, rather than in memory.

You can apply a map function to an array and create a new array, you could apply a similar 
map function to a stream of events to create a new stream. `map` functions, but also `fitler`, `reduce`
and other functional programming idioms!

event streams are great because they have a naturally scalable API. 
if the events in a stream can be stringified ane parsed then it will be relatively simple to split heavy 
parts of a stream into seperate processes, and to incorperate middlewares into the stream that might 
buffer or rate-limit or parallelize critical aspects of your event stream.

Supporting this sort of programming is the purpose of this library.

[test are in event-stream_tests](https://github.com/dominictarr/event-stream_tests)

[node Stream documentation](http://nodejs.org/api/streams.html)

##Example

###map

`eventstream.map` takes an asyncronous function and turns it into an readable/writable EventStream
it can be used to perform a transformation upon a stream before writing it to something.

if error, `callback(error)` like normal. if you `callback()` (no args) the stream will not emit 
anything from that map.

the order that the stream emits data is not gaurenteed to be the same as data is written to it. 
(that feature is forth coming)

will not emit 'end' when all the maps are finished, but only when all maps are finished. 
it is essential that each map does call the callback. with data, with an error or with no arguments.

if the callback is called more than once, every call but the first will be ignored.

''' js

var es = require('event-stream')

  es.map(function (data, callback) {
    //do something to data
    callback(null, data)   
  })
'''