// proxy.js
// ------------------------------------------------------------------
//
// Tests for API Proxy operations.
//
// created: Sat Apr 29 09:17:48 2017
// last saved: <2017-May-04 10:15:45>

var common = require('./common');
var fs = require('fs');
//var path = require('path');

describe('Proxy', function() {
  var resourceDir = "./test/resources";
  var dateVal = new Date().valueOf();
  var contrivedNamePrefix = 'apigee-edge-js-test-' + dateVal;

  this.timeout(common.testTimeout);
  common.connectEdge(function(edgeOrg){

    describe('import', function() {
      var zipFileList;
      var envList;

      before(function(done){
        var actualPath = path.resolve(resourceDir);
        fs.readdir(actualPath, function(e, items) {
          assert.isNull(e, "error getting zips: " + JSON.stringify(e));
          var re = new RegExp('^apiproxy-.+\.zip$');
          items = items.filter(function(item){ return item.match(re);});
          zipFileList = items.map(function(item){ return path.resolve( path.join(resourceDir, item));});
          edgeOrg.environments.get(function(e, result) {
            assert.isNull(e, "error listing: " + JSON.stringify(e));
            envList = result;
            done();
          });
        });
      });

      it('should import proxy zips into an org', function(done) {
        var numDone = 0;
        zipFileList.forEach(function(zip){
          var contrivedName = contrivedNamePrefix + faker.random.alphaNumeric(12);
          edgeOrg.proxies.importFromZip({name:contrivedName, zipArchive:zip}, function(e, result){
            assert.isNull(e, "error importing zip: " + JSON.stringify(e));
            numDone++;
            if (numDone == zipFileList.length) {
              done();
            }
          });
        });
      });

      it('should delete test proxies previously imported into this org', function(done) {
        var numDone = 0;
        edgeOrg.proxies.get({}, function(e, proxies){
          function tick() {
            numDone++;
            if (numDone == proxies.length) {
              done();
            }
          }
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(proxies.length, 1, "length of proxy list");
          proxies.forEach(function(proxy) {
            if (proxy.startsWith(contrivedNamePrefix)) {
              edgeOrg.proxies.del({name:proxy}, function(e, proxies){
                assert.isNull(e, "error deleting proxy: " + JSON.stringify(e));
                tick();
              });
            }
            else {
              tick();
            }
          });
        });
      });

    });


    describe('get', function() {
      var proxyList;
      before(function(done){
        edgeOrg.proxies.get({}, function(e, result){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(result.length, 1, "length of proxy list");
          proxyList = result;
          done();
        });
      });


      it('should list all proxies for an org', function(done) {
        edgeOrg.proxies.get({}, function(e, result){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(result.length, 1, "length of proxy list");
          done();
        });
      });


      it('should get one proxy', function(done) {
        if (proxyList && proxyList.length>0) {
        var ix = Math.floor(Math.random() * proxyList.length);
        edgeOrg.proxies.get({name:proxyList[ix]}, function(e, result){
          assert.isNull(e, "error getting proxy: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          assert.equal(proxyList[ix], result.name, "proxy name");
          done();
        });
        }
      });

      it('should fail to get a non-existent proxy', function(done) {
        var fakeName = 'proxy-' + faker.random.alphaNumeric(23);
        edgeOrg.proxies.get({name:fakeName}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
