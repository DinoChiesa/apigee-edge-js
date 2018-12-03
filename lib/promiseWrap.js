// promiseWrap.js
// ------------------------------------------------------------------

/* jshint esversion: 6, node: true, strict:false */

// wrap a nodeback fn with a Promise
module.exports = function edgeFunction(fn) {
  return function() {
     // collection refers to Developers, Products, etc
    const collection = this;
    //console.log('type collection = ' + collection.constructor.name);
    const args = [].slice.call(arguments);

    // pop the existing callback, if any.
    const maybeCallback = typeof args[args.length - 1] == 'function' && args.pop();

    return new Promise ( (resolve, reject) => {
      // add a cb; within *that*, invoke the orig cb if non-null
      [].push.call(args, function wrapperCallback(e, result) {
        if (maybeCallback) {
          maybeCallback(e, result);
        }
        if (e) { resolve(e); } //not sure this is desired
        else { resolve(result); }
      } );
      fn.apply(collection, args);
    });
  };
};
