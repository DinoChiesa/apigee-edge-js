// common.js
// ------------------------------------------------------------------
//
// Description goes here....
//
// created: Sun Apr 30 19:30:27 2017
// last saved: <2017-May-01 09:52:01>

var assert = require('chai').assert;
var path = require('path');
var aej = require('../index.js');
var config = require('../testConfig.json');
var faker = require('faker');

global.assert = assert;
global.path = path;
global.aej = aej;
global.config = config;
global.faker = faker;
global.utility = aej.utility;
global.apigeeEdge = aej.edge;

function connectEdge(cb) {
  var options = Object.assign({}, config);
  //options.verbosity = 1;

  // var options = {
  //       mgmtServer: config.mgmtServer,
  //       org : config.org,
  //       user: config.user,
  //       password: config.password,
  //       verbosity: config.verbosity
  //     };
  apigeeEdge.connect(options, function(e, org){
    assert.isNull(e, JSON.stringify(e));
    //utility.logWrite('Connected...');
    cb(org);
  });
}

exports.connectEdge = connectEdge;
exports.testTimeout = 15000;
