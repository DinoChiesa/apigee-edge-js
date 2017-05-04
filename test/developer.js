// developer.js
// ------------------------------------------------------------------
//
// Tests for Developer operations.
//
// created: Sat Apr 29 09:17:48 2017
// last saved: <2017-May-03 21:02:36>

var common = require('./common');

describe('Developer', function() {
  this.timeout(common.testTimeout);
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

    describe('create', function() {
      it('should create a developer', function(done) {
        edgeOrg.developers.create(options, function(e, result){
          assert.isNull(e, "error creating: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          done();
        });
      });

      it('should fail to create a developer', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.developerEmail;
        edgeOrg.developers.create(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });
    });

    describe('delete', function() {
      it('should delete a developer', function(done) {
        edgeOrg.developers.del({developerEmail:options.developerEmail}, function(e, result){
          assert.isNull(e, "error deleting: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          done();
        });
      });

      it('should fail to delete a developer because no email was specified', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.developerEmail;
        edgeOrg.developers.del(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });
      it('should fail to delete a non-existent developer', function(done) {
        let badOptions = Object.assign({}, options);
        badOptions.developerEmail = faker.random.alphaNumeric(22) + "@apigee-edge-js-test.org";
        edgeOrg.developers.del(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
