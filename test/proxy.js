// proxy.js
// ------------------------------------------------------------------
//
// Tests for API Proxy operations.
//
// created: Sat Apr 29 09:17:48 2017
// last saved: <2017-August-08 17:12:52>

var common = require('./common');
var fs = require('fs');
//var path = require('path');

describe('Proxy', function() {
  var resourceDir = "./test/resources";
  var dateVal = new Date().valueOf();
  var contrivedNamePrefix = 'apigee-edge-js-test-' + dateVal;

  this.timeout(common.testTimeout);
  common.connectEdge(function(edgeOrg){

    describe('import-from-zip', function() {
      var zipFileList;

      before(function(done){
        var actualPath = path.resolve(resourceDir);
        fs.readdir(actualPath, function(e, items) {
          assert.isNull(e, "error getting zips: " + JSON.stringify(e));
          var re1 = new RegExp('^apiproxy-.+\.zip$');
          zipFileList = items
            .filter(item => item.match(re1) )
            .map(item => path.resolve( path.join(resourceDir, item)) );
          done();
        });
      });

      it('should import proxy zips into an org', function(done) {
        this.timeout(65000);
        var numDone = 0;
        zipFileList.forEach(function(zip){
          var contrivedName = contrivedNamePrefix + '-' + faker.random.alphaNumeric(12);
          edgeOrg.proxies.importFromZip({name:contrivedName, zipArchive:zip}, function(e, result){
            if (e) { console.log(JSON.stringify(result, null, 2) + '\n'); }
            assert.isNull(e, "error importing zip: " + JSON.stringify(e));
            numDone++;
            if (numDone == zipFileList.length) {
              done();
            }
          });
        });
      });

      it('should import proxy zips via the simple method', function(done) {
        this.timeout(65000);
        var numDone = 0;
        zipFileList.forEach(function(zip){
          var contrivedName = contrivedNamePrefix + '-simple-' + faker.random.alphaNumeric(12);
          edgeOrg.proxies.import({name:contrivedName, source:zip}, function(e, result){
            if (e) { console.log(JSON.stringify(result, null, 2) + '\n'); }
            assert.isNull(e, "error importing zip: " + JSON.stringify(e));
            numDone++;
            if (numDone == zipFileList.length) {
              done();
            }
          });
        });
      });

      it('should delete test proxies previously imported into this org', function(done) {
        this.timeout(25000);
        var numDone = 0;
        edgeOrg.proxies.get({}, function(e, proxies){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(proxies.length, 1, "length of proxy list");
          proxies.forEach(function(proxy) {
            if (proxy.startsWith(contrivedNamePrefix)) {
              edgeOrg.proxies.del({name:proxy}, function(e, proxies){
                assert.isNull(e, "error deleting proxy: " + JSON.stringify(e));
              });
            }
          });
          done();
        });
      });

    });


    describe('import-from-dir', function() {
      var apiproxyBundleDirList;

      before(function(done){
        var actualPath = path.resolve(resourceDir);
        fs.readdir(actualPath, function(e, items) {
          assert.isNull(e, "error getting dirs: " + JSON.stringify(e));
          var re2 = new RegExp('^(?!.*\.zip$)apiproxy-.+$');
          apiproxyBundleDirList = items
            .filter(item => item.match(re2) )
            .map(item => path.resolve( path.join(resourceDir, item)) );

          done();
        });
      });

      it('should import exploded proxy dirs into an org', function(done) {
        this.timeout(65000);
        var numDone = 0;
        apiproxyBundleDirList.forEach(function(dir){
          //console.log('dir: %s', dir);
          var contrivedName = contrivedNamePrefix + '-fromdir-' + faker.random.alphaNumeric(12);
          edgeOrg.proxies.importFromDir({name:contrivedName, source:dir}, function(e, result){
            if (e) { console.log(JSON.stringify(result, null, 2) + '\n'); }
            assert.isNull(e, "error importing dir: " + JSON.stringify(e));
            numDone++;
            if (numDone == apiproxyBundleDirList.length) {
              done();
            }
          });
        });
      });

      it('should import exploded proxy dirs via the simple method', function(done) {
        this.timeout(65000);
        var numDone = 0;
        apiproxyBundleDirList.forEach(function(dir){
          //console.log('dir: %s', dir);
          var contrivedName = contrivedNamePrefix + '-fromdir-simple-' + faker.random.alphaNumeric(12);
          edgeOrg.proxies.import({name:contrivedName, source:dir}, function(e, result){
            if (e) { console.log(JSON.stringify(result, null, 2) + '\n'); }
            assert.isNull(e, "error importing dir: " + JSON.stringify(e));
            numDone++;
            if (numDone == apiproxyBundleDirList.length) {
              done();
            }
          });
        });
      });

      it('should delete test proxies previously imported into this org', function(done) {
        var numDone = 0;
        edgeOrg.proxies.get({}, function(e, proxies){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(proxies.length, 1, "length of proxy list");
          proxies.forEach(function(proxy) {
            if (proxy.startsWith(contrivedNamePrefix)) {
              edgeOrg.proxies.del({name:proxy}, function(e, proxies){
                assert.isNull(e, "error deleting proxy: " + JSON.stringify(e));
              });
            }
          });
          done();
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
