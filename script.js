var count = fy(function(b) {
	var s = 0;
	for (var i = 0; i < b; i++) {
		s+=i;
	}
	return s;
});

function square() {
	return s*s;
}

console.log(count(10)); // => 45
console.log(count.get());
console.log(count.modifyLines(-1, 1, square));
console.log(count(10));