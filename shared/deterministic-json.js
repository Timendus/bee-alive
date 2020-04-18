// A JSON.stringify that always represents objects the same way (sorted
// by key) and always represent numbers as their byte value (or else it
// will get rounded).
function stringify(obj) {
  return JSON.stringify(obj, JSONreplacer);
}
function JSONreplacer(key, value) {
  if (key && key[0] === "@") {
    return value;
  }
  if (value === undefined) {
    return value;
  } else if (value === null) {
    return value;
  } else if (Array.isArray(value)) {
    return value;
  } else if (typeof value === "object") {
    // Sort the keys of the object.
    var keys = Object.keys(value).sort();
    var r = {};
    for (var i = 0; i < keys.length; i++) {
      r[keys[i]] = value[keys[i]];
    }
    return r;
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    // // We need to make sure number values are not just
    // // rounded by 'toString', we need the absolute exact value.
    // // The EMCA specifications say it should be a double, so
    // // an 8-byte float.
    // var buffer = new ArrayBuffer(8);
    // var floatView = new Float64Array(buffer);
    // floatView[0] = value;
    // var intView = new Int32Array(buffer);
    // var a = intView[0];
    // var b = intView[1];
    // return {'@t':'f','@va':i,'@vb':b};
  }
  return value;
}

// Parses the output of JSONstringify.
function parse(str) {
  return JSON.parse(str, JSONreviver);
}
function JSONreviver(key, value) {
  // if (value !== null && typeof value === 'object') {
  // 	if (value['@t'] === 'f') {
  // 		var buffer = new ArrayBuffer(8);
  // 		var intView = new Int32Array(buffer);
  // 		intView[0] = value['@va'];
  // 		intView[1] = value['@vb'];
  // 		var floatView = new Float64Array(buffer);
  // 		return floatView[0];
  // 	}
  // }
  return value;
}

module.exports = {
  parse,
  stringify
}