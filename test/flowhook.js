// flowhook.js
// ------------------------------------------------------------------
//
// tests for Flowhooks
//
// Copyright 2017-2019 Google LLC
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
// last saved: <2021-March-22 17:24:02>

/* global describe, faker, it, path, before */

var common = require('./common');

describe('Flowhook', function() {

  this.timeout(common.testTimeout) ;
  this.slow(common.slowThreshold);

  common.connectApigee(function(org){

    describe('fails', function() {
      it('should fail to list flowhooks', function(done) {
        org.flowhooks.get({}, function(e, result){
          assert.isNotNull(e, "expected error is missing");
          assert.equal(e, "Error: missing required parameter: environment");
          done();
        });
      });
    });

   describe('get/list', function() {
     this.timeout(common.testTimeout);
     var combinations = [];
     before(function(done){
       org.environments.get(function(e, result) {
         assert.isNull(e, "error listing: " + JSON.stringify(e));
         var envlist = result;
         var numDone = 0;
         result.forEach(function(env){
           org.flowhooks.get({environment:env}, function(e, result) {
             numDone++;
             combinations.push([env, result]);
             if (numDone == envlist.length) {
               done();
             }
           });
         });
       });
     });

     it('should get the list of flowhooks for each environment', function(done) {
       var numDoneEnv = 0;
       combinations.forEach(function(combo) {
         var env = combo[0];
         assert.isNotNull(env, "error");
         org.flowhooks.get({environment:env}, function(e, result) {
           assert.isNull(e, "error listing: " + JSON.stringify(e));
           assert.isNotNull(result, "result is empty");
           assert.equal(result.length, 4, "unexpected number of hooks");
           numDoneEnv++;
           if (numDoneEnv == combinations.length) {
             done();
           }
         });
       });
     });

     it('should get individual flowhooks for each environment', function(done) {
       var numDoneEnv = 0;
       combinations.forEach(function(combo) {
         var env = combo[0], hooks = combo[1];
         assert.isNotNull(env, "error");
         var numDoneHooks = 0;
         hooks.forEach(function(hook) {
           org.flowhooks.get({environment:env, name:hook}, function(e, result) {
             assert.isNull(e, "error: " + JSON.stringify(e));
             assert.isNotNull(result, "error");
             numDoneHooks++;
             if (numDoneHooks == hooks.length) {
               numDoneEnv++;
               if (numDoneEnv == combinations.length) {
                 done();
               }
             }
           });
         });
       });
     });


   });

  });


});
