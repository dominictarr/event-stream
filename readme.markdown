# EventStream

[Streams](http://nodejs.org/api/streams.html "Stream") are node's best and most misunderstood idea,
_<em>EventStream</em>_ is a toolkit to make creating and working with streams <em>easy</em>.  

normally, streams are only used of IO,  
but in event stream we send all kinds of object down the pipe,  
so you can organize your whole application around them!  

the `event-stream` functions resemble the the array functions,  
because Streams are like Arrays, but laid out in time, rather in memory.  

<em>All the `event-stream` functions return instances of `Stream`</em>

[nodejs.org/api/streams](http://nodejs.org/api/streams.html "Stream")

NOTE: I shall use the term <em>through stream</em> to refur to a stream that is both writable and readable.

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
  
//curl -sS registry.npmjs.org/event-stream | node pretty.js

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

>Note: if a callback is not called map will think that it is still being worked on,   
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
`connect` will return a Stream. Writing to the pipe will write to the first stream,
the pipe will emit data from the last stream. 

listening for 'error' will recieve errors from all streams inside the pipe.

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

## duplex

take a writable stream, and a readable stream, and makes them appear as a readable writable stream. 

``` js
  var grep = cp.exec('grep Stream')

  es.duplex(grep.stdin, grep.stdout)
```

## child (child_process)

create a through stream from a child process

``` js
  var cp = require('child_process')

  es.child(cp.exec('grep Stream')) // a throu

```

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

# TODO

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
    