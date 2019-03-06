// traverseJson.js
// ------------------------------------------------------------------
//
// created: Wed Feb 20 09:02:36 2019
// last saved: <2019-February-20 09:31:45>

/* jshint esversion: 8, node: true */
/* global process, console, Buffer */

'use strict';

var pascalCasePattern = new RegExp("^([A-Z])([a-z]+)");

function pascalCaseToCamelCase(propname) {
  if (pascalCasePattern.test(propname)) {
    return propname.charAt(0).toLowerCase() + propname.slice(1);
  }
  else {
    return propname;
  }
}

function convertPropertyNames(obj, converterFn) {
  var r, value, t = Object.prototype.toString.apply(obj);

  if (t == "[object Object]") {
    r = {};
    for (var propname in obj) {
      value = obj[propname];
      r[converterFn(propname)] = convertPropertyNames(value, converterFn);
    }
    return r;
  }
  else if (t == "[object Array]") {
    r = [];
    for (var i=0, L=obj.length; i<L; ++i ) {
      value = obj[i];
      r[i] = convertPropertyNames(value, converterFn);
    }
    return r;
  }
  return obj;
}


var originalObject = {
    "IsSuccess": true,
    "ResponseDate": "2019-02-20T11:42:11.963Z",
    "Result": {
        "RecordCount": "abc123",
        "BillDetailsList": [
            {
                "SourceSystem": "Abc123",
                "BillAmount": "Abc123",
                "BillCreationDate": "2019-02-19T09:16:04Z"
            },
            {
                "SourceSystem": "abc123",
                "BillAmount": "XyzAbc",
                "BillCreationDate": "abc123"
            }
        ]
    }
    };

var converted = convertPropertyNames(originalObject, pascalCaseToCamelCase);
console.log('original: ' + JSON.stringify(originalObject, null, 2));
console.log('converted: ' + JSON.stringify(converted, null, 2));
