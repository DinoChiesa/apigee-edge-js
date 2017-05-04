// common.js
// ------------------------------------------------------------------
//
// Description goes here....
//
// created: Sun Apr 30 19:30:27 2017
// last saved: <2017-May-03 20:44:32>

var assert = require('chai').assert;
var path = require('path');
var aej = require('../index.js');
var faker = require('faker');
var sprintf = require('sprintf-js').sprintf;
var config = require('../testConfig.json');
// testConfig.json ought to look something like this:
//
// {
//   "mgmtServer" : "https://api.enterprise.apigee.com",
//   "org"        : "my-edge-org-name",
//   "netrc"      : true
// }
//
// or
// {
//   "mgmtServer" : "https://api.enterprise.apigee.com",
//   "org"        : "my-edge-org-name",
//   "user"       : "Dchiesa@google.com"
//   "password"   : "Secret-BB208846F523"
// }
//
// It can also have a verbosity flag. (truthy/falsy)
//

global.assert = assert;
global.path = path;
global.aej = aej;
global.config = config;
global.faker = faker;
global.sprintf = sprintf;
global.utility = aej.utility;
global.apigeeEdge = aej.edge;

function connectEdge(cb) {
  var options = Object.assign({}, config);
  //options.verbosity = 1;
  apigeeEdge.connect(options, function(e, org){
    assert.isNull(e, JSON.stringify(e));
    cb(org);
  });
}

exports.connectEdge = connectEdge;
exports.testTimeout = 15000;
