#! /usr/local/bin/node
/*jslint node:true */
// provisionApiProduct.js
// ------------------------------------------------------------------
// provision an Apigee Edge API Product
//
// last saved: <2017-June-15 12:12:33>

var fs = require('fs'),
    edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    sprintf = require('sprintf-js').sprintf,
    Getopt = require('node-getopt'),
    version = '20170324-1907',
    getopt = new Getopt(common.commonOptions.concat([
      ['p' , 'proxy=ARG', 'name of API proxy to include in the API Product.'],
      ['N' , 'productname=ARG', 'name for API proxy'],
      ['A' , 'approvalType=ARG', 'either manual or auto. defaults to auto.'],
      ['e' , 'env=ARG', 'the Edge environment on which to enable the Product (default: all)']
    ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Product Provisioning tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.proxy ) {
  console.log('You must specify a proxy');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.productname ) {
  console.log('You must specify a name for the API Product');
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

apigeeEdge.connect(options, function(e, org) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    common.logWrite(JSON.stringify(result, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');

  var options = {
        productName: opt.options.productname,
        proxy: opt.options.proxy,
        environments: opt.options.env,
        approvalType : opt.options.approvalType || "auto", //|| manual
        //attributes: { "key1": "value1", "key2": "XYZ123"}
      };

  org.products.create(options, function(e, result){
    if (e) {
      common.logWrite(JSON.stringify(e, null, 2));
      common.logWrite(JSON.stringify(result, null, 2));
      //console.log(e.stack);
      process.exit(1);
    }
    common.logWrite(sprintf('ok. product name: %s', result.name));
  });
});
