// promiseWrap.js
// ------------------------------------------------------------------

/* jshint esversion: 6, node: true, strict:false */

// wrap a nodeback fn with a Promise
module.exports = function edgeFunction(fn) {
  return function() {
     // collection refers to Developers, Products, etc
    const collection = this;
    const args = [].slice.call(arguments);

    // pop the existing callback, if any.
    const maybeCallback = typeof args[args.length - 1] == 'function' && args.pop();

    return new Promise ( (resolve, reject) => {
      // add a cb; within *that*, invoke the orig cb if non-null
      [].push.call(args, function wrapperCallback(e, result) {
        if (maybeCallback) {
          maybeCallback(e, result);
        }
        // cannot always use Object.assign(), because the result may be an array.
        // also, do not wrap error in error.
        if (e) {
          if (e.error) { resolve(Object.assign(e, result || {}));}
          else { resolve({error: e, result: result || {}}); }
        }
        else { resolve(result); } // possibly an array
      } );
      fn.apply(collection, args);
    });
  };
};
