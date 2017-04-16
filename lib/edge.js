// edge.js
// ------------------------------------------------------------------
//
// library of functions for Apigee Edge
//
// created: Mon Jun  6 17:32:20 2016
// last saved: <2017-April-16 16:16:13>

(function (){
  var path = require('path'),
      fs = require('fs'),
      qs = require('qs'),
      tokenMgmt = require('./tokenMgmt.js'),
      archiver = require('archiver'),
      sprintf = require('sprintf-js').sprintf,
      xml2js = require('xml2js'),
      merge = require('merge'),
      common = require('./utility.js'),
      request = require('request'),
      gEdgeSaasMgmtServer = 'https://api.enterprise.apigee.com',
      gVerbosity = 1,
      gRequestOptions, gUrlBase, gOrgProperties = null;

//require('request-debug')(request);

  function commonCallback(okstatuses, cb) {
    return function (error, response, body) {
      var result;
      if (gVerbosity>0) {
        common.logWrite('status: ' + response.statusCode );
      }
      if (error) {
        console.log(error);
        return cb(error, body);
      }
      if (okstatuses.indexOf(response.statusCode) > -1) {
        result = JSON.parse(body);
        cb(null, result);
      }
      else {
        console.log(body);
        cb({error: 'bad status', statusCode: response.statusCode });
      }
    };
  }

  function checkMgmtServerFormat(mgmtserver) {
    if ( ! mgmtserver || ! (mgmtserver.startsWith('http://') || mgmtserver.startsWith('https://'))) {
      throw new Error("use an http or https url for the management server.");
    }
  }

  function _getToken(cb) {
    var qparams = {
          username: gRequestOptions.auth.user,
          password: gRequestOptions.auth.pass,
          grant_type : 'password'
        };

    var requestOptions = {
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization' : 'Basic ZWRnZWNsaTplZGdlY2xpc2VjcmV0'
          },
          body : qs.stringify(qparams),
          url : 'https://login.apigee.com/oauth/token'
        };
    if (gVerbosity>0) {
      common.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, commonCallback([200], function(e, result){
      if (result) {
        tokenMgmt.stashToken(gRequestOptions.auth.user, result);
        gRequestOptions.headers.Authorization = 'Bearer ' + result.access_token;
        delete gRequestOptions.auth;
      }
      cb(e, result);
    }));
  }

  function _connect(options, cb) {
    var stashedToken = tokenMgmt.currentToken(options.user);
    if (stashedToken) {
      options.access_token = stashedToken.access_token;
    }
    _setEdgeConnection(options);
    if (options.access_token) {
      gRequestOptions.headers.Authorization = 'Bearer ' + stashedToken.access_token;
      delete gRequestOptions.auth;
      return cb(null, stashedToken);
    }
    else if (options.mgmtServer == gEdgeSaasMgmtServer && !options.no_token) {
      return _getToken(cb);
    }
    else {
      return _get('', cb);
    }
  }

  function _setEdgeConnection(options, arg2, arg3) {
    // case 1:
    //   options = {user: "foo", password: "bar", mgmtServer: "https://api.ent.api.com", org: "orgname"}
    //   arg2 = dontcare
    //   arg3 = dontcare
    // case 2:
    //   options = "https://api.enterprise.apigee.com"
    //   arg2 = "orgname"
    //   arg3 = { auth : { user: "person", pass: "secret!"}}
    var requestOptions = {};
    if (options.org && options.user && options.password) {
      options.mgmtServer = options.mgmtServer || gEdgeSaasMgmtServer;
      checkMgmtServerFormat(options.mgmtServer);
      gUrlBase = common.joinUrlElements(options.mgmtServer, '/v1/o/', options.org);
      requestOptions = { auth : { user: options.user, pass: options.password}};
      if (options.quiet) { gVerbosity = 0;}
    }
    else if (options.org && options.user && options.access_token) {
      options.mgmtServer = options.mgmtServer || gEdgeSaasMgmtServer;
      checkMgmtServerFormat(options.mgmtServer);
      gUrlBase = common.joinUrlElements(options.mgmtServer, '/v1/o/', options.org);
      requestOptions.headers = { Authorization : 'Bearer ' + options.access_token };
      if (options.quiet) { gVerbosity = 0;}
    }
    else if (options && arg2 && arg3) {
      let mgmtserver = options, org = arg2;
      checkMgmtServerFormat(mgmtserver);
      if ( ! arg3.user || !arg3.pass) {
        throw new Error("use an http or https url for the managementserver.");
      }
      gUrlBase = common.joinUrlElements(mgmtserver, '/v1/o/', org);
      requestOptions = merge(true, arg3);
    }
    else {
      throw new Error("incorrect arguments");
    }
    requestOptions.headers = { accept: 'application/json' };
    gRequestOptions = merge(true, requestOptions);
    if (requestOptions.auth) {
      gRequestOptions.auth.sendImmediately = true;
    }
    gOrgProperties = null;
  }

  function _getProxy(options, cb) {
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = (options.proxy) ?
      common.joinUrlElements(gUrlBase, 'apis', options.proxy) :
      common.joinUrlElements(gUrlBase, 'apis');
    if (gVerbosity>0) {
      common.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, commonCallback([200], cb));
  }

  function _get(url, cb) {
    url = common.joinUrlElements(gUrlBase, url);
    if (gVerbosity>0) {
      common.logWrite(sprintf('GET %s', url));
    }
    request.get(url, gRequestOptions, commonCallback([200], cb));
  }

  function _deployAsset(options, assetType, cb) {
    // curl -X POST \
    //   -H content-type:application/x-www-form-urlencoded \
    //   "${mgmtserver}/v1/o/${org}/e/${environment}/apis/${proxyname}/revisions/${rev}/deployments" \
    //   -d 'override=true&delay=60'
    var qparams = {
          override : (options.hasOwnProperty('override')) ? options.override : true,
          delay : (options.hasOwnProperty('delay')) ? options.delay : 60
        };
    var collection = getCollectionForAssetType(assetType);
    if ( ! collection) {
      return cb(new Error('The assetType is not supported'));
    }
    if (assetType == 'apiproxy') {
      qparams.basepath = options.basepath || '/';
    }
    if (gVerbosity>0) {
      common.logWrite(sprintf('deploy %s %s r%d to env:%s',
                              assetType, options.name, options.revision, options.environment));
    }
    var requestOptions = merge(true, gRequestOptions);

    requestOptions.headers['content-type'] = 'application/x-www-form-urlencoded';
    requestOptions.body = qs.stringify(qparams);
    requestOptions.url = common.joinUrlElements(gUrlBase,
                                                'e', options.environment,
                                                collection, options.name,
                                                'revisions', options.revision,
                                                'deployments');
    if (gVerbosity>0) {
      common.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, commonCallback([200], cb));
  }

  function _deployProxy(options, cb) {
    return _deployAsset(options, 'apiproxy', cb);
  }

  function _deploySharedFlow(options, cb) {
    return _deployAsset(options, 'sharedflowbundle', cb);
  }

  function _undeployAsset(options, assetType, cb){
    // DELETE :mgmtserver/v1/o/:orgname/e/:envname/apis/:proxyname/revisions/:revnum/deployments
    // Authorization: :edge-auth
    var collection = getCollectionForAssetType(assetType);
    if (gVerbosity>0) {
      common.logWrite(sprintf('Undeploy %s %s r%d from env:%s', assetType, options.name, options.revision, options.environment));
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = common.joinUrlElements(gUrlBase,
                                                'e', options.environment,
                                                collection, options.name,
                                                'revisions', options.revision,
                                                'deployments');
    if (gVerbosity>0) {
      common.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, commonCallback([200], cb));
  }

  function _undeployProxy(options, cb){
    return _undeployAsset(options, 'apiproxy', cb);
  }

  function _undeploySharedFlow(options, cb) {
    return _undeployAsset(options, 'sharedflowbundle', cb);
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

  function produceBundleZip(srcDir, assetType, cb) {
    var pathToZip = path.resolve(path.join(srcDir, assetType));
    var checkName = function(name) {
          if (name.endsWith('~')) return false;
          var b = path.basename(name);
          if (b.endsWith('#') && b.startsWith('#')) return false;
          return true;
        };
    if ( ! fs.existsSync(pathToZip)) {
      cb(new Error('The directory ' + pathToZip + ' does not exist'));
    }
    var tmpdir = process.env.tmpdir || '/tmp';
    var archiveName = path.join(tmpdir, assetType + '-' + new Date().getTime() + '.zip');
    var os = fs.createWriteStream(archiveName);
    var archive = archiver('zip');

    os.on('close', function () {
      if (gVerbosity>0) {
        common.logWrite('zipped ' + archive.pointer() + ' total bytes');
      }
      cb(null, archiveName);
    });

    archive.on('error', function(e){ cb(e, archiveName); });
    archive.pipe(os);

    walkDirectory(pathToZip, function(e, results) {
      results.forEach(function(filename) {
        if (checkName(filename)) {
          var shortName = filename.replace(pathToZip, assetType);
          archive.append(fs.createReadStream(filename), { name: shortName });
          //console.log(shortName);
        }
      });
      archive.finalize();
    });
  }

  function getCollectionForAssetType(assetType) {
    var supportedTypes = { apiproxy: 'apis', sharedflowbundle: 'sharedflows'};
    return supportedTypes[assetType];
  }

  function internalImportBundleFromZip(assetName, assetType, zipArchive, cb) {
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

    var requestOptions = merge(true, gRequestOptions);
    requestOptions.headers['content-type'] = 'application/octet-stream';

    requestOptions.url = common.joinUrlElements(gUrlBase, collection + '?action=import&name=' + assetName);

    if (gVerbosity>0) {
      common.logWrite(sprintf('POST %s', requestOptions.url));
    }

    fs.createReadStream(zipArchive)
      .pipe(request.post(requestOptions, commonCallback([201], cb)));
  }


  function _importAssetFromDir(name, srcDir, assetType, cb) {
    if (['apiproxy', 'sharedflowbundle'].indexOf(assetType) < 0) {
      return cb(new Error("unknown assetType"));
    }
    if (gVerbosity>0) {
      common.logWrite(sprintf('import %s %s from dir %s', assetType, name, path.resolve(srcDir)));
    }
    produceBundleZip(srcDir, assetType, function(e, archiveName) {
      if (e) return cb(e);

      internalImportBundleFromZip(name, assetType, archiveName, function(e, result) {
        if (e) return cb(e);
        fs.unlinkSync(archiveName);
        cb(null, result);
      });
    });
  }

  function _importProxyFromDir(proxyName, srcDir, cb) {
    srcDir = path.resolve(srcDir);
    if (srcDir.endsWith('/apiproxy')) {
      srcDir = path.resolve(path.join(srcDir, '..'));
    }
    return _importAssetFromDir(proxyName, srcDir, 'apiproxy', cb);
  }

  function _importSharedFlowFromDir(name, srcDir, cb) {
    return _importAssetFromDir(name, srcDir, 'sharedflowbundle', cb);
  }

  function _importProxyFromZip(proxyName, zipArchive, cb) {
    // curl -X POST "${mgmtserver}/v1/o/$org/apis?action=import&name=$proxyname" -T $zipname -H "Content-Type: application/octet-stream"
    if (gVerbosity>0) {
      common.logWrite(sprintf('import proxy %s from zip %s', proxyName, zipArchive));
    }
    return internalImportBundleFromZip(proxyName, 'apiproxy', zipArchive, cb);
  }

  function _importSharedFlowFromZip(name, zipArchive, cb) {
    // curl -X POST "${mgmtserver}/v1/o/$org/sharedflows?action=import&name=$sfname" -T $zipname -H "Content-Type: application/octet-stream"
    if (gVerbosity>0) {
      common.logWrite(sprintf('import sharedflow %s from zip %s', name, zipArchive));
    }
    return internalImportBundleFromZip(name, 'sharedflow', zipArchive, cb);
  }


  function _findXmlFiles(dir, cb) {
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
    _findXmlFiles(dir, function(e, files){
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

  function internalGetEnvironments(cb) {
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = common.joinUrlElements(gUrlBase, 'e');
    if (gVerbosity>0) {
      common.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, commonCallback([200], cb));
  }

  function _getEnvironments(cb) {
    if (gVerbosity>0) {
      common.logWrite('get environments');
    }
    internalGetEnvironments(cb);
  }

  function resolveKvmPath(options) {
    if (options && options.env) {
      return common.joinUrlElements(gUrlBase, 'e', options.env, 'keyvaluemaps');
    }
    if (options && options.proxy) {
      return common.joinUrlElements(gUrlBase, 'apis', options.proxy, 'keyvaluemaps');
    }
    return common.joinUrlElements(gUrlBase, 'keyvaluemaps');
  }

  function _getKvms(options, cb) {
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = resolveKvmPath(options);
    if (gVerbosity>0) {
      common.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, commonCallback([200], cb));
  }

  function _checkProperties(cb) {
    return _get('', cb);
  }

  function transformToHash(properties) {
    var hash = {};
    properties.forEach(function(item) {
      hash[item.name] = item.value;
    });
    return hash;
  }

  function _putKvm(options, cb) {
    if ( ! gOrgProperties) {
      return _checkProperties(function(e, result) {
        if (e) {
          console.log(e);
          return cb(e, result);
        }
        gOrgProperties = transformToHash(result.properties.property);
        return _putKvm0(options, cb);
      });
    }
    else {
      return _putKvm0(options, cb);
    }
  }

  function _putKvm0(options, cb) {
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = resolveKvmPath(options);

    if (gOrgProperties['features.isCpsEnabled']) {
      requestOptions.url = common.joinUrlElements(requestOptions.url, options.kvm, 'entries', options.key);
      if (gVerbosity>0) {
        common.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, function(error, response, body) {
        if (error) {
          common.logWrite(error);
          return cb(error, body);
        }
        requestOptions.url = resolveKvmPath(options);
        requestOptions.url = common.joinUrlElements(requestOptions.url, options.kvm, 'entries');

        if (response.statusCode == 200) {
          // Update is required if the key already exists.
          if (gVerbosity>0) {
            common.logWrite('update');
          }
          requestOptions.url = common.joinUrlElements(requestOptions.url, options.key);
        }
        else if (response.statusCode == 404) {
          if (gVerbosity>0) {
            common.logWrite('create');
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
          if (gVerbosity>0) {
            common.logWrite(sprintf('POST %s', requestOptions.url));
          }
          request.post(requestOptions, commonCallback([200, 201], cb));
        }
        else {
          if (gVerbosity>0) {
            common.logWrite(body);
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
      requestOptions.url = common.joinUrlElements(requestOptions.url, options.kvm);
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.body = JSON.stringify({ name: options.kvm, entry: [{ name: options.key, value : options.value }] });
      if (gVerbosity>0) {
        common.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, commonCallback([200, 201], cb));
    }
  }

  function _createKvm(options, cb) {
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

    if (gVerbosity>0) {
      common.logWrite(sprintf('Create KVM %s', options.name));
    }

    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = resolveKvmPath(options);
    requestOptions.headers['content-type'] = 'application/json';
    requestOptions.body = JSON.stringify({
      encrypted : options.encrypted ? "true" : "false",
      name : options.name,
      entry : options.entries ? uglifyAttrs(options.entries) : []
    });
    if (gVerbosity>0) {
      common.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, commonCallback([201], cb));
  }


  function reallyCreateProduct(options, cb) {
    if (gVerbosity>0) {
      if (options.proxy) {
        common.logWrite(sprintf('Create API Product %s with proxy %s', options.productname, options.proxy));
      }
      else {
        common.logWrite(sprintf('Create API Product %s with no proxy', options.productname));
      }
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.headers['content-type'] = 'application/json';
    requestOptions.url = common.joinUrlElements(gUrlBase, 'apiproducts');
    var prodAttributes = uglifyAttrs(merge(options.attributes, {
          "created by": "nodejs " + path.basename(process.argv[1])
        }));

    var rOptions = {
      name : options.productname,
      proxies : [ ],
      attributes : prodAttributes,
      approvalType : options.approvalType || "manual",
      displayName : options.productname,
      environments : options.envs
    };

    if (options.proxy) {
      rOptions.proxies.push(options.proxy);
    }
    requestOptions.body = JSON.stringify(rOptions);

    if (gVerbosity>0) {
      common.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, commonCallback([201], cb));
  }


  function _createApiProduct(options, cb) {
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
    if ( ! options.envs) {
      _getEnvironments(function(e, result) {
        reallyCreateProduct(merge(options, {envs: result}), cb);
      });
    }
    else {
      reallyCreateProduct(options, cb);
    }
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

  function _createDeveloperApp(options, cb) {
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

    if (gVerbosity>0) {
      common.logWrite(sprintf('Create App %s for %s', options.appName, options.developerEmail));
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.headers['content-type'] = 'application/json';
    requestOptions.url = common.joinUrlElements(gUrlBase,
                                                'developers',options.developerEmail,
                                                'apps');
    var DEFAULT_EXPIRY = -1;
    var keyExpiresIn = DEFAULT_EXPIRY;
    if (options.expiry) {
      keyExpiresIn = resolveExpiry(options.expiry);
    }
    else {
      if (gVerbosity>0) {
        common.logWrite(sprintf('Using default expiry of %d', keyExpiresIn));
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

    if (gVerbosity>0) {
      common.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, commonCallback([201], cb));
  }


  function _getDeveloperApp(options, cb) {
    if (gVerbosity>0) {
      common.logWrite(sprintf('Get Developer App %s/apps/%s',
                              options.developerEmail,
                              options.appName));
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = common.joinUrlElements(gUrlBase,
                                                sprintf('developers/%s/apps/%s',
                                                        options.developerEmail,
                                                        options.appName));
    if (gVerbosity>0) {
      common.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, commonCallback([200], cb));
  }

  function _addDeveloperAppCredential(options, cb) {
    // POST /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/create
    // {
    //   "consumerKey": "CDX-QAoqiu93ui20170301",
    //   "consumerSecret": "SomethingSomethingBeef"
    // }
    if (gVerbosity>0) {
      common.logWrite(sprintf('Add Credential %s/apps/%s',
                              options.developerEmail,
                              options.appName));
    }

    var requestOptions = merge(true, gRequestOptions);
    requestOptions.headers['content-type'] = 'application/json';
    requestOptions.url = common.joinUrlElements(gUrlBase,
                                                sprintf('developers/%s/apps/%s/keys/create',
                                                        options.developerEmail,
                                                        options.appName));
    requestOptions.body = JSON.stringify({
      consumerKey : options.consumerKey,
      consumerSecret : options.consumerSecret
    });
    if (gVerbosity>0) {
      common.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, commonCallback([201], cb));
  }

  function _deleteDeveloperAppCredential(options, cb) {
    // DELETE /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/CONSUMERKEY
    if (gVerbosity>0) {
      common.logWrite(sprintf('Delete Credential %s/apps/%s/keys/%s',
                              options.developerEmail,
                              options.appName,
                              options.key));
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = common.joinUrlElements(gUrlBase,
                                                sprintf('developers/%s/apps/%s/keys/%s',
                                                        options.developerEmail,
                                                        options.appName,
                                                        options.key));

    if (gVerbosity>0) {
      common.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, commonCallback([200], cb));
  }

  function _createDeveloper(options, cb) {
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

    if (gVerbosity>0) {
      common.logWrite(sprintf('Create Developer %s', options.developerEmail));
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.headers['content-type'] = 'application/json';
    requestOptions.url = common.joinUrlElements(gUrlBase, 'developers');

    var devAttributes = uglifyAttrs(merge(options.attributes, {
          "created by": "nodejs " + path.basename(process.argv[1])
        }));

    requestOptions.body = JSON.stringify({
      attributes : devAttributes,
      userName : options.userName,
      firstName : options.firstName,
      lastName : options.lastName,
      email: options.developerEmail
    });
    if (gVerbosity>0) {
      common.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, commonCallback([201], cb));
  }

  function _deleteDeveloper(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/developers/:developer
    // Authorization: :edge-auth
    if (gVerbosity>0) {
      common.logWrite(sprintf('Delete Developer %s', options.developerEmail));
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = common.joinUrlElements(gUrlBase, 'developers', options.developerEmail);
    if (gVerbosity>0) {
      common.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, commonCallback([200], cb));
  }

  function _deleteDeveloperApp(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/developers/:developer/apps/:appname
    // Authorization: :edge-auth
    if (gVerbosity>0) {
      common.logWrite(sprintf('Delete App %s for Developer %s', options.appName, options.developerEmail));
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = common.joinUrlElements(gUrlBase, 'developers', options.developerEmail, 'apps', options.appName);
    if (gVerbosity>0) {
      common.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, commonCallback([200], cb));
  }

  function _deleteApiProduct(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apiproducts/:apiproductname
    // Authorization: :edge-auth
    if (gVerbosity>0) {
      common.logWrite(sprintf('Delete API Product %s', options.productName));
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = common.joinUrlElements(gUrlBase, 'apiproducts', options.productName);
    if (gVerbosity>0) {
      common.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, commonCallback([200], cb));
  }

  function _getCaches(options, cb) {
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = common.joinUrlElements(gUrlBase, 'e', options.env, 'caches');
    if (gVerbosity>0) {
      common.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, commonCallback([200], cb));
  }

  function _createCache(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/e/:env/caches?name=whatev
    // Authorization: :edge-auth
    // Content-type: application/json
    //
    // { .... }

    if (gVerbosity>0) {
      common.logWrite(sprintf('Create Cache %s', options.name));
    }
    var requestOptions = merge(true, gRequestOptions);
    if (!options.env) {
      return cb({error:"missing environment name for cache"});
    }
    requestOptions.url = common.joinUrlElements(gUrlBase, 'e', options.env, 'caches') + '?name=' + options.name;
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
    if (gVerbosity>0) {
      common.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, commonCallback([201], cb));
  }

  function _deleteCache(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/e/:env/caches/:cachename
    // Authorization: :edge-auth
    if (gVerbosity>0) {
      common.logWrite(sprintf('Delete Cache %s', options.name));
    }
    if (!options.env) {
      return cb({error:"missing environment name for cache"});
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = common.joinUrlElements(gUrlBase, 'e', options.env, 'caches', options.name);
    if (gVerbosity>0) {
      common.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, commonCallback([200], cb));
  }

  function _deleteKvm(options, cb) {
    // eg,
    // DELETE :mgmtserver/v1/o/:orgname/e/:env/keyvaluemaps/:kvmname
    // Authorization: :edge-auth
    if (gVerbosity>0) {
      common.logWrite(sprintf('Delete KVM %s', options.name));
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = resolveKvmPath(options);
    requestOptions.url = common.joinUrlElements(requestOptions.url, options.name);
    if (gVerbosity>0) {
      common.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, commonCallback([200], cb));
  }

  function _deleteProxy(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/apis/:proxy
    if (gVerbosity>0) {
      common.logWrite(sprintf('Delete API %s', options.name));
    }
    var requestOptions = merge(true, gRequestOptions);
    requestOptions.url = common.joinUrlElements(gUrlBase, 'apis', options.name);
    if (gVerbosity>0) {
      common.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, commonCallback([200], cb));
  }

  module.exports = {
    setEdgeConnection            : _setEdgeConnection,
    connect                      : _connect,
    get                          : _get,
    getProxy                     : _getProxy,
    inferAssetName               : _inferAssetName,
    deployProxy                  : _deployProxy,
    undeployProxy                : _undeployProxy,
    deleteProxy                  : _deleteProxy,
    importProxyFromZip           : _importProxyFromZip,
    importProxyFromDir           : _importProxyFromDir,
    deploySharedFlow             : _deploySharedFlow,
    undeploySharedFlow           : _undeploySharedFlow,
    importSharedFlowFromDir      : _importSharedFlowFromDir,
    importSharedFlowFromZip      : _importSharedFlowFromZip,
    createApiProduct             : _createApiProduct,
    deleteApiProduct             : _deleteApiProduct,
    getCaches                    : _getCaches,
    createCache                  : _createCache,
    deleteCache                  : _deleteCache,
    getEnvironments              : _getEnvironments,
    getKvms                      : _getKvms,
    createKvm                    : _createKvm,
    deleteKvm                    : _deleteKvm,
    putKvm                       : _putKvm,
    getDeveloperApp              : _getDeveloperApp,
    createDeveloperApp           : _createDeveloperApp,
    deleteDeveloperApp           : _deleteDeveloperApp,
    addDeveloperAppCredential    : _addDeveloperAppCredential,
    deleteDeveloperAppCredential : _deleteDeveloperAppCredential,
    createDeveloper              : _createDeveloper,
    deleteDeveloper              : _deleteDeveloper
  };

}());
