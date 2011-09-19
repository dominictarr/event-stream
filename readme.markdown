# EventStream

[Streams](http://nodejs.org/api/streams.html "Stream") are node's best and most misunderstood idea,
_<em>EventStream</em>_ is a toolkit to make creating and working with streams <em>easy</em>.  

normally, streams are only used of IO,  
but in event stream we send all kinds of object down the pipe,  
if the input and output of your application are streams, why not make the throughput of your application into a stream?  

the `event-stream` functions resemble the the array functions,  
because Streams are like Arrays, but laid out in time, rather in memory.  

<em>All the `event-stream` functions return instances of `Stream`</em>

[nodejs.org/api/streams](http://nodejs.org/api/streams.html "Stream")

NOTE: I shall use the term <em>"through stream"</em> to refur to a stream that is both readable and writable.  

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
run it...

``` bash  
curl -sS registry.npmjs.org/event-stream | node pretty.js
```
 
[test are in event-stream_tests](https://github.com/dominictarr/event-stream_tests)

[node Stream documentation](http://nodejs.org/api/streams.html)

##map (asyncFunction)

create a through stream from an asyncronous function.  

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

>Note: if a callback is not called, `map` will think that it is still being processed,   
>every call must be answered or the stream will not know when to end.  
>
>also, if the callback is called more than once, every call but the first will be ignored.

##readArray (array)

create a readable stream from an Array.

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

## split ()

break up a stream and reassemble it so that each line is a chunk.  

example, read every line in a file

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

## connect (stream1,...,streamN)

connect multiple Streams together into one stream.  
`connect` will return a Stream. this stream will write to the first stream,
and will emit data from the last stream. 

listening for 'error' will recieve errors from all streams inside the pipe.

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

## duplex

take a writable stream, and a readable stream, and makes them appear as a readable writable stream.

it is assumed that the two streams are connected to each other in some way.  

(this is used by `connect`, and `child`.)

``` js
  var grep = cp.exec('grep Stream')

  es.duplex(grep.stdin, grep.stdout)
```

## child (child_process)

create a through stream from a child process

``` js
  var cp = require('child_process')

  es.child(cp.exec('grep Stream')) // a through stream

```

## pipeable (streamCreatorFunction,...)

the arguments to pipable must be a functions that return  
instances of Stream or async functions.  
(if a function is returned, it will be turned into a Stream  
with `es.map`.

here is the first example rewritten to use `pipeable`

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
## compatible modules

  * https://github.com/felixge/node-growing-file
    stream changes on file that is being appended to. just like `tail -f`

  * https://github.com/isaacs/sax-js
    streaming xml parser

  * `filter` pipeable string.replace
    https://github.com/tim-smart/node-filter

## almost compatible modules (1+ these issues)

https://github.com/fictorial/json-line-protocol/issues/1

https://github.com/jahewson/node-byline/issues/1



<!--
TODO, the following methods are not implemented yet.

## sidestream (stream1,...,streamN)

pipes the incoming stream to many writable streams.  
remits the input stream.

``` js
  es.sidestream( //will log the stream to a file
    es.connect(
      es.mapSync(function (j) {return JSON.stringify(j) + '/n'}),
      fs.createWruteStream(file, {flags: 'a'})
    )
```

## merge (stream1,...,streamN)

create a readable stream that merges many streams into one

(not implemented yet)

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