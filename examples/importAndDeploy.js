#! /usr/local/bin/node
/*jslint node:true */
// importAndDeploy.js
// ------------------------------------------------------------------
// import and deploy an Apigee Edge proxy bundle or shared flow.
//
// last saved: <2017-August-08 16:11:29>

var fs = require('fs'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20170608-1309',
    defaults = { basepath : '/' },
    getopt = new Getopt(common.commonOptions.concat([
      ['d' , 'source=ARG', 'source directory for the proxy files. Should be parent of dir "apiproxy" or "sharedflowbundle"'],
      ['N' , 'name=ARG', 'name for API proxy or shared flow'],
      ['e' , 'env=ARG', 'the Edge environment to which to deploy the asset.'],
      ['b' , 'basepath=ARG', 'basepath for deploying the API Proxy. Default: ' + defaults.basepath + '  Does not apply to sf.'],
      ['S' , 'sharedflow', 'import and deploy as a sharedflow. Default: import + deploy a proxy.']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Proxy/Sharedflow Import + Deploy tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.srcdir ) {
  console.log('You must specify a source directory');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.name ) {
  console.log('You must specify a name for the proxy or sharedflow');
  getopt.showHelp();
  process.exit(1);
}

if (opt.options.basepath && opt.options.sharedflow) {
  console.log('It does not make sense to use a basepath when deploying a sharedflow.');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);

var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      verbosity: opt.options.verbose || 0
    };

apigeeEdge.connect(options, function(e, org){
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');

  var collection = (opt.options.sharedflow) ? org.sharedflows : org.proxies;
  var term = (opt.options.sharedflow) ? 'sharedflow' : 'proxy';

  common.logWrite('importing');
  collection.import({name:opt.options.name, source:opt.options.source}, function(e, result){
    if (e) {
      common.logWrite(JSON.stringify(e, null, 2));
      if (result) { common.logWrite(JSON.stringify(result, null, 2)); }
      //console.log(e.stack);
      process.exit(1);
    }
    common.logWrite(sprintf('import ok. %s name: %s r%d', term, result.name, result.revision));
    if (opt.options.env) {
      var options = {
            name: result.name,
            revision: result.revision,
            environment: opt.options.env
          };
      if ( ! opt.options.sharedflow) {
        options.basepath = opt.options.basepath || defaults.basepath;
      }
      common.logWrite('deploying');
      collection.deploy(options, function(e, result) {
        if (e) {
          common.logWrite(JSON.stringify(e, null, 2));
          if (result) { common.logWrite(JSON.stringify(result, null, 2)); }
          throw e;
        }
        common.logWrite('deploy ok.');
      });
    }
    else {
      common.logWrite('not deploying...');
      common.logWrite('finish');
    }
  });
});
