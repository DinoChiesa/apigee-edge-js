// sharedflow.js
// ------------------------------------------------------------------
//
// Tests for Sharedflow operations.
//
// created: Sat Apr 29 09:17:48 2017
// last saved: <2017-August-08 17:14:10>

var common = require('./common');
var fs = require('fs');
//var path = require('path');

describe('Sharedflow', function() {
  var resourceDir = "./test/resources";
  var dateVal = new Date().valueOf();
  var contrivedNamePrefix = 'apigee-edge-js-test-' + dateVal;

  this.timeout(common.testTimeout);
  common.connectEdge(function(edgeOrg){

    describe('import-from-zip', function() {
      var zipFileList;
      var envList;

      before(function(done){
        var actualPath = path.resolve(resourceDir);
        fs.readdir(actualPath, function(e, items) {
          assert.isNull(e, "error getting zips: " + JSON.stringify(e));
          var re = new RegExp('^sharedflow-.+\.zip$');
          items = items.filter(function(item){ return item.match(re);});
          zipFileList = items.map(function(item){ return path.resolve( path.join(resourceDir, item));});
          edgeOrg.environments.get(function(e, result) {
            assert.isNull(e, "error listing: " + JSON.stringify(e));
            envList = result;
            done();
          });
        });
      });

      it('should import sharedflow zips into an org', function(done) {
        this.timeout(15000);
        var numDone = 0;
        zipFileList.forEach(function(zip){
          var contrivedName = contrivedNamePrefix + '-' + faker.random.alphaNumeric(12);
          edgeOrg.sharedflows.importFromZip({name:contrivedName, zipArchive:zip}, function(e, result){
            assert.isNull(e, "error importing zip: " + JSON.stringify(e));
            numDone++;
            if (numDone == zipFileList.length) {
              done();
            }
          });
        });
      });

      it('should import sharedflow zips via the simple method', function(done) {
        this.timeout(15000);
        var numDone = 0;
        zipFileList.forEach(function(zip){
          var contrivedName = contrivedNamePrefix + '-simple-' + faker.random.alphaNumeric(12);
          edgeOrg.sharedflows.import({name:contrivedName, source:zip}, function(e, result){
            assert.isNull(e, "error importing zip: " + JSON.stringify(e));
            numDone++;
            if (numDone == zipFileList.length) {
              done();
            }
          });
        });
      });

      it('should delete test sharedflows previously imported into this org', function(done) {
        var numDone = 0;
        edgeOrg.sharedflows.get({}, function(e, sharedflows){
          assert.isNull(e, "error getting sharedflows: " + JSON.stringify(e));
          assert.isAbove(sharedflows.length, 1, "length of SF list");
          sharedflows.forEach(function(sf) {
            if (sf.startsWith(contrivedNamePrefix)) {
              edgeOrg.sharedflows.del({name:sf}, function(e, proxies){
                assert.isNull(e, "error deleting sharedflow: " + JSON.stringify(e));
              });
            }
          });
          done();
        });
      });
    });

    describe('get', function() {
      var sharedFlowList;
      before(function(done){
        edgeOrg.sharedflows.get({}, function(e, result){
          assert.isNull(e, "error getting sharedflows: " + JSON.stringify(e));
          assert.isAbove(result.length, 1, "length of sharedflow list");
          sharedFlowList = result;
          done();
        });
      });

      it('should list all sharedflows for an org', function(done) {
        edgeOrg.sharedflows.get({}, function(e, result){
          assert.isNull(e, "error getting sharedflows: " + JSON.stringify(e));
          assert.isAbove(result.length, 1, "length of sharedflow list");
          done();
        });
      });

      it('should get one sharedFlow', function(done) {
        if (sharedFlowList && sharedFlowList.length > 0) {
        var ix = Math.floor(Math.random() * sharedFlowList.length);
        edgeOrg.sharedflows.get({name:sharedFlowList[ix]}, function(e, result){
          assert.isNull(e, "error getting sharedflow: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          assert.equal(sharedFlowList[ix], result.name, "sharedflow name");
          done();
        });
        }
      });

      it('should fail to get a non-existent sharedflow', function(done) {
        var fakeName = 'sharedflow-' + faker.random.alphaNumeric(23);
        edgeOrg.sharedflows.get({name:fakeName}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
