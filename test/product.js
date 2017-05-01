// product.js
// ------------------------------------------------------------------
//
// tests for API Product.
//
// created: Sat Apr 29 09:17:48 2017
// last saved: <2017-May-01 09:46:11>

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

    describe('create-success', function() {
      it('should create an apiproduct', function(done) {
        edgeOrg.products.create(options, function(e, result){
          assert.isNull(e, "error creating: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          done();
        });
      });
    });

    describe('create-fail', function() {
      it('should fail to create an apiproduct', function(done) {
        let badOptions = Object.assign({}, options);
        delete badOptions.productName;
        edgeOrg.products.create(badOptions, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });
    });

    describe('delete-success', function() {
      it('should delete an apiproduct', function(done) {
        edgeOrg.products.del({productName:productName}, function(e, result){
          assert.isNull(e, "error deleting: " + JSON.stringify(e));
          //utility.logWrite(JSON.stringify(result, null, 2));
          done();
        });
      });
    });

    describe('delete-fail', function() {
      it('should fail to delete a non-existent apiproduct', function(done) {
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
