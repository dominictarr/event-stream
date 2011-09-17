# EventStreams

Streams are node's best and sadly misunderstood idea,  
this is a toolkit to make creating and working with streams <em>easy</em>.

`Stream` is a subclass of `EventEmitter`, it adds one very useful function:

``` js
  readibleStream.pipe(writableStream)

  //if a stream is both readable and writable it can be pipe on again
  
  readibleStream.pipe(readableWritableStream)
  readableWritableStream.pipe(writableStream)

  // just like on the command line!
  // readibleStream | readableWritableStream | writableStream
  //
```

the `event-stream` functions are just like the array functions,  
because Streams are like Arrays, but laid out in time, rather in memory.

###for example:

``` js

//pretty.js

if(!module.parent) {
  var es = require('..')              //load event-stream
  es.pipe(                            //pipe joins streams together
    process.openStdin(),              //open stdin
    es.split(),                       //split stream to break on newlines
    es.map(function (data, callback) {//turn this async function into a stream
      callback(null
        , inspect(JSON.parse(data)))  //render it nicely
    }),
    process.stdout                    // pipe it to stdout !
    )
  }
  
//curl -sS registry.npmjs.org/event-stream | node pretty.js

```
 
[test are in event-stream_tests](https://github.com/dominictarr/event-stream_tests)

[node Stream documentation](http://nodejs.org/api/streams.html)

##map

create a readable and writable stream from an asyncronous function.  

``` js
var es = require('event-stream')

es.map(function (data, callback) {
  //transform data
  // ...
  callback(null, data)
})

```

Each map MUST call the callback. it may callback with data, with an error or with no arguments, 

  * `callback()` drop this data.  
    this makes the map work like `filter`,  
    note:`callback(null,null)` is not the same, and will emit `null`

  * `callback(null, newData)` turn data into newData
    
  * `callback(error)` emit an error for this item.

>Note: if a callback is not called map will think that it is still being worked on,   
>every call must be answered or the stream will not know when to end.  
>
>also, if the callback is called more than once, every call but the first will be ignored.

###readArray

makes a readable stream from an array.  

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
    