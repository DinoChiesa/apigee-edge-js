// connect.js
// ------------------------------------------------------------------
//
// Description goes here....
//
// created: Sat Apr 29 10:16:13 2017
// last saved: <2017-April-30 17:12:18>

var assert = require('chai').assert;
var aej = require('../index.js');
var apigeeEdge = aej.edge;
var common = aej.utility;
var config = require('../testConfig.json');
var faker = require('faker');

describe('Connect', function() {
  describe('#success', function() {
    it('should connect to an org', function(done) {
      var options = {
            mgmtServer: config.mgmtServer,
            org : config.org,
            user: config.user,
            password: config.password
          };

      apigeeEdge.connect(options, function(e, org){
        assert.isNull(e);
        common.logWrite(org.conn);
        assert.equal(org.conn.org, config.org);
        done();
      });
    });
  });

  describe('#fail1', function() {
    it('should fail to connect to an org - wrong password', function(done) {
      var options = {
            mgmtServer: config.mgmtServer,
            org : config.org,
            user: config.user,
            password: faker.random.alphaNumeric(12)
          };

      apigeeEdge.connect(options, function(e, conn){
        assert.isNotNull(e, "the expected error did not occur");
        done(!e);
      });
    });

  });

  describe('#fail2', function() {
    it('should fail to connect to an org - unknown org', function(done) {
      var options = {
            mgmtServer: config.mgmtServer,
            org : faker.random.alphaNumeric(11),
            user: config.user,
            password: faker.random.alphaNumeric(16)
          };

      apigeeEdge.connect(options, function(e, conn){
        assert.isNotNull(e, "the expected error did not occur");
        done(!e);
      });
    });
  });

});
