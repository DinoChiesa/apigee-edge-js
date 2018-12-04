// sharedflow.js
// ------------------------------------------------------------------
//
// Tests for Sharedflow operations.
//
// Copyright 2017 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// created: Sat Apr 29 09:17:48 2017
// last saved: <2018-December-04 12:51:15>

/* global describe, faker, it, path, before */

const common = require('./common'),
      fs = require('fs');

describe('Sharedflow', function() {
  const resourceDir = "./test/resources",
        dateVal = new Date().valueOf(),
        contrivedNamePrefix = 'apigee-edge-js-test-' + dateVal;

  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);
  common.connectEdge(function(edgeOrg){

    describe('sf-import-from-zip-and-get', function() {
      var sharedFlowList;
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
          var contrivedName = contrivedNamePrefix + '-fromzip-' + faker.random.alphaNumeric(12);
          edgeOrg.sharedflows.importFromZip({name:contrivedName, zipArchive:zip}, function(e, result){
            assert.isNull(e, "error importing zip: " + JSON.stringify(e));
            numDone++;
            if (numDone == zipFileList.length) { done(); }
          });
        });
      });

      it('should import sharedflow zips via the simple method', function(done) {
        this.timeout(15000);
        var numDone = 0;
        zipFileList.forEach(function(zip){
          var contrivedName = contrivedNamePrefix + '-fromzip-simple-' + faker.random.alphaNumeric(12);
          edgeOrg.sharedflows.import({name:contrivedName, source:zip}, function(e, result){
            assert.isNull(e, "error importing zip: " + JSON.stringify(e));
            numDone++;
            if (numDone == zipFileList.length) { done(); }
          });
        });
      });

      it('should list all sharedflows for an org', function(done) {
        edgeOrg.sharedflows.get({}, function(e, result){
          assert.isNull(e, "error getting sharedflows: " + JSON.stringify(e));
          assert.isDefined(result.length, "sharedflow list");
          assert.isAbove(result.length, 1, "length of sharedflow list");
          sharedFlowList = result;
          done();
        });
      });

      it('should get one randomly-selected sharedFlow', function(done) {
        assert.isTrue(sharedFlowList && sharedFlowList.length>0);
        var ix = Math.floor(Math.random() * sharedFlowList.length);
        edgeOrg.sharedflows.get({name:sharedFlowList[ix]}, function(e, result){
          assert.isNull(e, "error getting sharedflow: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          assert.equal(sharedFlowList[ix], result.name, "sharedflow name");
          done();
        });
      });

      it('should export a few sharedflows', function(done) {
        var numWanted = 4;
        var numDone = 0;
        var cb = function(e, result) {
              assert.isNull(e, "error exporting sharedflow: " + JSON.stringify(e));
              //utility.logWrite(JSON.stringify(result, null, 2));
              assert.isTrue(result.filename.startsWith('sharedflow-'), "file name");
              if (++numDone >= numWanted) { done(); }
            };
        assert.isTrue(sharedFlowList && sharedFlowList.length>0);
        for(var i = 0; i<numWanted; i++) {
          // the selected item may be repeated
          var ix = Math.floor(Math.random() * sharedFlowList.length);
          edgeOrg.sharedflows.export({name:sharedFlowList[ix]}, cb);
        }
      });

      it('should fail to get a non-existent sharedflow', function(done) {
        var fakeName = 'sharedflow-' + faker.random.alphaNumeric(23);
        edgeOrg.sharedflows.get({name:fakeName}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should delete test sharedflows previously imported into this org', function(done) {
        var numDone = 0, L = 0;
        var tick = function() { if (++numDone >= L) { done(); } };
        edgeOrg.sharedflows.get({}, function(e, sharedflows){
          assert.isNull(e, "error getting sharedflows: " + JSON.stringify(e));
          assert.isAbove(sharedflows.length, 1, "length of SF list");
          L = sharedflows.length;
          sharedflows.forEach(function(sf) {
            if (sf.startsWith(contrivedNamePrefix + '-fromzip-')) {
              edgeOrg.sharedflows.del({name:sf}, function(e, proxies){
                assert.isNull(e, "error deleting sharedflow: " + JSON.stringify(e));
                tick();
              });
            }
            else { tick(); }
          });
        });
      });
    });

    // describe('get', function() {
    //
    //   before(function(done){
    //     edgeOrg.sharedflows.get({}, function(e, result){
    //       assert.isNull(e, "error getting sharedflows: " + JSON.stringify(e));
    //       assert.isDefined(result.length, "sharedflow list");
    //       assert.isAbove(result.length, 1, "length of sharedflow list");
    //       sharedFlowList = result;
    //       done();
    //     });
    //   });
    //
    //
    // });

  });


});
