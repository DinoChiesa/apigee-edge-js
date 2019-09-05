// promiseWrap.js
// ------------------------------------------------------------------

/* jshint esversion: 8, node: true, strict:false */

// wrap a nodeback fn with a Promise
module.exports = function edgeFunction(fn) {
  return function() {
     // collection refers to Developers, Products, etc
    const collection = this;
    const args = [].slice.call(arguments);

    // callback flavor
    if (typeof args[args.length - 1] == 'function') {
      return fn.apply(collection, args);
    }

    // promise flavor
    return new Promise ( (resolve, reject) => {
      // add a cb; within *that*, invoke the orig cb if non-null
      [].push.call(args, function wrapperCallback(e, result) {
        if (e) {
          //console.log('iserror');
          if (e.error) {
            reject(e.error, result || {});
          }
          else {
            e.result = result;
            reject(e);
          }
        }
        else {
          //console.log('no error');
          resolve(result);
        }
      });
      fn.apply(collection, args);
    });

    // // pop the existing callback, if any.
    // const maybeCallback = typeof args[args.length - 1] == 'function' && args.pop();
    //
    // return new Promise ( (resolve, reject) => {
    //   // add a cb; within *that*, invoke the orig cb if non-null
    //   [].push.call(args, function wrapperCallback(e, result) {
    //     if (maybeCallback) {
    //       //console.log('iserror? ' + e);
    //       //console.log('result? ' + JSON.stringify(result));
    //       maybeCallback(e, result);
    //       return resolve({});
    //     }
    //     // cannot always use Object.assign(), because the result may be an array.
    //     // also, do not wrap error in error.
    //     if (e) {
    //       //console.log('e instanceof Error? :%s',  e instanceof Error);
    //       if (e instanceof Error) {
    //         reject({error: e, result: result || {}});
    //       }
    //       else if (e.error) {
    //         reject(Object.assign(e, result || {}));
    //         //resolve(Object.assign(e, result || {}));
    //       }
    //       else {
    //         //console.log('something else bad?');
    //         reject({error: e, result: result || {}});
    //         //resolve({error: e, result: result || {}});
    //       }
    //     }
    //     else { resolve(result); } // possibly an array
    //   } );
    //   fn.apply(collection, args);
    // });


  };
};
