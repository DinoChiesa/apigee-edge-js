// resourcefile.js
// ------------------------------------------------------------------
//
// Tests for Resourcefile operations.
//
// Copyright 2019 Google LLC.
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

/* global describe, faker, it, path, before */


function selectRandomValue (a) {
  var L1 = a.length, n = Math.floor(Math.random() * L1);
  return a[n];
}

function selectRandomValidType() {
  return selectRandomValue(['.wsdl', '.jsc', '.xsd', '.xsl', '.java']);
}

function getRandomSubarray(arr, size) {
    var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(min);
}

describe('Resourcefile', function() {
  const common = require('./common'),
        num = faker.random.number(),
        resourceDir = "./test/resources/resourcefiles",
        word = faker.lorem.word(),
        sprintf = require('sprintf-js').sprintf,
        fs = require('fs'),
        specialPrefix = 'apigee-edgejs-test-';

  const readContentFromFilesystem = ({name, type}, cb) => {
          let fqpath = path.resolve(resourceDir, type, name);
          fs.stat(fqpath, function(e, stats) {
            if (e) { return cb(null); }
            return cb((stats.isFile()) ? fs.readFileSync(fqpath, 'utf8') : null);
          });
        };

  this.timeout(common.testTimeout);
  this.slow(common.slowThreshold);

  common.connectApigee(function(org) {
    let environments = [];
    let resourcefileDirs = {}; // hash of arrays
    let rf = org.resourcefiles;

    //org.conn.verbosity = 1;

    before(function(done) {
      org.environments.get(function(e, result) {
        assert.isNull(e, "error listing: " + JSON.stringify(e));
        environments = result.filter(e => e != 'portal');
        let numDone = 0, L = 0;

        const tick = function() { if (++numDone >= L) { done(); } };
        fs.readdir(path.resolve(resourceDir), function(e, items) {
          assert.isNull(e, "error getting resourcefile dirs: " + JSON.stringify(e));
          items = items
            .map(item => { return {item, fq:path.resolve( path.join(resourceDir, item)) };})
            .filter(d => fs.statSync(d.fq).isDirectory());
          L = items.length;
          items.forEach(d => {
            fs.readdir(path.resolve(d.fq), function(e, items) {
              resourcefileDirs[d.item] = items
                .filter( item => !item.endsWith('~') )
                .filter( item => fs.statSync(path.resolve( path.join(d.fq, item))).isFile());
              tick();
            });
          });
        });
      });
    });

    describe('reset', function() {

      it('delete any pre-existing test resourcefiles in each env', function(done) {
        let numDone = 0;
        let tock = () => { if (++numDone == environments.length) { done(); } };
        environments.forEach(function(environment) {
          rf.get({environment}, function(e, result) {
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            let numDone = 0, L = result.resourceFile.length;
            let tick = () => { if (++numDone == L) { tock(); } };
            if (L == 0) { tock(); }
            else {
              result.resourceFile.forEach( item => {
                if (item.name.startsWith(specialPrefix)) {
                  rf.del({...item, ...{environment}}, function(e, result) {
                    assert.isNull(e, "error deleting: " + JSON.stringify(e));
                    tick();
                  });
                }
                else {
                  tick();
                }
              });
            }
          });
        });
      });

      it('delete any pre-existing org-scoped test resourcefiles', function(done) {
        rf.get({}, function(e, result) {
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          let numDone = 0, L = result.resourceFile.length;
          let tick = () => { if (++numDone == L) { done(); } };
          if (L == 0) { done(); }
          else {
            result.resourceFile.forEach( item => {
              if (item.name.startsWith(specialPrefix)) {
                rf.del(item, function(e, result) {
                  assert.isNull(e, "error deleting: " + JSON.stringify(e));
                  tick();
                });
              }
              else {
                tick();
              }
            });
          }
        });
      });

    });


    describe('create', function() {

      it('create some resourcefiles in each env', function(done) {
        let numDone = 0;
        let bong = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(function(environment) {
          let keys = Object.keys(resourcefileDirs);
          let numDone = 0;
          let tock = () => { if (++numDone == keys.length) { bong(); } };

          keys.forEach(function (shortdir) {
            let fqdirpath = path.resolve(resourceDir, shortdir);
            let L = resourcefileDirs[shortdir].length, numDone = 0;
            let tick = () => { if (++numDone == L) { tock(); } };
            resourcefileDirs[shortdir].forEach( rsrcfile => {
              let filename = path.resolve(fqdirpath, rsrcfile);
              rf.create({filename, environment}, function(e, result) {
                assert.isNull(e, sprintf("error creating (%s): ", rsrcfile) + JSON.stringify(e));
                tick();
              });
            });
          });
        });
      });

      it('create some org-scoped resourcefiles', function(done) {
        let keys = Object.keys(resourcefileDirs);
        let numDone = 0;
        let tock = () => { if (++numDone == keys.length) { done(); } };

        keys.forEach(function (shortdir) {
          let fqdirpath = path.resolve(resourceDir, shortdir);
          let L = resourcefileDirs[shortdir].length, numDone = 0;
          let tick = () => { if (++numDone == L) { tock(); } };
          resourcefileDirs[shortdir].forEach( rsrcfile => {
            let filename = path.resolve(fqdirpath, rsrcfile);
            rf.create({filename}, function(e, result) {
              assert.isNull(e, sprintf("error creating (%s): ", rsrcfile) + JSON.stringify(e));
              tick();
            });
          });
        });
      });

      it('fail to create some env-scoped resourcefiles b/c file not exist', function(done) {
        let numDone = 0;
        let bong = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(function(environment) {
          let key = selectRandomValue(Object.keys(resourcefileDirs));
          let filename = path.resolve(resourceDir, key, faker.lorem.word(), resourcefileDirs[key][0]); // NOEXIST
          rf.create({filename, environment}, function(e, result) {
            assert.isNotNull(e, sprintf("error creating (%s): ", filename) + JSON.stringify(e));
            bong();
          });
        });
      });

      it('fail to create org-scoped resourcefiles b/c file not exist', function(done) {
        let keys = Object.keys(resourcefileDirs);
        let numDone = 0;
        let tock = () => { if (++numDone == keys.length) { done(); } };

        keys.forEach(function (shortdir) {
          let fqdirpath = path.resolve(resourceDir, shortdir);
          let L = resourcefileDirs[shortdir].length, numDone = 0;
          let tick = () => { if (++numDone == L) { tock(); } };
          resourcefileDirs[shortdir].forEach( rsrcfile => {
            let filename = path.resolve(fqdirpath, faker.lorem.word(), rsrcfile); // NOEXIST
            rf.create({filename}, function(e, result) {
              assert.isNotNull(e, sprintf("error creating (%s): ", filename) + JSON.stringify(e));
              tick();
            });
          });
        });
      });

      it('fail to create an env-scoped resourcefile with no filename', function(done) {
        let numDone = 0;
        let bong = () => { if (++numDone == environments.length) { done(); } };
        let badName = faker.lorem.word() +'1' + selectRandomValidType();
        //let typ = selectRandomValue(Object.keys(resourcefileDirs));
        //let rsrc = selectRandomValue(resourcefileDirs[typ]);
        //let filename = path.resolve(resourceDir, typ, rsrc);
        environments.forEach(function(environment) {
          rf.create({environment, name:badName}, function(e, result){
            assert.isNotNull(e, "the expected error did not occur");
            bong();
          });
        });
      });

      it('fail to create an org-scoped resourcefile with no filename', function(done) {
        let badName = faker.lorem.word() +'1' + selectRandomValidType();
        //let key = selectRandomValue(Object.keys(resourcefileDirs));
        //let filename = path.resolve(resourceDir, key, resourcefileDirs[key][0]);
        rf.create({name:badName}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('fail to create an env-scoped resourcefile b/c it already exists', function(done) {
        let numDone = 0;
        let tick = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(function(environment) {
          rf.get({environment}, function(e, result) {
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.isAbove(result.resourceFile.length, 0);
            let selected = selectRandomValue(result.resourceFile); // select one that already exists
            let typ = selectRandomValue(Object.keys(resourcefileDirs));
            let rsrc = selectRandomValue(resourcefileDirs[typ]);
            let filename = path.resolve(resourceDir, typ, rsrc);
            rf.create({...selected, ...{filename}, ...{environment}}, function(e, result) {
              assert.isNotNull(e, "unexpected success while creating");
              tick();
            });
          });
        });
      });

      it('fail to create an org-scoped resourcefile b/c it already exists', function(done) {
        rf.get({}, function(e, result) {
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          assert.isAbove(result.resourceFile.length, 0);
          let selected = selectRandomValue(result.resourceFile); // select one that already exists
          let typ = selectRandomValue(Object.keys(resourcefileDirs));
          let rsrc = selectRandomValue(resourcefileDirs[typ]);
          let filename = path.resolve(resourceDir, typ, rsrc);
          rf.create({...selected, ...{filename}}, function(e, result) {
            assert.isNotNull(e, "unexpected success while creating");
            done();
          });
        });
      });

      // Apparently, there is no such thing as an invalid type of resource.
      // it('fail to create an env-scoped resourcefile of invalid type', function(done) {
      //   let numDone = 0;
      //   let bong = () => { if (++numDone == environments.length) { done(); } };
      //   let badType = faker.lorem.word() +'1';
      //   let key = selectRandomValue(Object.keys(resourcefileDirs));
      //   console.log('selected key: ' + key);
      //   let filename = path.resolve(resourceDir, key, resourcefileDirs[key][0]);
      //   environments.forEach(function(env) {
      //     rf.create({environment:env, type:badType, filename}, function(e, result){
      //       console.log(e.stack);
      //       assert.isNotNull(e, "the expected error did not occur");
      //       bong();
      //     });
      //   });
      // });

      // Apparently, there is no such thing as an invalid type of resource.
      // it('fail to create an org-scoped resourcefile of invalid type', function(done) {
      //   let badType = faker.lorem.word() +'1';
      //   let key = selectRandomValue(Object.keys(resourcefileDirs));
      //   console.log('selected key: ' + key);
      //   let filename = path.resolve(resourceDir, key, resourcefileDirs[key][0]);
      //   rf.create({type:badType, filename}, function(e, result){
      //       console.log(e.stack);
      //     assert.isNotNull(e, "the expected error did not occur");
      //     done();
      //   });
      // });

    });


    describe('get', function() {

      it('list resourcefiles from each env', function(done) {
        var numDone = 0;
        let tick = () => { if (++numDone == environments.length) { done(); } };
        environments.forEach(function(environment) {
          rf.get({environment}, function(e, result){
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            assert.isAbove(result.resourceFile.length, -1);
            tick();
          });
        });
      });

      it('get some particular resourcefiles from each env', function(done) {
        let numDone = 0;
        let checked = 0;
        let tock = () => { if (++numDone == environments.length) {
              assert.isAbove(checked, 0);
              done();
            } };
        environments.forEach(function(environment) {
          rf.get({environment}, function(e, result){
            assert.isNull(e, "error getting: " + JSON.stringify(e));
            let numDone = 0, L = result.resourceFile.length;
            let selectedItems = [];
            if (L == 0) { return tock();}
            if (L > 10) {
              L = 6; // limit
              selectedItems = getRandomSubarray(result.resourceFile, L);
            }
            else {
              selectedItems = result.resourceFile;
            }
            let tick = () => { if (++numDone == L) { tock(); } };

            selectedItems.forEach( item => {
              rf.get({...item, ...{environment}}, function(e, result) {
                assert.isNull(e, "error getting: " + JSON.stringify(e));
                readContentFromFilesystem(item, function(content) {
                  if (content) {
                    assert.equal(result.trim(),content.trim(), 'resource content');
                    checked++;
                  }
                  tick();
                });
              });
            });
          });
        });
      });

      it('list resourcefiles for the org', function(done) {
        rf.get({}, function(e, result){
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          assert.isAbove(result.resourceFile.length, -1);
          done();
        });
      });

      it('get some particular resourcefiles from the org', function(done) {
        rf.get({}, function(e, result){
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          let numDone = 0, L = result.resourceFile.length;
          let selectedItems = [];
          if (L == 0) { return done(); }
          if (L > 10) {
            L = 6; // limit
            selectedItems = getRandomSubarray(result.resourceFile, L);
          }
          else {
            selectedItems = result.resourceFile;
          }

          let tick = () => { if (++numDone == L) { done(); } };
          selectedItems.forEach( item => {
            rf.get(item, function(e, result) {
              assert.isNull(e, "error getting: " + JSON.stringify(e));
              tick();
            });
          });
        });
      });

      it('fail to get an environment-scoped resourcefile b/c not exist', function(done) {
        let environment = selectRandomValue(environments);
        let badName = faker.lorem.word() +'1' + selectRandomValidType();
        rf.get({environment, name: badName}, function(e, result){
          assert.isNotNull(e, "error getting: " + JSON.stringify(e));
          done();
        });
      });

      it('fail to get a org-scoped resourcefile b/c not exist', function(done) {
        let badName = faker.lorem.word() +'1' + selectRandomValidType();
        rf.get({name:badName}, function(e, result){
          assert.isNotNull(e, "error getting: " + JSON.stringify(e));
          done();
        });
      });

      it('fail to get a resourcefile from an environment that does not exist', function(done) {
        let env = faker.lorem.word() + faker.lorem.word();
        let badName = faker.lorem.word() +'1' + selectRandomValidType();
        rf.get({environment:env, name: badName}, function(e, result){
          assert.isNotNull(e, "error getting: " + JSON.stringify(e));
          done();
        });
      });

    });


    describe('update', function() {

      it('update some resourcefiles in each env', function(done) {
        let numDone = 0;
        let bong = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(function(environment) {
          let keys = Object.keys(resourcefileDirs);
          let numDone = 0;
          let tock = () => { if (++numDone == keys.length) { bong(); } };

          keys.forEach(function (shortdir) {
            let fqdirpath = path.resolve(resourceDir, shortdir);
            let L = resourcefileDirs[shortdir].length, numDone = 0;
            let tick = () => { if (++numDone == L) { tock(); } };
            resourcefileDirs[shortdir].forEach( rsrcfile => {
              let filename = path.resolve(fqdirpath, rsrcfile);
              rf.update({filename, environment}, function(e, result) {
                assert.isNull(e, sprintf("error updating (%s): ", rsrcfile) + JSON.stringify(e));
                tick();
              });
            });
          });
        });
      });

      it('update some org-scoped resourcefiles', function(done) {
        let keys = Object.keys(resourcefileDirs);
        let numDone = 0;
        let tock = () => { if (++numDone == keys.length) { done(); } };

        keys.forEach(function (shortdir) {
          let fqdirpath = path.resolve(resourceDir, shortdir);
          let L = resourcefileDirs[shortdir].length, numDone = 0;
          let tick = () => { if (++numDone == L) { tock(); } };
          resourcefileDirs[shortdir].forEach( rsrcfile => {
            let filename = path.resolve(fqdirpath, rsrcfile);
            rf.update({filename}, function(e, result) {
              assert.isNull(e, sprintf("error updating (%s): ", rsrcfile) + JSON.stringify(e));
              tick();
            });
          });
        });
      });

      it('fail to update a non-existent environment-scoped resourcefile', function(done) {
        let environment = selectRandomValue(environments);
        let typ = selectRandomValue(Object.keys(resourcefileDirs));
        let rsrc = selectRandomValue(resourcefileDirs[typ]);
        let filename = path.resolve(resourceDir, typ, rsrc); // is valid
        rf.update({...{environment, name:faker.lorem.word(), type:selectRandomValidType()}, ...{filename}}, function(e, result) {
          assert.isNotNull(e, "unexpected success while updating: " + JSON.stringify(e));
          done();
        });
      });

      it('fail to update a non-existent org-scoped resourcefile', function(done) {
        let typ = selectRandomValue(Object.keys(resourcefileDirs));
        let rsrc = selectRandomValue(resourcefileDirs[typ]);
        let filename = path.resolve(resourceDir, typ, rsrc); // is valid
        rf.update({...{name:faker.lorem.word(), type:selectRandomValidType()}, ...{filename}}, function(e, result) {
          assert.isNotNull(e, "unexpected success while updating");
          done();
        });
      });

      it('fail to update an env-scoped resourcefile with no filename', function(done) {
        let numDone = 0;
        let bong = () => { if (++numDone == environments.length) { done(); } };
        let badName = faker.lorem.word() +'1' + selectRandomValidType();
        let typ = selectRandomValue(Object.keys(resourcefileDirs));
        let rsrc = selectRandomValue(resourcefileDirs[typ]);
        let filename = path.resolve(resourceDir, typ, rsrc);
        environments.forEach(function(environment) {
          rf.update({environment, name:badName}, function(e, result){
            assert.isNotNull(e, "the expected error did not occur");
            bong();
          });
        });
      });

      it('fail to update an org-scoped resourcefile with no filename', function(done) {
        let badName = faker.lorem.word() +'1' + selectRandomValidType();
        let key = selectRandomValue(Object.keys(resourcefileDirs));
        let filename = path.resolve(resourceDir, key, resourcefileDirs[key][0]);
        rf.update({name:badName}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

      it('fail to update some env-scoped resourcefiles b/c file not exist', function(done) {
        let numDone = 0;
        let bong = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(function(environment) {
          let key = selectRandomValue(Object.keys(resourcefileDirs));
          let filename = path.resolve(resourceDir, key, faker.lorem.word(), resourcefileDirs[key][0]); // NOEXIST
          rf.update({filename, environment}, function(e, result) {
            assert.isNotNull(e, sprintf("error updating (%s): ", filename) + JSON.stringify(e));
            bong();
          });
        });
      });

      it('fail to update org-scoped resourcefile b/c file not exist', function(done) {
        let key = selectRandomValue(Object.keys(resourcefileDirs));
        let filename = path.resolve(resourceDir, key, faker.lorem.word(), resourcefileDirs[key][0]); // NOEXIST

        rf.update({filename}, function(e, result) {
          assert.isNotNull(e, sprintf("error updating (%s): ", filename) + JSON.stringify(e));
          done();
        });
      });

    });


    describe('delete', function() {

      it('delete test resourcefiles from each env', function(done) {
        let numDone = 0;
        let bong = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(function(environment) {
          let keys = Object.keys(resourcefileDirs);
          let numDone = 0;
          let tock = () => { if (++numDone == keys.length) { bong(); } };
          keys.forEach(function (shortdir) {
            let L = resourcefileDirs[shortdir].length, numDone = 0;
            let tick = () => { if (++numDone == L) { tock(); } };
            resourcefileDirs[shortdir].forEach( rsrcfile => {
              rf.del({name:rsrcfile, environment}, function(e, result){
                assert.isNull(e, sprintf("error deleting (%s): ", rsrcfile) + JSON.stringify(e));
                tick();
              });
            });
          });
        });
      });

      it('delete org-scoped test resourcefiles', function(done) {
        rf.get({}, function(e, result){
          assert.isNull(e, "error getting: " + JSON.stringify(e));
          assert.isAbove(result.resourceFile.length, -1);
          let numDone = 0, L = result.resourceFile.length;
          if (L == 0) { return done(); }
          let tick = () => { if (++numDone == L) { done(); } };
          result.resourceFile.forEach( item => {
            if (item.name.startsWith(specialPrefix)) {
              rf.del(item, function(e, result) {
                assert.isNull(e, "error deleting: " + JSON.stringify(e));
                tick();
              });
            }
            else {
              tick();
            }
          });
        });
      });

      it('fail to delete non-existing resourcefiles from each env', function(done) {
        let numDone = 0;
        let bong = () => { if (++numDone == environments.length) { done(); } };

        environments.forEach(function(environment) {
          let keys = Object.keys(resourcefileDirs);
          let numDone = 0;
          let tock = () => { if (++numDone == keys.length) { bong(); } };
          keys.forEach(function (shortdir) {
            let L = resourcefileDirs[shortdir].length, numDone = 0;
            let tick = () => { if (++numDone == L) { tock(); } };
            resourcefileDirs[shortdir].forEach( rsrcfile => {
              let name = faker.lorem.word() + selectRandomValidType();
              rf.del({name, environment}, function(e, result){
                assert.isNotNull(e, 'expected error deleting ' + name + ' ' + JSON.stringify(e));
                tick();
              });
            });
          });
        });
      });

      it('fail to delete non-existing org-scoped resourcefiles', function(done) {
        let keys = Object.keys(resourcefileDirs);
        let numDone = 0;
        let tock = () => { if (++numDone == keys.length) { done(); } };
        keys.forEach(function (shortdir) {
          let L = resourcefileDirs[shortdir].length, numDone = 0;
          let tick = () => { if (++numDone == L) { tock(); } };
          resourcefileDirs[shortdir].forEach( rsrcfile => {
            let name = faker.lorem.word() + selectRandomValidType();
            rf.del({name}, function(e, result){
              assert.isNotNull(e, 'expected error deleting ' + name + ' ' + JSON.stringify(e));
              tick();
            });
          });
        });
      });

      it('fail to delete an env-scoped resourcefiles because no name was specified', function(done) {
        let numDone = 0;
        let bong = () => { if (++numDone == environments.length) { done(); } };
        environments.forEach(function(environment) {
          rf.del({environment}, function(e, result){
            assert.isNotNull(e, "the expected error did not occur");
            bong();
          });
        });
      });

      it('fail to delete an org-scoped resourcefile because no name was specified', function(done) {
        rf.del({}, function(e, result){
          assert.isNotNull(e, "the expected error did not occur");
          done();
        });
      });

    });

  });


});
