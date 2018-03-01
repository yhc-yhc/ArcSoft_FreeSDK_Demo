var obj = {
	a: 1,
	b: 2,
	c: 3
}

var obj1 = obj 
var obj2 = obj 
console.log(obj, obj1, obj2)

obj.a = 2
console.log(obj, obj1, obj2)
