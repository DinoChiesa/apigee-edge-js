#! /usr/local/bin/node
/*jslint node:true */
// importAndDeployProxy.js
// ------------------------------------------------------------------
// import and deploy an Apigee Edge proxy bundle
//
// last saved: <2017-May-27 17:34:00>

var fs = require('fs'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20170203-1031',
    defaults = { basepath : '/' },
    getopt = new Getopt(common.commonOptions.concat([
      ['d' , 'srcdir=ARG', 'source directory for the proxy files. Should be parent of dir "apiproxy" or "sharedflowbundle"'],
      ['N' , 'proxyname=ARG', 'name for API proxy or shared flow'],
      ['e' , 'env=ARG', 'the Edge environment.'],
      ['b' , 'basepath=ARG', 'basepath for deploying the API Proxy. Default: ' + defaults.basepath + '  Does not apply to sf.'],
      ['X' , 'nodeploy', 'do not deploy the API Proxy or sharedflow.'],
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

if ( !opt.options.proxyname ) {
  console.log('You must specify a name for the proxy or sharedflow');
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
    common.logWrite('error: ' + JSON.stringify(e, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');

  if (opt.options.sharedflow) {
    org.sharedflows.importFromDir(opt.options.proxyname, opt.options.srcdir, function(e, result){
      if (e) {
        common.logWrite('error: ' + JSON.stringify(e, null, 2));
        if (result) { common.logWrite(JSON.stringify(result, null, 2)); }
        //console.log(e.stack);
        process.exit(1);
      }
      common.logWrite(sprintf('ok. shared flow name: %s r%d', result.name, result.revision));
      if (opt.options.env && !opt.options.nodeploy) {
        var options = {
              name: result.name,
              revision: result.revision,
              environment: opt.options.env
            };
        apigeeEdge.deploySharedFlow(options, function(e, result) {
          if (e) {
            common.logWrite(JSON.stringify(e, null, 2));
            if (result) { common.logWrite(JSON.stringify(result, null, 2)); }
            throw e;
          }
          common.logWrite('ok.');
        });
      }
      else {
        common.logWrite('not deploying...');
        common.logWrite('finish');
      }
    });
  }
  else {
    org.proxies.importFromDir(opt.options.proxyname, opt.options.srcdir, function(e, result) {
      if (e) {
        common.logWrite('error: ' + JSON.stringify(e, null, 2));
        if (result) { common.logWrite(JSON.stringify(result, null, 2)); }
        //console.log(e.stack);
        process.exit(1);
      }
      common.logWrite(sprintf('ok. proxy name: %s r%d', result.name, result.revision));
      if (opt.options.env && !opt.options.nodeploy) {
        var options = {
              name: result.name,
              revision: result.revision,
              environment: opt.options.env,
              basepath: opt.options.basepath || defaults.basepath
            };
        org.proxies.deploy(options, function(e, result) {
          if (e) {
            common.logWrite(JSON.stringify(e, null, 2));
            if (result) { common.logWrite(JSON.stringify(result, null, 2)); }
            throw e;
          }
          common.logWrite('ok.');
        });
      }
      else {
        common.logWrite('not deploying...');
        common.logWrite('finish');
      }
    });
  }
});
