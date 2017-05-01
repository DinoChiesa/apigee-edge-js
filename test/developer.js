// developer.js
// ------------------------------------------------------------------
//
// Tests for Developer operations.
//
// created: Sat Apr 29 09:17:48 2017
// last saved: <2017-April-30 19:39:09>

var common = require('./common');

describe('Developer', function() {
  this.timeout(15000);
  common.connectEdge(function(edgeOrg){

    var firstName = faker.name.firstName(); // Rowan
    var lastName = faker.name.lastName(); // Nikolaus
    var options = {
          developerEmail : lastName + '.' + firstName + "@apigee-edge-js-test.org",
          lastName : lastName,
          firstName : firstName,
          userName : firstName + lastName,
          attributes: { uuid: faker.random.uuid() }
        };

    describe('create-success', function() {
      it('should create a developer', function(done) {
        edgeOrg.developers.create(options, function(e, result){
          assert.isNull(e, "error creating: " + JSON.stringify(e));
          utility.logWrite(JSON.stringify(result, null, 2));
          done();
        });
      });
    });

    describe('create-fail', function() {
      it('should fail to create a developer', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.developerEmail;
        edgeOrg.developers.create(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });
    });

    describe('delete-success', function() {
      it('should delete a developer', function(done) {
        edgeOrg.developers.del({developerEmail:options.developerEmail}, function(e, result){
          assert.isNull(e, "error deleting: " + JSON.stringify(e));
          utility.logWrite(JSON.stringify(result, null, 2));
          done();
        });
      });
    });

    describe('delete-fail', function() {
      it('should fail to delete a developer', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.developerEmail;
        edgeOrg.developers.del(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
