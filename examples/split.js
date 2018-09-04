var es = require('..')

process.stdin
    .pipe(es.split())
    .on('data', function (data) {
        console.log('data: ' + data)
    })

// cat data | node map.js 
// data: {"foo": 1}
// data: {"foo": 2}
// data: {"foo": 3, "bar": "test"}