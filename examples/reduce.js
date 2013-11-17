var es = require("..")
  , initial = 0
  , reduceFn = function(acc, data) {
      return acc + data.length;
    }
  , input = ["tom", "joe", "bread", "candy"]

es.readArray(input)
  .pipe(es.reduce(reduceFn, initial))
  .on("data", function(length) {
      console.log("length: ", length);
    })