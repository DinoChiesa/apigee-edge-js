// maskconfig.js
// ------------------------------------------------------------------
//
// Tests for Maskconfig operations.
//
// Copyright 2019-2022 Google LLC.
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

/* global describe, faker, it, before, after */

var common = require('./common');

if ( ! config.apigeex) {
  describe('Maskconfig', function() {
    this.timeout(common.testTimeout);
    this.slow(common.slowThreshold);
    common.connectApigee(function(org) {
      const num = faker.random.number(),
      word = faker.lorem.word();
      //Name = "apigee-edge-js-test-" + word + '-' + num;
      var originalDefaultMaskconfig = null;

      before(function(done) {
        org.maskconfigs.get({}, function(e, result){
          if (result.length == 0) { return done(); }
          if (result.indexOf('default') < 0) { return done(); }
          org.maskconfigs.get({name:'default'})
            .then( result => {
              originalDefaultMaskconfig = result;
              done();
            });
        });
      });

      after(function(done) {
        const apply = () =>
        org.maskconfigs.set(originalDefaultMaskconfig)
          .then( result => {
            done();
          });
        if ( ! originalDefaultMaskconfig) { return done(); }
        org.maskconfigs.get({}, function(e, result){
          if (result.length == 0) { return apply(); }
          if (result.indexOf('default') < 0) { return apply(); }
          org.maskconfigs.del({name:'default'}, function(e, result){
            assert.isNull(e, "error deleting: " + JSON.stringify(e));
            apply();
          });
        });
      });


      describe('reset', function() {
        it('should clear the default maskconfig from the org if necessary', function(done) {
          org.maskconfigs.get({}, function(e, result){
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            if (result.length == 0) { return done(); }
            if (result.indexOf('default') < 0) { return done(); }
            org.maskconfigs.del({name:'default'}, function(e, result){
              assert.isNull(e, "error deleting: " + JSON.stringify(e));
              done();
            });
          });
        });

        it('should verify that there is no default maskconfig in the org', function(done) {
          org.maskconfigs.get({name:'default'})
            .then( () => assert.fail('should not be reached') )
            .catch( reason =>
                    assert.equal(reason.result.code, "distribution.DebugMaskConfigurationNotFound") )

            .finally (done);
        });

      });

      describe('set', function() {
        var desiredMaskConfig0 = {
              "name" : "default",
              "namespaces" : [ {
                "prefix" : "emp",
                "value" : "https://example.com"
              } ],
              "xPathsRequest" : [ "/emp:employee/emp:name" ]
            };

        it('should set a maskconfig for the org', function(done) {
          org.maskconfigs.set(desiredMaskConfig0, function(e, result){
            assert.isNull(e, "error setting: " + JSON.stringify(e));
            done();
          });
        });

        it('should verify the desired maskconfig for the org', function(done) {
          org.maskconfigs.get({name:'default'}, function(e, result){
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.equal(JSON.stringify(result), JSON.stringify(desiredMaskConfig0));
            done();
          });
        });

      });

      describe('set-shorthand-xml', function() {
        var shorthandXml = {
              "name" : "default",
              "namespaces" : [ {
                "prefix" : "emp",
                "value" : "https://example.com"
              } ],
              "xpath" : [ "/emp:employee/emp:name" ]
            };

        it('should set a maskconfig for the org using shorthand xml', function(done) {
          org.maskconfigs.del({name:'default'}, function(e, result){
            assert.isNull(e, "error deleting: " + JSON.stringify(e));
            org.maskconfigs.set(shorthandXml, function(e, result){
              assert.isNull(e, "error setting: " + JSON.stringify(e));
              done();
            });
          });
        });

        var shorthandXmlExpanded = {
              "name" : "default",
              "namespaces" : [ {
                "prefix" : "emp",
                "value" : "https://example.com"
              } ],
              "xPathsFault" : [ "/emp:employee/emp:name" ],
              "xPathsRequest" : [ "/emp:employee/emp:name" ],
              "xPathsResponse" : [ "/emp:employee/emp:name" ]
            };

        it('should verify the desired maskconfig for the org', function(done) {
          org.maskconfigs.get({name:'default'}, function(e, result){
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.equal(JSON.stringify(result), JSON.stringify(shorthandXmlExpanded));
            done();
          });
        });

      });

      describe('set-shorthand-json', function() {
        var shorthandJson = {
              "name" : "default",
              "json" : [ "$.field1", "$.field2" ]
            };

        it('should set a maskconfig for the org using shorthand json', function(done) {
          org.maskconfigs.del({name:'default'}, function(e, result){
            assert.isNull(e, "error deleting: " + JSON.stringify(e));
            org.maskconfigs.set(shorthandJson, function(e, result){
              assert.isNull(e, "error setting: " + JSON.stringify(e));
              done();
            });
          });
        });

        var shorthandJsonExpanded = {
              "name" : "default",
              jSONPathsFault:["$.field1","$.field2"],
              jSONPathsRequest:["$.field1","$.field2"],
              jSONPathsResponse:["$.field1","$.field2"]
            };

        it('should verify the desired maskconfig for the org', function(done) {
          org.maskconfigs.get({name:'default'}, function(e, result){
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.equal(JSON.stringify(result, Object.keys(result).sort()),
                         JSON.stringify(shorthandJsonExpanded, Object.keys(shorthandJsonExpanded).sort()));
            done();
          });
        });

      });

      describe('set-variables', function() {
        var variablesMask = {
              "name" : "default",
              "variables" : [ "request.header.authorization", "request.queryparam.foo" ]
            };

        it('should set a maskconfig for the org for variables', function(done) {
          org.maskconfigs.del({name:'default'}, function(e, result){
            assert.isNull(e, "error deleting: " + JSON.stringify(e));
            org.maskconfigs.set(variablesMask, function(e, result){
              assert.isNull(e, "error setting: " + JSON.stringify(e));
              done();
            });
          });
        });

        it('should verify the desired maskconfig for the org', function(done) {
          org.maskconfigs.get({name:'default'}, function(e, result){
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.equal(JSON.stringify(result, Object.keys(result).sort()),
                         JSON.stringify(variablesMask, Object.keys(variablesMask).sort()));
            done();
          });
        });

      });

      // TODO: tests for proxy-based maskconfigs
      // Need to import a dummy proxy and then remove it after the test run.

    });


  });
}
