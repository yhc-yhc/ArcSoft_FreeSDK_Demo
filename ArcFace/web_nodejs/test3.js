var ref = require('ref')
var StructType = require('ref-struct')
 
// define the time types 
var time_t = ref.types.int
var suseconds_t = ref.types.int
 
// define the "timeval" struct type 
var timeval = StructType({
  a: time_t,
  b: suseconds_t
})
 
// now we can create instances of it 
var tv = new timeval
tv.a = 1
tv.b = 2
console.log(tv.a, tv.b, tv)


