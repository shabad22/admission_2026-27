var testCases = [
  {records:{a:{b:{c:{d:[1,2,3]}}}}},
  {records:{a:{b:{c:{d:[1]}}}}},
  {records:{a:{b:{c:{d:[1,2]}}}}},
  {records:{a:{b:{c:{d:["1","P"]}}}}},
  {records:{a:{b:{c:{d:[["1","P"]]}}}}},
  {records:{TestClass:{20260802:{lect1:{rolls:[["123","P"],["456","A"]]}}}}}
];

testCases.forEach(function(tc) {
  var s = JSON.stringify(tc);
  console.log(s.length + ' bytes: ' + s);
});