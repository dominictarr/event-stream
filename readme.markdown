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

an EventStream must: