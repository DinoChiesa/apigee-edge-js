// deployableAsset.js
// ------------------------------------------------------------------
// Copyright 2018 Google LLC.
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

(function (){
  'use strict';
  const utility  = require('./utility.js'),
        common   = require('./common.js'),
        fs       = require('fs'),
        path     = require('path'),
        AdmZip   = require('adm-zip'),
        archiver = require('archiver'),
        xml2js   = require('xml2js'),
        qs       = require('qs'),
        request  = require('request'),
        urljoin  = require('url-join'),
        sprintf  = require('sprintf-js').sprintf;

  // ========================================================================================
  // functions used by ApiProxy and SharedFlow

  function get(collectionName, conn, options, cb) {
    return common.insureFreshToken(conn, function(requestOptions) {
      if (options.revision) {
        if ( ! options.name) {
          return cb({error: 'The name is required when specifying a revision'});
        }
        requestOptions.url = (options.policy) ?
          urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'policies', options.policy) :
          (options.proxyendpoint) ?
          urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'proxies', options.proxyendpoint) :
          urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision);
      }
      else {
        requestOptions.url = (options.name) ?
          urljoin(conn.urlBase, collectionName, options.name) :
          urljoin(conn.urlBase, collectionName);
      }
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  }

  function update(collectionName, conn, options, value, cb) {
    return common.insureFreshToken(conn, function(requestOptions) {
      if (options.revision) {
        if ( ! options.name) {
          return cb({error: 'The name is required when specifying a revision'});
        }
        requestOptions.url = (options.policy) ?
          urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'policies', options.policy) :
          (options.proxyendpoint) ?
          urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'proxies', options.proxyendpoint) :
          urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision);
      }
      else {
        requestOptions.url = (options.name) ?
          urljoin(conn.urlBase, collectionName, options.name) :
          urljoin(conn.urlBase, collectionName);
      }
      requestOptions.body = JSON.stringify(value);
      requestOptions.headers['content-type'] = 'application/json';
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [200], cb));
    });
  }

  function del(collectionName, conn, options, cb) {
    if ( ! options.name) {
      return cb({ error: 'The name is required'});
    }
    common.insureFreshToken(conn, function(requestOptions) {
      if (options.revision) {
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('Delete from %s: %s r%s ', collectionName, options.name, options.revision,
                                   options.policy ? '('+options.policy+')': ''));
        }
        requestOptions.url = (options.policy) ?
          urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'policies', options.policy) :
          urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision);
      }
      else {
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('Delete from %s: %s', collectionName, options.name));
        }
        requestOptions.url = urljoin(conn.urlBase, collectionName, options.name);
      }
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  }

  function getPoliciesForRevision(conn, assetType, collectionName, options, cb) {
    // GET :mgmtserver/v1/o/:orgname/COLLECTIONNAME/:api/revisions/:REV/policies
    if (!options.name) {
      return cb({error:"missing name for " + assetType});
    }
    if (!options.revision) {
      return cb({error:"missing revision for " + assetType});
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'policies');
      if (options.policy) {
        requestOptions.url = urljoin(requestOptions.url, options.policy);
      }
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  }

  function getResourcesForRevision(conn, assetType, collectionName, options, cb) {
    if (!options.name) {
      return cb({error:"missing name for " + assetType});
    }
    if (!options.revision) {
      return cb({error:"missing revision for " + assetType});
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'resources');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  }

  function getDeployments(conn, assetType, collectionName, options, cb) {
    // GET :mgmtserver/v1/o/:orgname/COLLECTIONNAME/:asset/revisions/:rev/deployments
    // or
    // GET :mgmtserver/v1/o/:orgname/COLLECTIONNAME/:asset/deployments
    if (!options.name) {
      return cb({error:"missing name for " + assetType});
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = (options.revision) ?
        urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'deployments') :
                urljoin(conn.urlBase, collectionName, options.name, 'deployments');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  }

  function getRevisions(conn, assetType, collectionName, options, cb) {
    // GET :mgmtserver/v1/o/:orgname/COLLECTIONNAME/:api/revisions
    if (!options.name) {
      return cb({error:"missing name for " + assetType});
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, collectionName, options.name, 'revisions');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  }

  function getCollectionNameForAssetType(assetType) {
    var supportedTypes = { apiproxy: 'apis', proxy:'apis', sharedflowbundle: 'sharedflows'};
    return supportedTypes[assetType];
  }

  function undeploy(conn, options, assetType, cb){
    // DELETE :mgmtserver/v1/o/:orgname/e/:envname/apis/:proxyname/revisions/:revnum/deployments
    // Authorization: :edge-auth
    const env = options.environment.name || options.environment;
    if ( ! env) {
      return cb(new Error('The required param environment is missing'));
    }
    const collection = getCollectionNameForAssetType(assetType);
    if ( ! collection) {
      return cb(new Error('The assetType is not supported'));
    }
    const rev = (options.revision)? (options.revision.name || options.revision): null;
    const undeployRevision = function(name, rev){
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('Undeploy %s %s r%s from env:%s', assetType, name, rev, env));
          }
          common.insureFreshToken(conn, function(requestOptions) {
            requestOptions.url = urljoin(conn.urlBase,
                                         'e', env,
                                         collection, name,
                                         'revisions', rev,
                                         'deployments');
            if (conn.verbosity>0) {
              utility.logWrite(sprintf('DELETE %s', requestOptions.url));
            }
            request.del(requestOptions, common.callback(conn, [200], cb));
          });
        };
    if (rev) {
      undeployRevision(options.name, rev);
    }
    else {
      // inquire deployments and undeploy whatever is deployed
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('Get deployments for %s %s in env:%s', assetType, options.name, env));
      }
      getDeployments(conn, assetType, collection, options, function(e, result) {
        utility.logWrite('Deployments: ' + JSON.stringify(result));
        if (result.environment && result.environment[0] &&
            result.environment[0].revision &&
            result.environment[0].revision[0] &&
            result.environment[0].revision[0].name) {
          undeployRevision(options.name, result.environment[0].revision[0].name);
        }
        else {
          // no deployments to undeploy
          return cb(e, result);
        }
      });
    }
  }

  function deploy(conn, options, assetType, cb) {
    // POST \
    //   -H content-type:application/x-www-form-urlencoded \
    //   "${mgmtserver}/v1/o/${org}/e/${environment}/apis/${proxyname}/revisions/${rev}/deployments" \
    //   -d 'override=true&delay=60'
    var qparams = {
          override: (options.hasOwnProperty('override')) ? options.override : true,
          delay: (options.hasOwnProperty('delay')) ? options.delay : 60
        };
    const env = options.environment.name || options.environment;
    if ( ! env) {
      return cb(new Error('The required param environment is missing'));
    }
    var collection = getCollectionNameForAssetType(assetType);
    if ( ! collection) {
      return cb(new Error('The assetType is not supported'));
    }
    if (assetType == 'apiproxy') {
      qparams.basepath = options.basepath || '/';
    }
    else if (qparams.basepath) { // just in case
      return cb({error: "incorrect arguments - basepath is not supported"});
    }
    const rev = (options.revision)? (options.revision.name || options.revision): null;
    const deployRevision = function(name, rev){
            if (conn.verbosity>0) {
              utility.logWrite(sprintf('deploy %s %s r%d to env:%s',
                                       assetType, name, rev, env));
            }
            common.insureFreshToken(conn, function(requestOptions) {
              requestOptions.headers['content-type'] = 'application/x-www-form-urlencoded';
              requestOptions.body = qs.stringify(qparams);
              requestOptions.url = urljoin(conn.urlBase,
                                           'e', env,
                                           collection, name,
                                           'revisions', rev,
                                           'deployments');
              if (conn.verbosity>0) {
                utility.logWrite(sprintf('POST %s', requestOptions.url));
              }
              request.post(requestOptions, common.callback(conn, [200], cb));
            });
          };


    if (rev) {
      deployRevision(options.name, rev);
    }
    else {
      // inquire revisions and deploy the latest
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('Get revisions for %s %s', assetType, options.name));
      }
      getRevisions(conn, assetType, collection, options, function(e, result) {
        utility.logWrite('Revisions: ' + JSON.stringify(result));
        result = result.map(Number).sort((a, b) => b - a);
        deployRevision(options.name, result[0]);
      });
    }
  }

  function getDatestring() {
    var datestring = new Date()
      .toISOString()
      .replace(/-/g,'')
      .replace(/:/g,'')
      .replace('T','-')
      .replace(/\.[0-9]+Z/,'');
    return datestring;
  }

  function export0(conn, assetType, collectionName, options, cb) {
    if (!options.name) {
      return cb({error:sprintf("missing name for %s", assetType)});
    }
    var exportOneAssetRevision = function(requestOptions, revision) {
          if ( ! revision){
            return cb({error:sprintf("missing revision for %s", assetType)});
          }
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('Export %s %s %s', assetType, options.name, revision));
          }
          requestOptions.url = urljoin(conn.urlBase, collectionName, options.name, 'revisions', revision) + '?format=bundle';
          requestOptions.headers.accept = '*/*'; // not application/octet-stream !
          requestOptions.encoding = null; // necessary to get
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('GET %s', requestOptions.url));
          }
          request.get(requestOptions, common.callback(conn, [200], function(e, result) {
            // The filename in the response is meaningless, like this:
            // content-disposition: 'attachment; filename="apiproxy3668830505762375956.zip"
            // Here, we create a meaningful filename, but it's just a suggestion. The caller
            // is responsible for saving the buffer to the filename.
            if (e) return cb(e, result);
            var suggestedFilename = sprintf('%s-%s-%s-r%s-%s.zip', assetType, conn.orgname, options.name, options.revision, getDatestring());
            // fs.writeFileSync(filename, result);
            return cb(e, {filename:suggestedFilename, buffer:result});
          }));
        };

    return common.insureFreshToken(conn, function(requestOptions) {
      if (!options.revision) {
        var collection = (assetType == 'sharedflow')? conn.org.sharedflows : conn.org.proxies;
        collection.getRevisions({name:options.name}, function(e, result) {
          if (e) { return cb(e, result); }
          //console.log('got revisions: ' + JSON.stringify(result));
          var latestRevision = result[result.length - 1];
          exportOneAssetRevision(requestOptions, latestRevision);
        });
      }
      else {
        exportOneAssetRevision(requestOptions, options.revision);
      }
    });
  }


  function needNpmInstall(collection, zipArchive) {
    if (collection != 'apis') { return false; }
    var foundPackage = false;
    var foundNodeModules = false;
    var zip = new AdmZip(zipArchive);
    var zipEntries = zip.getEntries();
    zipEntries.forEach(function(entry) {
      if (entry.entryName == 'apiproxy/resources/node/package.json') {
        foundPackage = true;
      }
      if (entry.entryName == 'apiproxy/resources/node/node_modules.zip') {
        foundNodeModules = true;
      }
    });
    return foundPackage && !foundNodeModules;
  }

  function runNpmInstall(conn, options, cb) {
    // POST :mgmtserver/v1/o/:orgname/apis/:apiname/revisions/:revnum/npm
    //   -H content-type:application/x-www-form-urlencoded \
    //   -d 'command=install'
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('npm install %s r%d', options.name, options.revision));
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   'apis', options.name,
                                   'revisions', options.revision,
                                   'npm');
      requestOptions.body = 'command=install';
      requestOptions.headers['content-type'] = 'application/x-www-form-urlencoded';

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [200], cb));
    });
  }

  function importFromZip(conn, assetName, assetType, zipArchive, cb) {
    // eg,
    // curl -X POST -H Content-Type:application/octet-stream "${mgmtserver}/v1/o/$org/apis?action=import&name=$proxyname" -T $zipname
    // or
    // curl -X POST -H content-type:application/octet-stream "${mgmtserver}/v1/o/$org/sharedflows?action=import&name=$sfname" -T $zipname
    if ( ! fs.existsSync(zipArchive)) {
      return cb({error:'The archive does not exist'});
    }
    var collection = getCollectionNameForAssetType(assetType);
    if ( ! collection) {
      return cb({error:'The assetType is not supported'});
    }
    common.insureFreshToken(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/octet-stream';
      requestOptions.url = urljoin(conn.urlBase, collection + '?action=import&name=' + assetName);

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }

      var afterImport =
        function(e, result) {
          if (conn.verbosity>0) {
            if (e) {
              utility.logWrite('Import error: ' + JSON.stringify(e));
            }
            else {
              utility.logWrite('Import result: ' + JSON.stringify(result));
            }
          }
          if (e) { return cb(e, result); }
          if( ! needNpmInstall(collection, zipArchive)) { return cb(null, result); }
          runNpmInstall(conn, {name:result.name, revision:result.revision},
                        // Return the result from the import, not the
                        // result from the install.
                        function(e2, result2) {
                          if (e2) { return cb(e2, result2); }
                          cb(e, result);
                        });
        };
      fs.createReadStream(zipArchive)
        .pipe(request.post(requestOptions, common.callback(conn, [201], afterImport)));
    });
  }

  function verifyPathIsDir(dir, cb) {
    var resolvedPath = path.resolve(dir);
    fs.lstat(resolvedPath, function(e, stats) {
      if (e) return cb(e);
      if (! stats.isDirectory()) {
        return cb({message:'The path '+ resolvedPath +' is not a directory'});
      }
      return cb(null);
    });
  }

  function walkDirectory(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
      if (err) return done(err);
      var i = 0;
      (function next() {
        var file = list[i++];
        if (!file) return done(null, results);
        file = dir + '/' + file;
        fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory()) {
            walkDirectory(file, function(err, res) {
              results = results.concat(res);
              next();
            });
          } else {
            results.push(file);
            next();
          }
        });
      })();
    });
  }

  function includeInBundle(name) {
    // exclude backup files
    if (name.endsWith('~')) return false;
    // exclude configuration files for JavaScript
    if (name.endsWith('.jshintrc')) return false;
    if (name.endsWith('.jslintrc')) return false;
    //if (name.endsWith('node_modules.zip')) return false;
    if (name.indexOf('/node_modules/')>0) return false;
    let b = path.basename(name);
    // exclude emacs temporary files
    if (b.endsWith('#') && b.startsWith('#')) return false;
    if (b.startsWith('.#')) return false;
    return true;
  }

  function produceBundleZip(srcDir, assetType, verbosity, cb) {
    var pathToZip = path.resolve(path.join(srcDir, assetType));
    verifyPathIsDir(pathToZip, function(e) {
      if (e) { return cb(e); }
      var tmpdir = process.env.tmpdir || '/tmp';
      var rando = Math.random().toString(36).slice(2);
      var archiveName = path.join(tmpdir, assetType + '-' + new Date().getTime() + '-' + rando + '.zip');
      var outs = fs.createWriteStream(archiveName);
      var archive = archiver('zip');

      outs.on('close', function () {
        if (verbosity>0) {
          utility.logWrite('zipped ' + archive.pointer() + ' total bytes');
        }
        cb(null, archiveName);
      });

      archive.on('error', function(e){ cb(e, archiveName); });
      archive.pipe(outs);

      walkDirectory(pathToZip, function(e, results) {
        results.filter(includeInBundle).forEach(function(filename) {
          var shortName = filename.replace(pathToZip, assetType);
          archive.append(fs.createReadStream(filename), { name: shortName });
        });
        archive.finalize();
      });
    });
  }

  function importFromDir(conn, name, assetType, srcDir, cb) {
    if (['apiproxy', 'sharedflowbundle'].indexOf(assetType) < 0) {
      return cb({ error:"unknown assetType"});
    }
    var resolvedPath = path.resolve(srcDir);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('import %s %s from dir %s', assetType, name, resolvedPath));
    }
    verifyPathIsDir(srcDir, function(e) {
      if (e) { return cb(e); }
      produceBundleZip(srcDir, assetType, conn.verbosity, function(e, archiveName) {
        if (e) return cb(e);
        //console.log('archivename: %s', archiveName);
        importFromZip(conn, name, assetType, archiveName, function(e, result) {
          if (e) { return cb(e, result); }
          fs.unlinkSync(archiveName);
          cb(null, result);
        });
      });
    });
  }

  function findXmlFiles(dir, cb) {
    // from within a directory, find the XML files
    var xmlfiles = [];
    fs.readdir(dir, function(e, items) {
      if (e) return cb(e);
      var i = 0;
      (function next() {
        var file = items[i++];
        if (!file) return cb(null, xmlfiles);
        file = dir + '/' + file;
        fs.stat(file, function(e, stat) {
          if (e) return cb(e);
          if (stat && stat.isFile() && file.endsWith('.xml')) {
            xmlfiles.push(file);
          }
          next();
        });
      })();
    });
  }

  function doParseForName(conn, data, cb) {
    var parser = new xml2js.Parser();
    parser.parseString(data, function (e, result){
      if (e) return cb(e);
      if (result.SharedFlowBundle) {
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('found name: %s', result.SharedFlowBundle.$.name));
        }
        return cb(null, result.SharedFlowBundle.$.name);
      }
      if (result.APIProxy) {
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('found name: %s', result.APIProxy.$.name));
        }
        return cb(null, result.APIProxy.$.name);
      }
      cb({error:'cannot determine asset name'});
    });
  }

  function inferAssetNameFromDir(conn, dir, cb) {
    findXmlFiles(dir, function(e, files){
      if (e) return cb(e);
      if (files.length != 1)
        return cb({error: sprintf("found %d files, expected 1", files.length)});
      fs.readFile(files[0], 'utf8', function(e, data) {
        if (e) return cb(e);
        doParseForName(conn, data, cb);
      });
    });
  }

  function inferAssetNameFromZip(conn, source, cb) {
    // temporarily unzip the file and then scan the dir
    var toplevelXmlRe = new RegExp('^apiproxy/[^/]+\\.xml$');
    var zip = new AdmZip(source);
    var zipEntries = zip.getEntries();
    var foundit = false;
    zipEntries.forEach(function(entry){
      if ( ! foundit) {
        if (toplevelXmlRe.test(entry.entryName)) {
          let data = entry.getData();
          doParseForName(conn, data.toString('utf8'), cb);
          foundit = true;
        }
      }
    });
  }

  function import0(conn, options, assetType, cb) {
    var source = path.resolve(options.source);
    fs.stat(source, function(e, stat) {
      if (e) return cb(e);
      if ( ! stat) return cb({error: 'stat null'});
      if (stat.isFile() && source.endsWith('.zip')) {
        if (options.name) {
          return importFromZip(conn, options.name, assetType, source, cb);
        }
        return inferAssetNameFromZip(conn, source, function(e, name) {
          if (e) return cb(e);
          importFromZip(conn, name, assetType, source, cb);
        });
      }
      else if (stat.isDirectory()) {
        if (options.name) {
          return importFromDir(conn, options.name, assetType, source, cb);
        }
        return inferAssetNameFromDir(conn, path.join(source, 'apiproxy'), function(e, name) {
          if (e) return cb(e);
          importFromDir(conn, name, assetType, source, cb);
        });
      }
      else {
        return cb({error:'source represents neither a zip nor a directory.'});
      }
    });
  }

  module.exports = {
    importFromZip           : importFromZip,
    importFromDir           : importFromDir,
    import0                 : import0,
    export0                 : export0,
    get                     : get,
    update                  : update,
    deploy                  : deploy,
    undeploy                : undeploy,
    del                     : del,
    getRevisions            : getRevisions,
    getDeployments          : getDeployments,
    getPoliciesForRevision  : getPoliciesForRevision,
    getResourcesForRevision : getResourcesForRevision
  };

}());
