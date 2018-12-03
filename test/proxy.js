// proxy.js
// ------------------------------------------------------------------
//
// Tests for API Proxy operations.
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
// last saved: <2018-December-03 09:25:23>

/* global describe, faker, it, path, before */

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

      it('should import proxy zips into an org', function(done){
        this.timeout(65000);
        var numDone = 0;
        zipFileList.forEach(function(zip){
          var contrivedName = contrivedNamePrefix + '-fromzip-' + faker.random.alphaNumeric(12);
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

      it('should import proxy zips via the simple method', function(done){
        this.timeout(65000);
        var numDone = 0;
        zipFileList.forEach(function(zip){
          var contrivedName = contrivedNamePrefix + '-fromzip-simple-' + faker.random.alphaNumeric(12);
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

      it('should delete test proxies previously imported into this org', function(done){
        this.timeout(25000);
        var numDone = 0, L = 0;
        var tick = function() { if (++numDone >= L) { done(); } };
        edgeOrg.proxies.get({}, function(e, proxies){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(proxies.length, 1, "length of proxy list");
          L = proxies.length;
          proxies.forEach(function(proxy) {
            if (proxy.startsWith(contrivedNamePrefix +'-fromzip-')) {
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


    describe('import-from-dir', function() {
      var apiproxyBundleDirList;
      this.timeout(65000);

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

      it('should import exploded proxy dirs into an org', function(done){
        this.timeout(65000);
        var numDone = 0;
        apiproxyBundleDirList.forEach(function(dir){
          //console.log('dir: %s', dir);
          var contrivedName = contrivedNamePrefix + '-fromdir-' + faker.random.alphaNumeric(12);
          edgeOrg.proxies.importFromDir({name:contrivedName, source:dir}, function(e, result){
            if (e) { console.log(JSON.stringify(result, null, 2) + '\n'); }
            assert.isNull(e, "error importing dir: " + JSON.stringify(e));
            numDone++;
            if (numDone >= apiproxyBundleDirList.length) { done(); }
          });
        });
      });

      it('should import exploded proxy dirs via the simple method', function(done){
        var numDone = 0;
        apiproxyBundleDirList.forEach(function(dir){
          //console.log('dir: %s', dir);
          var contrivedName = contrivedNamePrefix + '-fromdir-simple-' + faker.random.alphaNumeric(12);
          edgeOrg.proxies.import({name:contrivedName, source:dir}, function(e, result){
            if (e) { console.log(JSON.stringify(result, null, 2) + '\n'); }
            assert.isNull(e, "error importing dir: " + JSON.stringify(e));
            numDone++;
            if (numDone == apiproxyBundleDirList.length) { done(); }
          });
        });
      });

      it('should delete test proxies previously imported into this org', function(done){
        this.timeout(25000);
        var numDone = 0, L = 0;
        var tick = function() { if (++numDone >= L) { done(); } };
        edgeOrg.proxies.get({}, function(e, proxies){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(proxies.length, 1, "length of proxy list");
          L = proxies.length;
          proxies.forEach(function(proxy) {
            if (proxy.startsWith(contrivedNamePrefix + '-fromdir-')) {
              edgeOrg.proxies.del({name:proxy}, function(e, proxies){
                if (e) { console.log('error %s', JSON.stringify(proxies, null, 2)); }
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


      it('should list all proxies for an org', function(done){
        edgeOrg.proxies.get({}, function(e, result){
          assert.isNull(e, "error getting proxies: " + JSON.stringify(e));
          assert.isAbove(result.length, 1, "length of proxy list");
          done();
        });
      });


      it('should get one proxy', function(done){
        assert.isTrue(proxyList && proxyList.length>0);
        var ix = Math.floor(Math.random() * proxyList.length);
        edgeOrg.proxies.get({name:proxyList[ix]}, function(e, result){
          if (e) { console.log('error %s', JSON.stringify(result, null, 2)); }
          assert.isNull(e, "error getting proxy: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          assert.equal(proxyList[ix], result.name, "proxy name");
          done();
        });
      });

      it('should export a few proxies', function(done){
        var numWanted = 4;
        var numDone = 0;
        var cb = function(e, result) {
              assert.isNull(e, "error exporting proxy: " + JSON.stringify(e));
              //utility.logWrite(JSON.stringify(result, null, 2));
              assert.isTrue(result.filename.startsWith('apiproxy-'), "file name");
              if (++numDone >= numWanted) { done(); }
            };
        assert.isTrue(proxyList && proxyList.length>0);
        for(var i = 0; i<numWanted; i++) {
          var ix = Math.floor(Math.random() * proxyList.length);
          edgeOrg.proxies.export({name:proxyList[ix]}, cb);
        }
      });

      it('should fail to get a non-existent proxy', function(done){
        var fakeName = 'proxy-' + faker.random.alphaNumeric(23);
        edgeOrg.proxies.get({name:fakeName}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
