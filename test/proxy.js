// proxy.js
// ------------------------------------------------------------------
//
// Tests for API Proxy operations.
//
// created: Sat Apr 29 09:17:48 2017
// last saved: <2017-April-30 19:46:35>

var common = require('./common');

describe('Proxy', function() {
  this.timeout(common.testTimeout);
  common.connectEdge(function(edgeOrg){

    describe('get-success', function() {
      var proxyList;

      it('should list all proxies for an org', function(done) {
        edgeOrg.proxies.get({}, function(e, result){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          assert.isAbove(result.length, 1, "length of proxy list");
          proxyList = result;
          done();
        });
      });


      it('should get one proxy', function(done) {
        var ix = Math.floor(Math.random() * proxyList.length);
        edgeOrg.proxies.get({proxy:proxyList[ix]}, function(e, result){
          assert.isNull(e, "error getting proxy: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          assert.equal(proxyList[ix], result.name, "proxy name");
          done();
        });
      });
    });

  });


});
