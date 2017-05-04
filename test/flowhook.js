// flowhook.js
// ------------------------------------------------------------------
//
// tests for Flowhooks
//
// created: Sat Apr 29 09:17:48 2017
// last saved: <2017-May-03 22:13:11>

var common = require('./common');

describe('Flowhook', function() {
  
  this.timeout(common.testTimeout) ;
  
  common.connectEdge(function(edgeOrg){

    //utility.logWrite('FLOWHOOKS');
    describe('fails', function() {
      it('should fail to list flowhooks', function(done) {
        edgeOrg.flowhooks.get({}, function(e, result){
          assert.isNotNull(e, "expected error is missing");
          assert.equal(e, "Error: missing option: environment");
          done();
        });
      });
    });

   describe('get/list', function() {
     this.timeout(common.testTimeout);
     
     var combinations = []; // = ['test', 'prod'];
     before(function(done){
       edgeOrg.environments.get(function(e, result) {
         assert.isNull(e, "error listing: " + JSON.stringify(e));
         envlist = result;
         var numDone = 0;
         result.forEach(function(env){
           edgeOrg.flowhooks.get({environment:env}, function(e, result) {
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
         edgeOrg.flowhooks.get({environment:env}, function(e, result) {
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
           edgeOrg.flowhooks.get({environment:env, name:hook}, function(e, result) {
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
