// product.js
// ------------------------------------------------------------------
//
// tests for API Product.
//
// Copyright 2017 Google Inc.
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
// last saved: <2017-December-08 13:19:02>

var common = require('./common');

describe('Product', function() {
  this.timeout(common.testTimeout);
  common.connectEdge(function(edgeOrg){

    var productName = "APIPROD-" + faker.random.alphaNumeric(12);
    var options = {
          productName : productName,
          approvalType: 'auto',
          attributes: {
            uuid: faker.random.uuid(),
            "tool" : path.basename(process.argv[1])
          }
        };

    describe('create', function() {
      it('should create an apiproduct', function(done) {
        edgeOrg.products.create(options, function(e, result){
          assert.isNull(e, "error creating: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          done();
        });
      });

      it('should fail to create an apiproduct', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.productName;
        edgeOrg.products.create(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });
    });

    describe('list', function() {
      it('should list apiproducts', function(done) {
        edgeOrg.products.get({}, function(e, result){
          assert.isNull(e, "error listing: " + JSON.stringify(e));
          assert.isNotNull(result, "result is empty");
          //utility.logWrite(JSON.stringify(result, null, 2));
          assert.isAtLeast(result.length, 1, "zero results.");
          done();
        });
      });

      it('should list apiproducts with no options', function(done) {
        edgeOrg.products.get(function(e, result){
          assert.isNull(e, "error listing: " + JSON.stringify(e));
          assert.isNotNull(result, "result is empty");
          assert.isAtLeast(result.length, 1, "zero results.");
          done();
        });
      });
    });

    describe('get', function() {
      it('should get a specific apiproduct', function(done) {
        //edgeOrg.conn.verbosity = 1;
        edgeOrg.products.get({name:productName}, function(e, result){
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          assert.isNotNull(result, "result is empty");
          assert.equal(result.name, productName, "name");
          done();
        });
      });

      it('should fail to get a non-existent apiproduct', function(done) {
        edgeOrg.products.get({name:faker.random.alphaNumeric(12)}, function(e, result){
          //utility.logWrite('result: ' + JSON.stringify(result));
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });
    });


    describe('delete', function() {
      this.timeout(15000);
      it('should delete an apiproduct', function(done) {
        edgeOrg.products.del({productName:productName}, function(e, result){
          assert.isNull(e, "error deleting: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          done();
        });
      });

      it('should fail to delete an apiproduct', function(done) {
        let badOptions = Object.assign({}, options);
        badOptions.productName = faker.random.alphaNumeric(12);
        edgeOrg.products.del(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('should fail to delete because no name was specified', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.productName;
        edgeOrg.products.del(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
