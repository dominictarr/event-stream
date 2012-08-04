# EventStream

<img src=https://secure.travis-ci.org/dominictarr/event-stream.png?branch=master>

[Streams](http://nodejs.org/api/streams.html "Stream") are nodes best and most misunderstood idea, and 
_<em>EventStream</em>_ is a toolkit to make creating and working with streams <em>easy</em>.  

Normally, streams are only used of IO,  
but in event stream we send all kinds of objects down the pipe.  
If your application's <em>input</em> and <em>output</em> are streams,  
shouldn't the <em>throughput</em> be a stream too?  

The *EventStream* functions resemble the array functions,  
because Streams are like Arrays, but laid out in time, rather than in memory.  

<em>All the `event-stream` functions return instances of `Stream`</em>.

Stream API docs: [nodejs.org/api/streams](http://nodejs.org/api/streams.html "Stream")

NOTE: I shall use the term <em>"through stream"</em> to refer to a stream that is writable <em>and</em> readable.  

###[simple example](https://github.com/dominictarr/event-stream/blob/master/examples/pretty.js):

``` js

//pretty.js

if(!module.parent) {
  var es = require('event-stream')
  es.connect(                         //connect streams together with `pipe`
    process.openStdin(),              //open stdin
    es.split(),                       //split stream to break on newlines
    es.map(function (data, callback) {//turn this async function into a stream
      callback(null
        , inspect(JSON.parse(data)))  //render it nicely
    }),
    process.stdout                    // pipe it to stdout !
    )
  }
```
run it ...

``` bash  
curl -sS registry.npmjs.org/event-stream | node pretty.js
```
 
[node Stream documentation](http://nodejs.org/api/streams.html)

## through (write?, end?)

Reemits data synchronously. Easy way to create syncronous through streams.
Pass in an optional `write` and `end` methods. They will be called in the 
context of the stream. Use `this.pause()` and `this.resume()` to manage flow.
Check `this.paused` to see current flow state. (write always returns `!this.paused`)

this function is the basis for most of the syncronous streams in `event-stream`.

``` js

es.through(function write(data) {
    this.emit('data', data)
    //this.pause() 
  },
  function end () { //optional
    this.emit('end')
  })

```

##map (asyncFunction)

Create a through stream from an asyncronous function.  

``` js
var es = require('event-stream')

es.map(function (data, callback) {
  //transform data
  // ...
  callback(null, data)
})

```

Each map MUST call the callback. It may callback with data, with an error or with no arguments, 

  * `callback()` drop this data.  
    this makes the map work like `filter`,  
    note:`callback(null,null)` is not the same, and will emit `null`

  * `callback(null, newData)` turn data into newData
    
  * `callback(error)` emit an error for this item.

>Note: if a callback is not called, `map` will think that it is still being processed,   
>every call must be answered or the stream will not know when to end.  
>
>Also, if the callback is called more than once, every call but the first will be ignored.

## mapSync (syncFunction)

Same as `map`, but the callback is called synchronously. Based on `es.through`

## split (matcher)

Break up a stream and reassemble it so that each line is a chunk. matcher may be a `String`, or a `RegExp` 

Example, read every line in a file ...

``` js
  es.connect(
    fs.createReadStream(file, {flags: 'r'}),
    es.split(),
    es.map(function (line, cb) {
       //do something with the line 
       cb(null, line)
    })
  )

```

`split` takes the same arguments as `string.split` except it defaults to '\n' instead of ',', and the optional `limit` paremeter is ignored.
[String#split](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/String/split)

## join (seperator)

create a through stream that emits `seperator` between each chunk, just like Array#join.

(for legacy reasons, if you pass a callback instead of a string, join is a synonym for `es.wait`)

## replace (from, to)

Replace all occurences of `from` with `to`. `from` may be a `String` or a `RegExp`.  
Works just like `string.split(from).join(to)`, but streaming.


## parse

Convienience function for parsing JSON chunks. For newline seperated JSON,
use with `es.split`

``` js
fs.createReadStream(filename)
  .pipe(es.split()) //defaults to lines.
  .pipe(es.parse())
```

## stringify

convert javascript objects into lines of text. The text will have whitespace escaped and have a `\n` appended, so it will be compatible with `es.parse`

``` js
objectStream
  .pipe(es.stringify())
  .pipe(fs.createWriteStream(filename))
```

##readable (asyncFunction) 

create a readable stream (that respects pause) from an async function.  
while the stream is not paused,  
the function will be polled with `(count, callback)`,  
and `this`  will be the readable stream.

``` js

es.readable(function (count, callback) {
  if(streamHasEnded)
    return this.emit('end')
  
  //...
  
  this.emit('data', data) //use this way to emit multiple chunks per call.
      
  callback() // you MUST always call the callback eventually.
             // the function will not be called again until you do this.
})
```
you can also pass the data and the error to the callback.  
you may only call the callback once.  
calling the same callback more than once will have no effect.  

##readArray (array)

Create a readable stream from an Array.

Just emit each item as a data event, respecting `pause` and `resume`.

``` js
  var es = require('event-stream')
    , reader = es.readArray([1,2,3])

  reader.pipe(...)
```

## writeArray (callback)

create a writeable stream from a callback,  
all `data` events are stored in an array, which is passed to the callback when the stream ends.

``` js
  var es = require('event-stream')
    , reader = es.readArray([1, 2, 3])
    , writer = es.writeArray(function (err, array){
      //array deepEqual [1, 2, 3]
    })

  reader.pipe(writer)
```

## connect (stream1,...,streamN)

Connect multiple Streams together into one stream.  
`connect` will return a Stream. This stream will write to the first stream,
and will emit data from the last stream. 

Listening for 'error' will recieve errors from all streams inside the pipe.

``` js

  es.connect(                         //connect streams together with `pipe`
    process.openStdin(),              //open stdin
    es.split(),                       //split stream to break on newlines
    es.map(function (data, callback) {//turn this async function into a stream
      callback(null
        , inspect(JSON.parse(data)))  //render it nicely
    }),
    process.stdout                    // pipe it to stdout !
    )
```

## gate (isShut=true) 

If the gate is `shut`, buffer the stream.  
All calls to write will return false (pause upstream),  
and end will not be sent downstream.  

If the gate is open, let the stream through.  

Named `shut` instead of close, because close is already kinda meaningful with streams.  

Gate is useful for holding off processing a stream until some resource (i.e. a database, or network connection) is ready.  

``` js

  var gate = es.gate()
  
  gate.open() //allow the gate to stream
  
  gate.close() //buffer the stream, also do not allow 'end' 

```

## duplex (writeStream, readStream)

Takes a writable stream and a readable stream and makes them appear as a readable writable stream.

It is assumed that the two streams are connected to each other in some way.  

(This is used by `connect` and `child`.)

``` js
  var grep = cp.exec('grep Stream')

  es.duplex(grep.stdin, grep.stdout)
```

Optionally reverse the read direction

``` js
var read = someReadStream()
  , write = someWriteStream()
  , duplex = es.duplex(read, write, {
    reverse: true
  })

// data being emitted on the duplex
// will emit data on the read stream rather then the other way around
otherStream.pipe(duplex).pipe(otherStream)

## child (child_process)

Create a through stream from a child process ...

``` js
  var cp = require('child_process')

  es.child(cp.exec('grep Stream')) // a through stream

```

## wait (callback)

waits for stream to emit 'end'.
joins chunks of a stream into a single string. 
takes an optional callback, which will be passed the 
complete string when it receives the 'end' event.

also, emits a simgle 'data' event.

``` js

readStream.pipe(es.join(function (err, text) {
  // have complete text here.
}))

```

## pipeable (streamCreatorFunction,...)

The arguments to pipable must be functions that return  
instances of Stream or async functions.  
(If a function is returned, it will be turned into a Stream  
with `es.map`.)

Here is the first example rewritten to use `pipeable`.

``` js
//examples/pretty_pipeable.js
var inspect = require('util').inspect

if(!module.parent)
  require('event-stream').pipeable(function () {
    return function (data, callback) {
      try {
        data = JSON.parse(data)
      } catch (err) {}              //pass non JSON straight through!
      callback(null, inspect(data))
      }
    })  
  })
```

``` bash

curl -sS registry.npmjs.org/event-stream | node pipeable_pretty.js

## or, turn the pipe into a server!

node pipeable_pretty.js --port 4646

curl -sS registry.npmjs.org/event-stream | curl -sSNT- localhost:4646

```
## compatible modules:

  * https://github.com/felixge/node-growing-file  
    stream changes on file that is being appended to. just like `tail -f`

  * https://github.com/isaacs/sax-js  
    streaming xml parser

  * https://github.com/mikeal/request  
    make http requests. request() returns a through stream!

  * https://github.com/TooTallNate/node-throttle  
    throttle streams on a bytes per second basis (binary streams only, of course)
    
  * https://github.com/mikeal/morestreams  
    buffer input until connected to a pipe.
    
  * https://github.com/TooTallNate/node-gzip-stack  
    compress and decompress raw streams.

  * https://github.com/Floby/node-json-streams  
    parse json without buffering it first
    
  * https://github.com/floby/node-tokenizer  
    tokenizer
  
  * https://github.com/floby/node-parser  
    general mechanisms for custom parsers
    
  * https://github.com/dodo/node-bufferstream  
    buffer streams until you say (written in C)

  * https://github.com/tim-smart/node-filter  
    `filter` pipeable string.replace
    

## almost compatible modules: (1+ these issues)

  * https://github.com/fictorial/json-line-protocol/issues/1  
    line reader
    
  * https://github.com/jahewson/node-byline/issues/1  
    line reader

  * https://github.com/AvianFlu/ntwitter/issues/3  
    twitter client

  * https://github.com/swdyh/node-chirpstream/issues/1  
    twitter client
    
  * https://github.com/polotek/evented-twitter/issues/22  
    twitter client


<!--
TODO, the following methods are not implemented yet.

## sidestream (stream1,...,streamN)

Pipes the incoming stream to many writable streams.  
remits the input stream.

``` js
  es.sidestream( //will log the stream to a file
    es.connect(
      es.mapSync(function (j) {return JSON.stringify(j) + '/n'}),
      fs.createWruteStream(file, {flags: 'a'})
    )
```

## merge (stream1,...,streamN)

Create a readable stream that merges many streams into one.

(Not implemented yet.)

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
  
-->
