# EventStreams

EventEmitters in node are a brilliant idea that unfortunatly are under utilized by the node community.
Yes, that is right. _under utilized_. there are many more things that EventEmitters could be used for, especially, 
the `Stream`s, a subclass of EventEmitters.

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

##Examples

###map

Turns an asyncronous function it into an readable/writable EventStream
it can be used to perform a transformation upon a stream before writing it to something.

If error, `callback(error)` like normal. If you `callback()` (no args) the stream will not emit 
anything from that map.

`map` does not guarantee mapped output order will be the same an written input.

`map` will hold off on emitting `end` until all of it's map callbacks are complete.

Each map MUST call the callback. it may callback with data, with an error or with no arguments, 

``` js

  //callback mapped data
  
  callback(null, data) //may use multiple args, but first is always error
    
  //drop this peice of data
  
  callback()
  
  //if there was on error
  
  callback (error) //the event stream will emit 'error' instead of data for this step.

```

if a callback is not called map will think that it is still being worked on.

If the callback is called more than once, every call but the first will be ignored.

''' js

var es = require('event-stream')

  es.map(function (data, callback) {
    //do something to data
    callback(null, data)   
  })
'''

###read

Makes an readable `EventStream` from an `Array`.

Just emit each item as a data event, respecting `pause` and `resume`.

``` js

var es = require('event-stream')

  var reader =es.read([1,2,3])
  reader.pipe(es.map(function (data) {
    //apply a mapping
  }))
  //since read is potentially sync
  //it will start out paused.
  //it is necessary to call resume or open
  //to start it emitting events
  reader.resume()
```

### reduce

combine all incoming data together into one item which will be emitted on recieving end.

### pipe

join multiple EventStreams together into one massive stream. 
the pipe will return an EventStream. Writing to the pipe will write to the first stream,
the pipe will emit data from the last stream.

listening for 'error' will recieve errors from all streams inside the pipe.

(not implemented yet)

``` js

  es.pipe(
    es.emitterToStream(findit(startDir), null, {'file': 'data'}),
    es.map(function (filename, callback) {
      fs.readFile(filename, function (err, file) {
        if (err) return callback(err)
        callback(null, {_id: filename, content: file.toString()}) 
      })
    }),
    es.save.couch({database: 'example'}) //defaults to localhost:5984
  )

```

### emitterStream

Sometimes a single input maps to many outputs. you would normally do this with a function that 
returns an event emitter. 

to make this more streamy, it is often only necessory to redirect a event to 'data'

to make a readible stream it needs to emit 'data' and 'end'.

to make a writable stream it needs to accept `write`, and possibly `end`

emitterStream(
  emitter, 
  { write: inputMethodName, end: finishMethodName }, //inputs (if writable)
  { data: outputEventName, end: finishEventName, error: errorEventName } //outputs (if readible)
  ) //if omitted, default to thier standard names

emitterStream(
  findit(process.cwd(), 
  null, //readible 
  { data: 'directory' } //outputs. (findit already emits 'end' and 'error')
)
  

``` js
  // SubStack's findit recursively searches from a starting directory
  // the findit function returns an EventEmitter that emits
  // 'file', 'directory', and 'path' events.
  
  var findit = require('findit')
  var findStream =  es.emitterStream(findit(process.cwd()), null, {data: 'path', end: 'end'})
  findStream.pipe(nextStream)

### another pipe example

SEARCH SUBDIRECTORIES FROM CWD
FILTER IF NOT A GIT REPO
MAP TO GIT STATUS --porclean + the directory
FILTER IF EMPTY STATUS
process.stdout
that will show all the repos which have unstaged changes

## TODO & applications

  * buffer -- buffer items
  * rate limiter
  * save to database
    * couch
    * redis
    * mongo
    * file(s)
  * read from database
    * couch
    * redis
    * mongo
    * file(s)
  * recursive
    * search filesystem
    * scrape web pages (load pages, parse for links, etc)
    * module dependencies
    