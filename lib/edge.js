// edge.js
// ------------------------------------------------------------------
//
// library of functions for Apigee Edge.
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
// created: Mon Jun  6 17:32:20 2016
// last saved: <2018-March-17 17:11:02>

(function (){
  var path = require('path'),
      fs = require('fs'),
      os = require('os'),
      qs = require('qs'),
      netrc = require('netrc')(),
      tokenMgmt = require('./tokenMgmt.js'),
      archiver = require('archiver'),
      AdmZip = require('adm-zip'),
      urljoin = require('url-join'),
      sprintf = require('sprintf-js').sprintf,
      xml2js = require('xml2js'),
      merge = require('merge'),
      jsonRe = new RegExp("application/json"),
      utility = require('./utility.js'),
      request = require('request'),
      gEdgeSaasMgmtServer = 'https://api.enterprise.apigee.com',
      gDefaultBasicAuthBlobForLogin = 'ZWRnZWNsaTplZGdlY2xpc2VjcmV0';

//require('request-debug')(request);

  function getDatestring() {
    var datestring = new Date().toISOString().replace(/-/g,'').replace(/:/g,'').replace('T','-').replace(/\.[0-9]+Z/,'');
    return datestring;
  }

  function base64Encode(s) {
    return new Buffer(s).toString('base64');
  }

  function Connection() { }

  Connection.prototype.refreshToken = function(expiredToken, cb) {
    var conn = this;
    var formparams = {
          refresh_token: expiredToken.refresh_token,
          grant_type : 'refresh_token'
        };
    return invokeTokenEndpoint(conn, formparams, cb);
  };

  Connection.prototype.getNewToken = function(arg1, cb) {
    var conn = this;
    var formparams = { grant_type : 'password' };
    if ( typeof arg1 == 'string' ) {
      formparams = merge(formparams, { username: conn.user, password: arg1 });
    }
    else if (arg1.passcode) {
      formparams = merge(formparams, { response_type: 'token', passcode: arg1.passcode });
    }
    else if (arg1.password) {
      formparams = merge(formparams, { username: conn.user, password: arg1.password });
      if (arg1.mfa_token) {
        formparams = merge(formparams, { mfa_token: arg1.mfa_token });
      }
    }
    return invokeTokenEndpoint(conn, formparams, cb);
  };

  // // why is this present on Connection, and not only on the Environment object?
  // Connection.prototype.getEnvironments = function(cb) {
  //   var conn = this;
  //   if (conn.verbosity>0) {
  //     utility.logWrite('get environments');
  //   }
  //   internalGetEnvironments(conn, cb);
  // };

  function Organization(conn) {
    this.conn = conn;
    this.proxies = new ApiProxy(conn);
    this.caches = new Cache(conn);
    this.kvms = new Kvm(conn);
    this.developers = new Developer(conn);
    this.developerapps = new DeveloperApp(conn);
    this.apps = new App(conn);
    this.sharedflows = new SharedFlow(conn);
    this.products = new ApiProduct(conn);
    this.appcredentials = new AppCredential(conn);
    this.flowhooks = new FlowHook(conn);
    this.environments = new Environment(conn);
  }

  Organization.prototype.get = function(url, cb) {
    if ( ! cb) { cb = url; url = ''; }
    var conn = this.conn;
    url = urljoin(conn.urlBase, url);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', url));
    }
    request.get(url, {headers: conn.requestHeaders}, commonCallback(conn, [200], cb));
  };

  Organization.prototype.getProperties = function(cb) {
    var conn = this.conn;
    this.get(function(e, result) {
      if (e) { return cb(e, result); }
      conn.orgProperties = arrayOfKeyValuePairsToHash(result.properties.property);
      result.properties = conn.orgProperties;
      cb(null, result);
    });
  };

  function Environment(conn) {this.conn = conn;}

  function internalGetEnvironments(conn, options, cb) {
    // if (conn.environments) {
    //   return cb(null, conn.environments);
    // }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.name) ?
        urljoin(conn.urlBase, 'e', options.name):
        urljoin(conn.urlBase, 'e') ;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], function(e, result){
        //if ( ! e) {conn.environments = result;} // cache
        cb(e, result);
      }));
    });
  }

  Environment.prototype.get = function(options, cb) {
    if ( ! cb) { cb = options; options = {}; }
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite('get environments');
    }
    internalGetEnvironments(conn, options, cb);
  };

  Environment.prototype.getVhosts = function(options, cb) {
    var conn = this.conn;
    var name = options.environmentName || options.environment || options.name;
    if (!name) {
      throw new Error("missing environment name");
    }
    if (conn.verbosity>0) {
      utility.logWrite('get vhosts');
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.vhost) ?
        urljoin(conn.urlBase, 'e', name, 'virtualhosts', options.vhost):
        urljoin(conn.urlBase, 'e', name, 'virtualhosts');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  function trimSlash(s) {
    if (s.slice(-1) == '/') { s = s.slice(0, -1); }
    return s;
  }

  function maybeSetSsoParams(c, options) {
    if (options.ssoZone) {
      c.loginBaseUrl = 'https://' + options.ssoZone + '.login.apigee.com/';
    }
    else if (options.ssoUrl) {
      c.loginBaseUrl = options.ssoUrl;
    }
    else {
      c.loginBaseUrl = 'https://login.apigee.com';
    }
    if (options.ssoClientId && options.ssoClientSecret) {
      c.basicAuthBlobForLogin = base64Encode(options.ssoClientId + ':' + options.ssoClientSecret);
    }
  }

  function _connect(options, cb) {
    var org;
    // options = {user: "foo", password: "bar", mgmtServer: "https://api.ent.api.com", org: "orgname"}
    // or
    // options = {user: "foo", mgmtServer: "https://api.ent.api.com", org: "orgname"}
    // or
    // options = {user: "foo", org: "orgname"}
    // or
    // options = {user: "foo", org: "orgname", ssoZone: 'foo' }
    function maybeGetNewToken() {
        if (!options.password ) {
          throw new Error("missing password");
        }
        if (!options.no_token) {
          org = new Organization(c);
          c.org = org;
          return c.getNewToken(options.password, function(e, result){ cb(e, org); });
        }
        else {
          // for some reason, the caller does not want to use tokens
          c.requestHeaders.authorization = 'Basic ' + base64Encode(options.user + ':' + options.password);
          org = new Organization(c);
          c.org = org;
          return org.get('', function(e, result){ cb(e, org); });
        }
    }

    var mgmtServer = trimSlash(options.mgmtServer || gEdgeSaasMgmtServer);
    var c = new Connection();
    if ( typeof cb != 'function' ) {
      throw new Error("missing callback");
    }
    if ( ! options.org ) {
      throw new Error("missing org");
    }
    c.orgname = options.org;

    if ( options.netrc ) {
      if (options.verbosity) {
        utility.logWrite('searching .netrc for credentials....');
      }
      var mgmtUrl = require('url').parse(mgmtServer);
      if ( ! netrc[mgmtUrl.hostname]) {
        throw new Error("there is no entry for the management server in in the .netrc file.");
      }
      options.user = netrc[mgmtUrl.hostname].login;
      options.password = netrc[mgmtUrl.hostname].password;
    }

    if ( ! options.user ) {
      throw new Error("missing user");
    }
    c.user = options.user;

    maybeSetSsoParams(c, options);

    checkMgmtServerFormat(mgmtServer);
    c.mgmtServer = mgmtServer;
    c.urlBase = urljoin(mgmtServer, '/v1/o/', options.org);
    c.requestHeaders = { accept : 'application/json'} ;
    c.verbosity = options.verbosity || 0;
    if (c.verbosity) {
      utility.logWrite('connect: ' + JSON.stringify(c));
    }

    if ( ! options.no_token ) {
      var stashedToken;
      if (!options.no_token) {
          stashedToken = tokenMgmt.currentToken(options.user, mgmtServer);
      }
      if (stashedToken) {
        if (options.verbosity) {
          utility.logWrite('found stashed token.');
        }
        org = new Organization(c);
        c.org = org;
        if ( tokenMgmt.isInvalidOrExpired(stashedToken)) {
          if (options.verbosity) {
            utility.logWrite('invalid or expired');
          }
          return c.refreshToken(stashedToken, function(e, result){
            if ( ! e ) { return cb(null, org); }
            if (c.verbosity) {
              utility.logWrite('refresh failed: ' + JSON.stringify(e) + '//' + JSON.stringify(result));
            }
            // failure can happen here if the refresh token is expired
            return maybeGetNewToken();
          });
        }
        if (options.verbosity) {
          utility.logWrite('valid and not expired');
        }
        c.requestHeaders.authorization = 'Bearer ' + stashedToken.access_token;
        return cb(null, org);
      }
      else {
        if (options.verbosity) {
          utility.logWrite('found no stashed token.');
        }
        return maybeGetNewToken();
      }
    }
    else {
      if (!options.password ) {
        throw new Error("missing password");
      }
      c.requestHeaders.authorization = 'Basic ' + base64Encode(options.user + ':' + options.password);
      org = new Organization(c);
      c.org = org;
      return org.get('', function(e, result){ cb(e, org); });
    }
  }


  // to handle expiry of the oauth token
  function mergeRequestOptions(conn, cb) {
    var rh = conn.requestHeaders;
    if (rh && rh.authorization &&
        conn.user && rh.authorization.indexOf('Bearer ') === 0) {
      var stashedToken = tokenMgmt.currentToken(conn.user, conn.mgmtServer);
      if (tokenMgmt.isInvalidOrExpired(stashedToken)) {
        return conn.refreshToken(stashedToken, function(e, result){
          if (e) {
            throw new Error('error refreshing token: ' + e );
          }
          cb(merge(true, { headers: rh}));
        });
      }
      else {
        cb(merge(true, { headers: rh}));
      }
    }
    else {
      cb(merge(true, { headers: rh}));
    }
  }

  function commonCallback(conn, okstatuses, cb) {
    return function (error, response, body) {
      var result;
      if (conn.verbosity>0) {
        utility.logWrite('status: ' + response.statusCode );
      }
      if (error) {
        result = body ? JSON.parse(body): null;
        return cb(error, result);
      }
      if (okstatuses.indexOf(response.statusCode) > -1) {
        if (jsonRe.test(response.headers["content-type"])) {
          result = JSON.parse(body);
        }
        cb(null, result || body);
      }
      else {
        result = body ? JSON.parse(body): null;
        cb({error: 'bad status', statusCode: response.statusCode }, result);
      }
    };
  }

  function checkMgmtServerFormat(mgmtserver) {
    if ( ! mgmtserver || ! (mgmtserver.startsWith('http://') || mgmtserver.startsWith('https://'))) {
      throw new Error("use an http or https url for the management server.");
    }
  }

  function invokeTokenEndpoint(conn, formparams, cb) {
    var requestOptions = {
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization' : 'Basic ' + (conn.basicAuthBlobForLogin || gDefaultBasicAuthBlobForLogin )
          },
          body : qs.stringify(formparams),
          url : conn.loginBaseUrl + '/oauth/token'
        };
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, commonCallback(conn, [200], function(e, result) {
      if (conn.verbosity>0) {
        if (e) {
          utility.logWrite('POST error: ' + JSON.stringify(e));
        }
        else {
          utility.logWrite('POST result: ' + JSON.stringify(result));
        }
      }
      if ( ! e && result) {
        result.issued_at = (new Date()).valueOf();
        if (formparams.username) {
          conn.user = formparams.username;
        }
        tokenMgmt.stashToken(conn.user, conn.mgmtServer, result);
        conn.requestHeaders.authorization = 'Bearer ' + result.access_token;
      }
      cb(e, result);
    }));
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

  function produceBundleZip(srcDir, assetType, verbosity, cb) {
    var pathToZip = path.resolve(path.join(srcDir, assetType));
    var checkName = function(name) {
          if (name.endsWith('~')) return false;
          //if (name.endsWith('node_modules.zip')) return false;
          if (name.indexOf('/node_modules/')>0) return false;
          var b = path.basename(name);
          if (b.endsWith('#') && b.startsWith('#')) return false;
          if (b.startsWith('.#')) return false;
          return true;
        };

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
        results.forEach(function(filename) {
          if (checkName(filename)) {
            var shortName = filename.replace(pathToZip, assetType);
            archive.append(fs.createReadStream(filename), { name: shortName });
          }
        });
        archive.finalize();
      });
    });
  }

  function getCollectionNameForAssetType(assetType) {
    var supportedTypes = { apiproxy: 'apis', sharedflowbundle: 'sharedflows'};
    return supportedTypes[assetType];
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
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   'apis', options.name,
                                   'revisions', options.revision,
                                   'npm');
      requestOptions.body = 'command=install';
      requestOptions.headers['content-type'] = 'application/x-www-form-urlencoded';

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, commonCallback(conn, [200], cb));
    });
  }

  function importAssetFromZip(conn, assetName, assetType, zipArchive, cb) {
    // eg,
    // curl -X POST -H Content-Type:application/octet-stream "${mgmtserver}/v1/o/$org/apis?action=import&name=$proxyname" -T $zipname
    // or
    // curl -X POST -H content-type:application/octet-stream "${mgmtserver}/v1/o/$org/sharedflows?action=import&name=$sfname" -T $zipname
    if ( ! fs.existsSync(zipArchive)) {
      return cb(new Error('The archive does not exist'));
    }
    var collection = getCollectionNameForAssetType(assetType);
    if ( ! collection) {
      return cb(new Error('The assetType is not supported'));
    }
    mergeRequestOptions(conn, function(requestOptions) {
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
        .pipe(request.post(requestOptions, commonCallback(conn, [201], afterImport)));
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

  function importAssetFromDir(conn, name, assetType, srcDir, cb) {
    if (['apiproxy', 'sharedflowbundle'].indexOf(assetType) < 0) {
      return cb(new Error("unknown assetType"));
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
        importAssetFromZip(conn, name, assetType, archiveName, function(e, result) {
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
      cb(new Error('cannot determine asset name'));
    });
  }

  function inferAssetNameFromDir(conn, dir, cb) {
    findXmlFiles(dir, function(e, files){
      if (e) return cb(e);
      if (files.length != 1)
        return cb(new Error(sprintf("found %d files, expected 1", files.length)));
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

  /*
   * convert a simple timespan string, expressed in days, hours, minutes, or
   * seconds, such as 30d, 12d, 8h, 45m, 30s, into a numeric quantity in
   * seconds.
   */
  function resolveExpiry(subject) {
    var pattern = new RegExp('^([1-9][0-9]*)([smhdw])$','i');
    var multipliers = {s: 1, m: 60, h : 60*60, d:60*60*24, w: 60*60*24*7, y: 60*60*24*365};
    var match = pattern.exec(subject);
    if (match) {
      return match[1] * multipliers[match[2]] * 1000;
    }
    return -1;
  }

  function arrayOfKeyValuePairsToHash(properties) {
    var hash = {};
    properties.forEach(function(item) {
      hash[item.name] = item.value;
    });
    return hash;
  }

  function hashToArrayOfKeyValuePairs(hash) {
    return Object.keys(hash).map(function(key){
      return { name : key, value : hash[key]};
    });
  }

  // ========================================================================================
  // functions used by ApiProxy and SharedFlow
 function import0(conn, options, assetType, cb) {
    var source = path.resolve(options.source);
    fs.stat(source, function(e, stat) {
      if (e) return cb(e);
      if ( ! stat) return cb({error: 'stat null'});
      if (stat.isFile() && source.endsWith('.zip')) {
        if (options.name) {
          return importAssetFromZip(conn, options.name, assetType, source, cb);
        }
        return inferAssetNameFromZip(conn, source, function(e, name) {
          if (e) return cb(e);
          importAssetFromZip(conn, name, assetType, source, cb);
        });
      }
      else if (stat.isDirectory()) {
        if (options.name) {
          return importAssetFromDir(conn, options.name, assetType, source, cb);
        }
        return inferAssetNameFromDir(conn, path.join(source, 'apiproxy'), function(e, name) {
          if (e) return cb(e);
          importAssetFromDir(conn, name, assetType, source, cb);
        });
      }
      else {
        return cb({error:'source represents neither a zip nor a directory.'});
      }
    });
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
          request.get(requestOptions, commonCallback(conn, [200], function(e, result) {
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

    return mergeRequestOptions(conn, function(requestOptions) {
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

  function deployAsset0(conn, options, assetType, cb) {
    // POST \
    //   -H content-type:application/x-www-form-urlencoded \
    //   "${mgmtserver}/v1/o/${org}/e/${environment}/apis/${proxyname}/revisions/${rev}/deployments" \
    //   -d 'override=true&delay=60'
    var qparams = {
          override: (options.hasOwnProperty('override')) ? options.override : true,
          delay: (options.hasOwnProperty('delay')) ? options.delay : 60
        };
    var collection = getCollectionNameForAssetType(assetType);
    if ( ! collection) {
      return cb(new Error('The assetType is not supported'));
    }
    if (assetType == 'apiproxy') {
      qparams.basepath = options.basepath || '/';
    }
    else if (qparams.basepath) { // just in case
      throw new Error("incorrect arguments - basepath is not supported");
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('deploy %s %s r%d to env:%s',
                              assetType, options.name, options.revision, options.environment));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/x-www-form-urlencoded';
      requestOptions.body = qs.stringify(qparams);
      requestOptions.url = urljoin(conn.urlBase,
                                   'e', options.environment,
                                   collection, options.name,
                                   'revisions', options.revision,
                                   'deployments');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, commonCallback(conn, [200], cb));
    });
  }

  function undeployAsset0(conn, options, assetType, cb){
    // DELETE :mgmtserver/v1/o/:orgname/e/:envname/apis/:proxyname/revisions/:revnum/deployments
    // Authorization: :edge-auth
    var collection = getCollectionNameForAssetType(assetType);
    var rev = options.revision.name || options.revision;
    var env = options.environment.name || options.environment;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Undeploy %s %s r%d from env:%s', assetType, options.name, rev, env));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   'e', env,
                                   collection, options.name,
                                   'revisions', rev,
                                   'deployments');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  }

  function getRevisions0(conn, assetType, collectionName, options, cb) {
    // GET :mgmtserver/v1/o/:orgname/COLLECTIONNAME/:api/revisions
    if (!options.name) {
      return cb({error:"missing name for " + assetType});
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, collectionName, options.name, 'revisions');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  }

  function getDeployments0(conn, assetType, collectionName, options, cb) {
    // GET :mgmtserver/v1/o/:orgname/COLLECTIONNAME/:api/revisions/:rev/deployments
    // or
    // GET :mgmtserver/v1/o/:orgname/COLLECTIONNAME/:api/deployments
    if (!options.name) {
      return cb({error:"missing name for " + assetType});
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.revision) ?
        urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'deployments') :
                urljoin(conn.urlBase, collectionName, options.name, 'deployments');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  }

  function getResourcesForRevision0(conn, assetType, collectionName, options, cb) {
    if (!options.name) {
      return cb({error:"missing name for " + assetType});
    }
    if (!options.revision) {
      return cb({error:"missing revision for " + assetType});
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'resources');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  }

  function getPoliciesForRevision0(conn, assetType, collectionName, options, cb) {
    // GET :mgmtserver/v1/o/:orgname/COLLECTIONNAME/:api/revisions/:REV/resources
    if (!options.name) {
      return cb({error:"missing name for " + assetType});
    }
    if (!options.revision) {
      return cb({error:"missing revision for " + assetType});
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'policies');
      if (options.policy) {
        requestOptions.url = urljoin(requestOptions.url, options.policy);
      }
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  }

  function deleteDeployableAsset0(collectionName, conn, options, cb) {
    if ( ! options.name) {
      return cb(new Error('The name is required'));
    }
    mergeRequestOptions(conn, function(requestOptions) {
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
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  }

  function getDeployableAsset0(collectionName, conn, options, cb) {
    return mergeRequestOptions(conn, function(requestOptions) {
      if (options.revision) {
        if ( ! options.name) {
          return cb(new Error('The name is required when specifying a revision'));
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
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  }

  function updateDeployableAsset0(collectionName, conn, options, value, cb) {
    return mergeRequestOptions(conn, function(requestOptions) {
      if (options.revision) {
        if ( ! options.name) {
          return cb(new Error('The name is required when specifying a revision'));
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
      request.post(requestOptions, commonCallback(conn, [200], cb));
    });
  }


  // ========================================================================================


  function AppCredential(conn) {this.conn = conn;}

  AppCredential.prototype.add = function(options, cb) {
    // POST /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/create
    // {
    //   "consumerKey": "CDX-QAoqiu93ui20170301",
    //   "consumerSecret": "SomethingSomethingBeef"
    // }
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Add Credential %s/apps/%s',
                              options.developerEmail,
                              options.appName));
    }

    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase,
                                   sprintf('developers/%s/apps/%s/keys/create',
                                           options.developerEmail,
                                           options.appName));
      requestOptions.body = JSON.stringify({
        consumerKey : options.consumerKey,
        consumerSecret : options.consumerSecret
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, commonCallback(conn, [201], cb));
    });
  };

  AppCredential.prototype.del = function(options, cb) {
    // DELETE /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/CONSUMERKEY
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete Credential %s/apps/%s/keys/%s',
                              options.developerEmail,
                              options.appName,
                              options.key));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   sprintf('developers/%s/apps/%s/keys/%s',
                                           options.developerEmail,
                                           options.appName,
                                           options.key));

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  };


  function Developer(conn) { this.conn = conn; }

  Developer.prototype.create = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/developers
    // Authorization: :edge-auth
    // Content-type: application/json
    //
    // {
    //   "attributes": [ {
    //     "name" : "tag1",
    //     "value" : "whatever you like" }],
    //   "status": "active",
    //   "userName": "test-3a-HiDxfHvHrB",
    //   "lastName": "Martino",
    //   "firstName": "Dino",
    //   "email": "tet-3a-HiDxfHvHrB@apigee.com"
    // }
    var conn = this.conn;
    var email = options.developerEmail || options.email;
    if ( !email || !options.firstName || !options.lastName || !options.userName) {
      return cb({error: "missing required inputs, one of {email, firstName, lastName, userName}"});
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create Developer %s', email));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase, 'developers');
      var devAttributes = hashToArrayOfKeyValuePairs(merge(options.attributes, {
            "tool": "nodejs " + path.basename(process.argv[1])
          }));
      requestOptions.body = JSON.stringify({
        attributes : devAttributes,
        userName : options.userName,
        firstName : options.firstName,
        lastName : options.lastName,
        email: email
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      //request.debug = true;
      request.post(requestOptions, commonCallback(conn, [201], cb));
    });
  };

  Developer.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/developers/:developer
    // Authorization: :edge-auth
    var conn = this.conn;
    if ( !options.developerEmail) {
      return cb({error: "missing developerEmail"});
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete Developer %s', options.developerEmail));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'developers', options.developerEmail);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  Developer.prototype.get = function(options, cb) {
    var conn = this.conn;
    if ( ! cb) { cb = options; options = {}; }
    mergeRequestOptions(conn, function(requestOptions) {
      if (options.developerEmail || options.email) {
        requestOptions.url = urljoin(conn.urlBase, 'developers', options.developerEmail || options.email);
      }
      else if (options.developerId || options.id) {
        requestOptions.url = urljoin(conn.urlBase, 'developers', options.developerId || options.id);
      }
      else {
        requestOptions.url = urljoin(conn.urlBase, 'developers');
      }
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  function App(conn) {this.conn = conn;}

  App.prototype.get = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apps
    // or
    // GET :mgmtserver/v1/o/:orgname/apps/ID_OF_APP
    if ( ! cb) { cb = options; options = {}; }
    var conn = this.conn;
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.id) ?
        urljoin(conn.urlBase, 'apps', options.id) :
        urljoin(conn.urlBase, 'apps') + (options.expand ? '?expand=true' : '');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  App.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apps/:appid
    // Authorization: :edge-auth
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete App %s', options.appId || options.id));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apps', options.appId || option.id);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  function DeveloperApp(conn) {this.conn = conn;}

  DeveloperApp.prototype.create = function(options, cb) {
    // var THIRTY_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 30;
    // POST :e2emgmtserver/v1/o/dchiesa2/developers/Elaine@example.org/apps
    // Content-type: application/json
    // Authorization: :edge-auth-e2e
    //
    // {
    //   "attributes" : [ {
    //     "name" : "attrname",
    //     "value" : "attrvalue"
    //   } ],
    //   "apiProducts": [ "Manual-Approval-1" ],
    //   "keyExpiresIn" : "86400000",
    //   "name" : "ElaineApp2"
    // }
    var conn = this.conn;
    var email = options.developer || options.developerEmail || options.email;
    var name = options.appName || options.name;
    if ( !email || !name || !options.apiProduct) {
      return cb({error: "missing required inputs, one of {developer, appName, apiProduct}"});
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create App %s for %s', name, email));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase, 'developers', email, 'apps');
      var DEFAULT_EXPIRY = -1;
      var keyExpiresIn = DEFAULT_EXPIRY;
      if (options.expiry) {
        keyExpiresIn = resolveExpiry(options.expiry);
      }
      else {
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('Using default expiry of %d', keyExpiresIn));
        }
      }
      var appAttributes = hashToArrayOfKeyValuePairs(merge(options.attributes || {}, {
            "tool": "nodejs " + path.basename(process.argv[1])
          }));
      requestOptions.body = JSON.stringify({
        attributes : appAttributes,
        apiProducts: [options.apiProduct],
        keyExpiresIn : keyExpiresIn,
        name: name
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      //request.debug = true;
      request.post(requestOptions, commonCallback(conn, [201], cb));
    });
  };

  DeveloperApp.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/developers/:developer/apps/:appname
    // Authorization: :edge-auth
    var conn = this.conn;
    var name = options.appName || options.name;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete App %s for Developer %s', name, options.developerEmail));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'developers', options.developerEmail, 'apps', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  DeveloperApp.prototype.get = function(options, cb) {
    var conn = this.conn;
    var name = options.appName || options.name;
    var email = options.developerEmail || options.email;
    if (!email) {
      throw new Error("missing developer email");
    }
    // if (conn.verbosity>0) {
    //   if (options.appName || options.name) {
    //   utility.logWrite(sprintf('Get Developer App %s/apps/%s',
    //                           options.developerEmail,
    //                            options.appName));
    //   }
    //   else {
    //     utility.logWrite(sprintf('Get Developer Apps %s',
    //                              options.developerEmail));
    //   }
    // }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.appName || options.name) ?
        urljoin(conn.urlBase, 'developers', email, 'apps') :
        urljoin(conn.urlBase, 'developers', email, 'apps', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  };


  function FlowHook(conn) { this.conn = conn; }

  FlowHook.prototype.get = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/e/:envname/flowhooks
    // or
    // GET :mgmtserver/v1/o/:orgname/e/flowhooks/:flowhook
    var env = options.environment || options.env;
    if ( ! env) {
      return cb(new Error('missing option: environment'));
    }
    var conn = this.conn;
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.name) ?
        urljoin(conn.urlBase, 'e', env, 'flowhooks', options.name) :
        urljoin(conn.urlBase, 'e', env, 'flowhooks') ;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  FlowHook.prototype.put = function(options, cb) {
    // PUT :mgmtserver/v1/o/:orgname/e/flowhooks/:flowhook
    // {
    //   "continueOnError" : "true",
    //   "name" : "myFlowHook2",
    //   "sharedFlow" : "CDX-SharedFlow"
    // }
    var env = options.environment || options.env;
    if ( ! env) {
      return cb(new Error('missing option: environment'));
    }
    if ( ! options.name) {
      return cb(new Error('missing option: name'));
    }
    if ( ! options.sharedFlow) {
      return cb(new Error('missing option: sharedFlow'));
    }
    var conn = this.conn;
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', env, 'flowhooks', options.name);
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({
        continueOnError: options.continueOnError || true,
        name : 'flowhook-' + new Date().valueOf(),
        sharedFlow : options.sharedFlow});
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('PUT %s', requestOptions.url));
      }
      request.put(requestOptions, commonCallback(conn, [200], cb));
    });
  };


  function ApiProduct(conn) { this.conn = conn; }

  ApiProduct.prototype.create = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/apiproducts/:product
    // Content-Type: application/json
    // Authorization: :edge-auth
    //
    // {
    //   "name" : ":product",
    //   "attributes" : [ {"name": "created by", "value" : "emacs"} ],
    //   "approvalType" : "manual",
    //   "displayName" : ":product",
    //   "proxies" : ["proxy1", "proxy2"],
    //   "scopes" : ["read", "write", "something"],
    //   "environments" : [ "prod" ]
    // }
    var conn = this.conn;
    if (conn.verbosity>0) {
      if (options.proxy) {
        utility.logWrite(sprintf('Create API Product %s with proxy %s', options.productName, options.proxy));
      }
      else if (options.proxies) {
        utility.logWrite(sprintf('Create API Product %s with proxies %s', options.productName, JSON.stringify(options.proxies)));
      } else {
        utility.logWrite(sprintf('Create API Product %s with no proxy', options.productName));
      }
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase, 'apiproducts');
      var prodAttributes = hashToArrayOfKeyValuePairs(merge(options.attributes || {}, {
            "tool": "nodejs " + path.basename(process.argv[1])
          }));
      var rOptions = {
            name : options.productName || options.name,
            proxies : [ ],
            attributes : prodAttributes,
            approvalType : options.approvalType || "manual",
            displayName : options.displayName || options.productName || options.name,
            environments : options.environments || options.envs,
            scopes : options.scopes
          };
      if (options.proxy) {
        rOptions.proxies.push(options.proxy);
      }
      else if (options.proxies && Array.isArray(options.proxies) ) {
        rOptions.proxies = options.proxies;
      }
      requestOptions.body = JSON.stringify(rOptions);

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      // request.debug = true;
      request.post(requestOptions, commonCallback(conn, [201], cb));
    });
  };

  ApiProduct.prototype.get = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apiproducts
    // or
    // GET :mgmtserver/v1/o/:orgname/apiproducts/NAME_OF_PRODUCT
    if ( ! cb) { cb = options; options = {}; }
    var conn = this.conn;
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.name) ?
        urljoin(conn.urlBase, 'apiproducts', options.name) :
        urljoin(conn.urlBase, 'apiproducts') + (options.expand ? '?expand=true' : '');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  ApiProduct.prototype.update = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/apiproducts/NAME_OF_PRODUCT
    if ( ! options.name ) {
      return cb(new Error('missing option: name'));
    }
    var conn = this.conn;
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apiproducts', options.name);
      requestOptions.body = JSON.stringify(options);
      requestOptions.headers['content-type'] = 'application/json';
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  ApiProduct.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apiproducts/:apiproductname
    // Authorization: :edge-auth
    var conn = this.conn;
    var name = options.productName || options.name;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete API Product %s', name));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apiproducts', name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  };


  function SharedFlow(conn) { this.conn = conn; }

  SharedFlow.prototype.get = function(options, cb) {
    var conn = this.conn;
    return getDeployableAsset0('sharedflows', conn, options, cb);
  };

  SharedFlow.prototype.getRevisions = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/sharedflows/:sharedflow/revisions
    var conn = this.conn;
    return getRevisions0( conn, 'sharedflow', 'sharedflows', options, cb);
  };

  SharedFlow.prototype.getDeployments = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/sharedflows/:name/revisions/:revision/deployments
    // or
    // GET :mgmtserver/v1/o/:orgname/sharedflows/:name/deployments
    var conn = this.conn;
    return getDeployments0(conn, 'sharedflow', 'sharedflows', options, cb);
  };

  SharedFlow.prototype.getResourcesForRevision = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/sharedflows/:sf/revisions/:REV/resources
    var conn = this.conn;
    return getResourcesForRevision0(conn, 'sharedflow', 'sharedflows', options, cb);
  };

  SharedFlow.prototype.getPoliciesForRevision = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/sharedflows/:name/revisions/:revision/policies
    var conn = this.conn;
    return getPoliciesForRevision0(conn, 'sharedflow', 'sharedflows', options, cb);
  };

  SharedFlow.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/sharedflows/:name
    // or
    // DELETE :mgmtserver/v1/o/:orgname/sharedflows/:name/revision/:revision
    var conn = this.conn;
    return deleteDeployableAsset0('sharedflows', conn, options, cb);
  };

  SharedFlow.prototype.deploy = function(options, cb) {
    var conn = this.conn;
    return deployAsset0(conn, options, 'sharedflowbundle', cb);
  };

  SharedFlow.prototype.undeploy = function(options, cb) {
    var conn = this.conn;
    return undeployAsset0(conn, options, 'sharedflowbundle', cb);
  };

  SharedFlow.prototype.export = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/sharedflows/:name/revisions/:revision?format=bundle
    var conn = this.conn;
    export0(conn, 'sharedflow', 'sharedflows', options, cb);
  };

  SharedFlow.prototype.importFromDir = function(options, cb) {
    var conn = this.conn;
    var srcDir = path.resolve(options.srcDir || options.source);
    if (srcDir.endsWith('/sharedflowbundle')) {
      srcDir = path.resolve(path.join(srcDir, '..'));
    }
    // if (conn.verbosity>0) {
    //   utility.logWrite(sprintf('import sharedflow %s from dir %s', options.name, options.srcDir));
    // }
    return importAssetFromDir(conn, options.name, 'sharedflowbundle', srcDir, cb);
  };

  SharedFlow.prototype.importFromZip = function(options, cb) {
    // curl -X POST "${mgmtserver}/v1/o/$org/sharedflows?action=import&name=$sfname" -T $zipname -H "Content-Type: application/octet-stream"
    var conn = this.conn;
    var source = path.resolve(options.zipArchive || options.source);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('import sharedflow %s from zip %s', options.name, source));
    }
    return importAssetFromZip(conn, options.name, 'sharedflowbundle', source, cb);
  };

  SharedFlow.prototype.import = function(options, cb) {
    // import from either a zip or a directory.
    var conn = this.conn;
    return import0(conn, options, 'sharedflowbundle', cb);
  };


  function Cache(conn) {this.conn = conn;}

  Cache.prototype.get = function(options, cb) {
    var conn = this.conn;
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', options.env, 'caches');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  Cache.prototype.create = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/e/:env/caches?name=whatev
    // Authorization: :edge-auth
    // Content-type: application/json
    //
    // { .... }
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create Cache %s', options.name));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      if (!options.env) {
        return cb({error:"missing environment name for cache"});
      }
      requestOptions.url = urljoin(conn.urlBase, 'e', options.env, 'caches') + '?name=' + options.name;
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({
        description: "cache for general purpose use",
        distributed : true,
        expirySettings: {
          timeoutInSec : { value : 86400 },
          valuesNull: false
        },
        compression: {
          minimumSizeInKB: 1024
        },
        persistent: false,
        skipCacheIfElementSizeInKBExceeds: "2048",
        diskSizeInMB: 0,
        overflowToDisk: false,
        maxElementsOnDisk: 1,
        maxElementsInMemory: 3000000,
        inMemorySizeInKB: 8000
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, commonCallback(conn, [201], cb));
    });
  };

  Cache.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/e/:env/caches/:cachename
    // Authorization: :edge-auth
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete Cache %s', options.name));
    }
    if (!options.env) {
      return cb({error:"missing environment name for cache"});
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'e', options.env, 'caches', options.name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  };


  function Kvm(conn) {this.conn = conn;}

  function resolveKvmPath(conn, options) {
    if (options && options.env) {
      return urljoin(conn.urlBase, 'e', options.env, 'keyvaluemaps');
    }
    if (options && options.proxy) {
      return urljoin(conn.urlBase, 'apis', options.proxy, 'keyvaluemaps');
    }
    return urljoin(conn.urlBase, 'keyvaluemaps');
  }

  function putKvm0(conn, options, cb) {
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = resolveKvmPath(conn, options);

      if (conn.orgProperties['features.isCpsEnabled']) {
        if (!options.key || !options.value) {
          throw new Error("missing key or value");
        }
        requestOptions.url = urljoin(requestOptions.url, options.kvm, 'entries', options.key);
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('GET %s', requestOptions.url));
        }
        request.get(requestOptions, function(error, response, body) {
          if (error) {
            utility.logWrite(error);
            return cb(error, body);
          }
          requestOptions.url = resolveKvmPath(conn, options);
          requestOptions.url = urljoin(requestOptions.url, options.kvm, 'entries');

          if (response.statusCode == 200) {
            // Update is required if the key already exists.
            if (conn.verbosity>0) {
              utility.logWrite('KVM entry update');
            }
            requestOptions.url = urljoin(requestOptions.url, options.key);
          }
          else if (response.statusCode == 404) {
            if (conn.verbosity>0) {
              utility.logWrite('KVM entry create');
            }
          }

          if ((response.statusCode == 200) || (response.statusCode == 404)) {
            //
            // POST :mgmtserver/v1/o/:orgname/e/:env/keyvaluemaps/:mapname/entries/key1
            // Authorization: :edge-auth
            // content-type: application/json
            //
            // {
            //    "name" : "key1",
            //    "value" : "value_one_updated"
            // }
            requestOptions.headers['content-type'] = 'application/json';
            requestOptions.body = JSON.stringify({ name: options.key, value : options.value });
            if (conn.verbosity>0) {
              utility.logWrite(sprintf('POST %s', requestOptions.url));
            }
            request.post(requestOptions, commonCallback(conn, [200, 201], cb));
          }
          else {
            if (conn.verbosity>0) {
              utility.logWrite(body);
            }
            cb({error: 'bad status', statusCode: response.statusCode });
          }
        });
      }
      else {
        if (!options.entries && (!options.key || !options.value)) {
          throw new Error("missing entries or key/value");
        }
        // for non-CPS KVM, use a different model to add/update an entry.
        //
        // POST :mgmtserver/v1/o/:orgname/e/:env/keyvaluemaps/:mapname
        // Authorization: :edge-auth
        // content-type: application/json
        //
        // {
        //    "entry": [ {"name" : "key1", "value" : "value_one_updated" } ],
        //    "name" : "mapname"
        // }
        requestOptions.url = urljoin(requestOptions.url, options.kvm);
        requestOptions.headers['content-type'] = 'application/json';
        var entry = options.entries ?
          hashToArrayOfKeyValuePairs(options.entries) :
          [{ name: options.key, value : options.value }] ;

        requestOptions.body = JSON.stringify({ name: options.kvm, entry: entry });
        if (conn.verbosity>0) {
          utility.logWrite(sprintf('POST %s', requestOptions.url));
        }
        request.post(requestOptions, commonCallback(conn, [200, 201], cb));
      }
    });
  }


  Kvm.prototype.get = function(options, cb) {
    var conn = this.conn;
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = resolveKvmPath(conn, options);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  Kvm.prototype.create = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/e/:env/keyvaluemaps
    // Authorization: :edge-auth
    // Content-type: application/json
    //
    // {
    //  "encrypted" : "false",
    //  "name" : ":mapname",
    //   "entry" : [   {
    //     "name" : "key1",
    //     "value" : "value_one"
    //     }, ...
    //   ]
    // }
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create KVM %s', options.name));
    }

    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = resolveKvmPath(conn, options);
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({
        encrypted : options.encrypted ? "true" : "false",
        name : options.name,
        entry : options.entries ? hashToArrayOfKeyValuePairs(options.entries) : []
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, commonCallback(conn, [201], cb));
    });
  };

  Kvm.prototype.put = function(options, cb) {
    var conn = this.conn;
    if ( ! conn.orgProperties) {
      var org = new Organization(conn);
      org.getProperties(function(e, result) {
        if (e) { return cb(e, result); }
        putKvm0(conn, options, cb);
      });
    }
    else {
      return putKvm0(conn, options, cb);
    }
  };

  Kvm.prototype.del = function(options, cb) {
    // eg,
    // DELETE :mgmtserver/v1/o/:orgname/e/:env/keyvaluemaps/:kvmname
    // Authorization: :edge-auth
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete KVM %s', options.name));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = resolveKvmPath(conn, options);
      requestOptions.url = urljoin(requestOptions.url, options.name);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  };


  function ApiProxy(conn) {
    this.conn = conn;
  }

  ApiProxy.prototype.get = function(options, cb) {
    var conn = this.conn;
    return getDeployableAsset0('apis', conn, options, cb);
  };

  ApiProxy.prototype.update = function(options, value, cb) {
    var conn = this.conn;
    return updateDeployableAsset0('apis', conn, options, value, cb);
  };

  ApiProxy.prototype.getRevisions = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions
    var conn = this.conn;
    return getRevisions0(conn, 'proxy', 'apis', options, cb);
  };

  ApiProxy.prototype.getDeployments = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:name/revisions/:revision/deployments
    // or
    // GET :mgmtserver/v1/o/:orgname/apis/:name/deployments
    var conn = this.conn;
    return getDeployments0(conn, 'proxy', 'apis', options, cb);
  };

  ApiProxy.prototype.getResourcesForRevision = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:revision/resources
    var conn = this.conn;
    return getResourcesForRevision0(conn, 'proxy', 'apis', options, cb);
  };

  ApiProxy.prototype.getPoliciesForRevision = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:REV/resources
    var conn = this.conn;
    return getPoliciesForRevision0(conn, 'proxy', 'apis', options, cb);
  };

  ApiProxy.prototype.getProxyEndpoints = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:api/revisions/:REV/proxies
    var conn = this.conn;
    if (!options.name) {
      return cb({error:"missing name for apiproxy"});
    }
    if (!options.revision) {
      return cb({error:"missing revision for apiproxy"});
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apis', options.name, 'revisions', options.revision, 'proxies');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  ApiProxy.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apis/:name
    // or
    // DELETE :mgmtserver/v1/o/:orgname/apis/:name/revisions/:revision
    var conn = this.conn;
    return deleteDeployableAsset0('apis', conn, options, cb);
  };

  ApiProxy.prototype.deploy = function(options, cb) {
    return deployAsset0(this.conn, options, 'apiproxy', cb);
  };

  ApiProxy.prototype.undeploy = function(options, cb) {
    return undeployAsset0(this.conn, options, 'apiproxy', cb);
  };

  ApiProxy.prototype.export = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:name/revisions/:rev?format=bundle
    var conn = this.conn;
    export0(conn, 'apiproxy', 'apis', options, cb);
  };

  ApiProxy.prototype.importFromDir = function(options, cb) {
    var conn = this.conn;
    var srcDir = path.resolve(options.srcDir || options.source);
    if (srcDir.endsWith('/apiproxy')) {
      srcDir = path.resolve(path.join(srcDir, '..'));
    }
    // if (conn.verbosity>0) {
    //   utility.logWrite(sprintf('import proxy %s from dir %s', optionsName, srcDir));
    // }
    return importAssetFromDir(conn, options.name, 'apiproxy', srcDir, cb);
  };

  ApiProxy.prototype.importFromZip = function(options, cb) {
    // curl -X POST "${mgmtserver}/v1/o/$org/apis?action=import&name=$proxyname" -T $zipname -H "Content-Type: application/octet-stream"
    var conn = this.conn;
    var source = path.resolve(options.zipArchive || options.source);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('import proxy %s from zip %s', options.name, source));
    }
    return importAssetFromZip(conn, options.name, 'apiproxy', source, cb);
  };

  ApiProxy.prototype.import = function(options, cb) {
    // import from either a zip or a directory.
    var conn = this.conn;
    return import0(conn, options, 'apiproxy', cb);
  };

  // Connection properties:
  //   get
  //   refreshToken
  //   getNewToken
  //   getEnvironments
  //   proxies { get, deploy, undeploy, del, importFromDir, importFromZip }
  //   caches { get, create, del }
  //   kvms { get, create, put, del }
  //   apps { get }
  //   sharedflows { deploy, undeploy, importFromDir, importFromZip }
  //   products { get, create, del}
  //   developers { get, create, del }
  //   developerapps { get, create, del }
  //   appcredentials { add, del }

  module.exports = {
    connect                      : _connect
  };

}());
