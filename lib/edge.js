// edge.js
// ------------------------------------------------------------------
//
// library of functions for Apigee Edge.
//
// created: Mon Jun  6 17:32:20 2016
// last saved: <2017-June-15 16:00:47>

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
      utility = require('./utility.js'),
      request = require('request'),
      gEdgeSaasMgmtServer = 'https://api.enterprise.apigee.com';

//require('request-debug')(request);

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

  Connection.prototype.getNewToken = function(pass, cb) {
    var conn = this;
    var formparams = {
          username: conn.user,
          password: pass,
          grant_type : 'password'
        };
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
    this.sharedflows = new SharedFlow(conn);
    this.products = new ApiProduct(conn);
    this.appcredentials = new AppCredential(conn);
    this.flowhooks = new FlowHook(conn);
    this.environments = new Environment(conn);
  }

  Organization.prototype.get = function(url, cb) {
    var conn = this.conn;
    url = urljoin(conn.urlBase, url);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', url));
    }
    request.get(url, {headers: conn.requestHeaders}, commonCallback(conn, [200], cb));
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


  function trimSlash(s) {
    if (s.slice(-1) == '/') { s = s.slice(0, -1); }
    return s;
  }

  function _connect(options, cb) {
    // options = {user: "foo", password: "bar", mgmtServer: "https://api.ent.api.com", org: "orgname"}
    // or
    // options = {user: "foo", mgmtServer: "https://api.ent.api.com", org: "orgname"}
    // or
    // options = {user: "foo", org: "orgname"}
    function maybeGetNewToken() {
        if (!options.password ) {
          throw new Error("missing password");
        }
        if (!options.no_token) {
          org = new Organization(c);
          return c.getNewToken(options.password, function(e, result){ cb(e, org); });
        }
        else {
          // for some reason, the caller does not want to use tokens
          c.requestHeaders.authorization = 'Basic ' + base64Encode(options.user + ':' + options.password);
          org = new Organization(c);
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
    c.org = options.org;

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

    var org;
    checkMgmtServerFormat(mgmtServer);
    c.urlBase = urljoin(mgmtServer, '/v1/o/', options.org);
    c.requestHeaders = { accept : 'application/json'} ;
    c.verbosity = options.verbosity || 0;
    if (c.verbosity) {
      utility.logWrite('connect: ' + JSON.stringify(c));
    }
    // use oauth tokens for Admin API, only for Edge SaaS
    if (mgmtServer == gEdgeSaasMgmtServer) {
      var stashedToken;
      if (!options.no_token) {
          stashedToken = tokenMgmt.currentToken(options.user);
      }
      if (stashedToken) {
        if (options.verbosity) {
          utility.logWrite('found stashed token.');
        }
        org = new Organization(c);
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
      return org.get('', function(e, result){ cb(e, org); });
    }
  }


  // to handle expiry of the oauth token
  function mergeRequestOptions(conn, cb) {
    var rh = conn.requestHeaders;
    if (rh && rh.authorization &&
        conn.user && rh.authorization.indexOf('Bearer ') === 0) {
      var stashedToken = tokenMgmt.currentToken(conn.user);
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
        result = JSON.parse(body);
        cb(null, result);
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
            'Authorization' : 'Basic ZWRnZWNsaTplZGdlY2xpc2VjcmV0'
          },
          body : qs.stringify(formparams),
          url : 'https://login.apigee.com/oauth/token'
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
        tokenMgmt.stashToken(conn.user, result);
        conn.requestHeaders.authorization = 'Bearer ' + result.access_token;
      }
      cb(e, result);
    }));
  }

  function deployAsset(conn, options, assetType, cb) {
    // POST \
    //   -H content-type:application/x-www-form-urlencoded \
    //   "${mgmtserver}/v1/o/${org}/e/${environment}/apis/${proxyname}/revisions/${rev}/deployments" \
    //   -d 'override=true&delay=60'
    var qparams = {
          override: (options.hasOwnProperty('override')) ? options.override : true,
          delay: (options.hasOwnProperty('delay')) ? options.delay : 60
        };
    var collection = getCollectionForAssetType(assetType);
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

  function undeployAsset(conn, options, assetType, cb){
    // DELETE :mgmtserver/v1/o/:orgname/e/:envname/apis/:proxyname/revisions/:revnum/deployments
    // Authorization: :edge-auth
    var collection = getCollectionForAssetType(assetType);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Undeploy %s %s r%d from env:%s', assetType, options.name, options.revision, options.environment));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   'e', options.environment,
                                   collection, options.name,
                                   'revisions', options.revision,
                                   'deployments');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
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

  function produceBundleZip(srcDir, assetType, verbosity, cb) {
    var pathToZip = path.resolve(path.join(srcDir, assetType));
    var checkName = function(name) {
          if (name.endsWith('~')) return false;
          if (name.endsWith('node_modules.zip')) return false;
          if (name.indexOf('/node_modules/')>0) return false;
          var b = path.basename(name);
          if (b.endsWith('#') && b.startsWith('#')) return false;
          return true;
        };

    verifyPathIsDir(pathToZip, function(e) {
      if (e) { return cb(e); }
      var tmpdir = process.env.tmpdir || '/tmp';
      var archiveName = path.join(tmpdir, assetType + '-' + new Date().getTime() + '.zip');
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

  function getCollectionForAssetType(assetType) {
    var supportedTypes = { apiproxy: 'apis', sharedflowbundle: 'sharedflows'};
    return supportedTypes[assetType];
  }

  function needNpmInstall(collection, zipArchive) {
    if (collection != 'apis') { return false; }
    var wantInstall = false;
    var zip = new AdmZip(zipArchive);
    var zipEntries = zip.getEntries();
    zipEntries.forEach(function(entry) {
      if (entry.entryName == 'apiproxy/resources/node/package.json') {
        wantInstall = true;
      }
    });
    return wantInstall;
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

  function internalImportBundleFromZip(conn, assetName, assetType, zipArchive, cb) {
    // eg,
    // curl -X POST -H Content-Type:application/octet-stream "${mgmtserver}/v1/o/$org/apis?action=import&name=$proxyname" -T $zipname
    // or
    // curl -X POST -H content-type:application/octet-stream "${mgmtserver}/v1/o/$org/sharedflows?action=import&name=$sfname" -T $zipname
    if ( ! fs.existsSync(zipArchive)) {
      return cb(new Error('The archive does not exist'));
    }
    var collection = getCollectionForAssetType(assetType);
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

  function importAssetFromDir(conn, name, srcDir, assetType, cb) {
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
        internalImportBundleFromZip(conn, name, assetType, archiveName, function(e, result) {
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

  function _inferAssetName(dir, cb) {
    findXmlFiles(dir, function(e, files){
      if (e) return cb(e);
      if (files.length != 1)
        return cb(new Error(sprintf("found %d files, expected 1", files.length)));
      var parser = new xml2js.Parser();
      fs.readFile(files[0], 'utf8', function(e, data) {
        if (e) return cb(e);
        parser.parseString(data, function (e, result) {
          if (e) return cb(e);
          if (result.SharedFlowBundle) {
            return cb(null, result.SharedFlowBundle.$.name);
          }
          if (result.APIProxy) {
            return cb(null, result.APIProxy.$.name);
          }
          cb(new Error('cannot determine asset name'));
        });
      });
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

  function uglifyAttrs(hash) {
    return Object.keys(hash).map(function(key){
      return { name : key, value : hash[key]};
    });
  }


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
    if ( !options.developerEmail || !options.firstName || !options.lastName || !options.userName) {
      return cb({error: "missing required inputs"});
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create Developer %s', options.developerEmail || 'unknown'));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase, 'developers');

      var devAttributes = uglifyAttrs(merge(options.attributes, {
            "created by": "apigee-edge-js"
          }));

      requestOptions.body = JSON.stringify({
        attributes : devAttributes,
        userName : options.userName,
        firstName : options.firstName,
        lastName : options.lastName,
        email: options.developerEmail
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
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
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.developerEmail) ?
        urljoin(conn.urlBase, 'developers', options.developerEmail) :
        urljoin(conn.urlBase, 'developers');
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
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
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create App %s for %s', options.appName, options.developerEmail));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase,
                                   'developers',options.developerEmail,
                                   'apps');
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

      var appAttributes = uglifyAttrs(merge(options.attributes, {
            "created by": "nodejs " + path.basename(process.argv[1])
          }));

      requestOptions.body = JSON.stringify({
        attributes : appAttributes,
        apiProducts: [options.apiProduct],
        keyExpiresIn : keyExpiresIn,
        name: options.appName
      });

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, commonCallback(conn, [201], cb));
    });
  };

  DeveloperApp.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/developers/:developer/apps/:appname
    // Authorization: :edge-auth
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete App %s for Developer %s', options.appName, options.developerEmail));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'developers', options.developerEmail, 'apps', options.appName);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  DeveloperApp.prototype.get = function(options, cb) {
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Get Developer App %s/apps/%s',
                              options.developerEmail,
                              options.appName));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase,
                                   sprintf('developers/%s/apps/%s',
                                           options.developerEmail,
                                           options.appName));
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

  function reallyCreateProduct(conn, options, cb) {
    if (conn.verbosity>0) {
      if (options.proxy) {
        utility.logWrite(sprintf('Create API Product %s with proxy %s', options.productName, options.proxy));
      }
      else {
        utility.logWrite(sprintf('Create API Product %s with no proxy', options.productName));
      }
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase, 'apiproducts');
      var prodAttributes = uglifyAttrs(merge(options.attributes, {
            "created by": "apigee-edge-js"
          }));

      var rOptions = {
            name : options.productName,
            proxies : [ ],
            attributes : prodAttributes,
            approvalType : options.approvalType || "manual",
            displayName : options.productName,
            environments : options.environments || options.envs,
            scopes : options.scopes
          };

      if (options.proxy) {
        rOptions.proxies.push(options.proxy);
      }
      requestOptions.body = JSON.stringify(rOptions);

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, commonCallback(conn, [201], cb));
    });
  }

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
    // if ( ! options.envs) {
    //   conn.getEnvironments(function(e, result) {
    //     reallyCreateProduct(conn, merge(options, {envs: result}), cb);
    //   });
    // }
    // else {
    //   reallyCreateProduct(conn, options, cb);
    // }
    reallyCreateProduct(conn, options, cb);
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
        urljoin(conn.urlBase, 'apiproducts') ;
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], cb));
    });
  };

  ApiProduct.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apiproducts/:apiproductname
    // Authorization: :edge-auth
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete API Product %s', options.productName));
    }
    mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apiproducts', options.productName);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, commonCallback(conn, [200], cb));
    });
  };


  function SharedFlow(conn) { this.conn = conn; }

  SharedFlow.prototype.get = function(options, cb) {
    var conn = this.conn;
    return internalGetDeployableAsset('sharedflows', conn, options, cb);
  };

  SharedFlow.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/sharedflows/:name
    var conn = this.conn;
    return internalDeleteDeployableAsset('sharedflows', conn, options, cb);
  };


  SharedFlow.prototype.deploy = function(options, cb) {
    var conn = this.conn;
    return deployAsset(conn, options, 'sharedflowbundle', cb);
  };

  SharedFlow.prototype.undeploy = function(options, cb) {
    var conn = this.conn;
    return undeployAsset(conn, options, 'sharedflowbundle', cb);
  };

  SharedFlow.prototype.importFromDir = function(options, cb) {
    var conn = this.conn;
    srcDir = path.resolve(srcDir);
    if (srcDir.endsWith('/sharedflowbundle')) {
      srcDir = path.resolve(path.join(srcDir, '..'));
    }
    // if (conn.verbosity>0) {
    //   utility.logWrite(sprintf('import sharedflow %s from dir %s', options.name, options.srcDir));
    // }
    return importAssetFromDir(conn, options.name, options.srcDir, 'sharedflowbundle', cb);
  };

  SharedFlow.prototype.importFromZip = function(options, cb) {
    // curl -X POST "${mgmtserver}/v1/o/$org/sharedflows?action=import&name=$sfname" -T $zipname -H "Content-Type: application/octet-stream"
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('import sharedflow %s from zip %s', options.name, options.zipArchive));
    }
    return internalImportBundleFromZip(conn, options.name, 'sharedflowbundle', options.zipArchive, cb);
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
              utility.logWrite('KVM update');
            }
            requestOptions.url = urljoin(requestOptions.url, options.key);
          }
          else if (response.statusCode == 404) {
            if (conn.verbosity>0) {
              utility.logWrite('KVM create');
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
        requestOptions.body = JSON.stringify({ name: options.kvm, entry: [{ name: options.key, value : options.value }] });
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
        entry : options.entries ? uglifyAttrs(options.entries) : []
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, commonCallback(conn, [201], cb));
    });
  };

  function transformToHash(properties) {
    var hash = {};
    properties.forEach(function(item) {
      hash[item.name] = item.value;
    });
    return hash;
  }

  function checkOrgProperties(conn, cb) {
    var org = new Organization(conn);
    return org.get('', cb);
  }

  Kvm.prototype.put = function(options, cb) {
    var conn = this.conn;
    if ( ! conn.orgProperties) {
      return checkOrgProperties(conn, function(e, result) {
        if (e) {
          console.log(e);
          return cb(e, result);
        }
        conn.orgProperties = transformToHash(result.properties.property);
        return putKvm0(conn, options, cb);
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

  function internalDeleteDeployableAsset(collectionName, conn, options, cb) {
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

  function internalGetDeployableAsset(collectionName, conn, options, cb) {
    return mergeRequestOptions(conn, function(requestOptions) {
      if (options.revision) {
        if ( ! options.name) {
          return cb(new Error('The name is required when specifying a revision'));
        }
        requestOptions.url = (options.policy) ?
          urljoin(conn.urlBase, collectionName, options.name, 'revisions', options.revision, 'policies', options.policy) :
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

  function ApiProxy(conn) {
    this.conn = conn;
  }

  ApiProxy.prototype.get = function(options, cb) {
    var conn = this.conn;
    return internalGetDeployableAsset('apis', conn, options, cb);
  };

  ApiProxy.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apis/:name
    var conn = this.conn;
    return internalDeleteDeployableAsset('apis', conn, options, cb);
  };

  ApiProxy.prototype.deploy = function(options, cb) {
    return deployAsset(this.conn, options, 'apiproxy', cb);
  };

  ApiProxy.prototype.undeploy = function(options, cb) {
    return undeployAsset(this.conn, options, 'apiproxy', cb);
  };

  ApiProxy.prototype.export = function(options, cb) {
    // GET :mgmtserver/v1/o/:orgname/apis/:name/revisions/:rev?format=bundle
    var conn = this.conn;
    if (!options.name) {
      return cb({error:"missing name for proxy"});
    }
    if (!options.revision) {
      return cb({error:"missing revision for proxy"});
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Export Proxy %s %s', options.name, options.revision));
    }
    return mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'apis', options.name, 'revisions', options.revision) + '?format=bundle';
      requestOptions.headers.accept = '*/*'; // not application/octet-stream !
      requestOptions.encoding = null; // necessary to get
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, commonCallback(conn, [200], function(e, result) {
        // The filename in the response is meaningless, like this:
        // content-disposition: 'attachment; filename="apiproxy3668830505762375956.zip"
        // Here, we create a meaningful filename.
        if (e) return cb(e, result);
        var datestring = new Date().toISOString().replace(/-/g,'').replace(/:/g,'').replace('T','-').replace(/\.[0-9]+Z/,'');
        var filename = sprintf('apiproxy-%s-%s-r%s-%s.zip', conn.org, options.name, options.revision, datestring);
        // fs.writeFileSync(filename, result);
        return cb(e, {filename:filename, buffer:result});
      }));
    });
  };

  ApiProxy.prototype.importFromDir = function(proxyName, srcDir, cb) {
    var conn = this.conn;
    srcDir = path.resolve(srcDir);
    if (srcDir.endsWith('/apiproxy')) {
      srcDir = path.resolve(path.join(srcDir, '..'));
    }
    // if (conn.verbosity>0) {
    //   utility.logWrite(sprintf('import proxy %s from dir %s', proxyName, srcDir));
    // }
    return importAssetFromDir(conn, proxyName, srcDir, 'apiproxy', cb);
  };

  ApiProxy.prototype.importFromZip = function(options, cb) {
    // curl -X POST "${mgmtserver}/v1/o/$org/apis?action=import&name=$proxyname" -T $zipname -H "Content-Type: application/octet-stream"
    var conn = this.conn;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('import proxy %s from zip %s', options.name, options.zipArchive));
    }
    return internalImportBundleFromZip(conn, options.name, 'apiproxy', options.zipArchive, cb);
  };

  // Connection properties:
  //   get
  //   refreshToken
  //   getNewToken
  //   getEnvironments
  //   proxies { get, deploy, undeploy, del, importFromDir, importFromZip }
  //   caches { get, create, del }
  //   kvms { get, create, put, del }
  //   sharedflows { deploy, undeploy, importFromDir, importFromZip }
  //   products { get, create, del}
  //   developers { get, create, del }
  //   developerapps { get, create, del }
  //   appcredentials { add, del }

  module.exports = {
    connect                      : _connect,
    inferAssetName               : _inferAssetName
  };

}());
