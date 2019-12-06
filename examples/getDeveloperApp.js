#! /usr/local/bin/node
// getDeveloperApp.js
// ------------------------------------------------------------------
//
// created: Sat Mar 17 17:20:25 2018
// last saved: <2019-December-05 21:51:34>
/* jshint esversion: 9, node: true, strict:implied */
/* global process, console */

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      util       = require('util'),
      version    = '20190925-1712',
      getopt     = new Getopt(common.commonOptions.concat([
        ['A' , 'app=ARG', 'Optional. the name of the app to query. Without this, lists apps.'],
        ['D' , 'developer=ARG', 'Required. the developer that owns the app.']
      ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge getDeveloperApp.js tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.developer ) {
  console.log('You must specify a developer');
  getopt.showHelp();
  process.exit(1);
}

apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    common.logWrite('searching...');
    return org.developerapps.get({name:opt.options.app, email:opt.options.developer})
      .then ( app => console.log(JSON.stringify(app, null, 2)) );
  })
  .catch( e => console.error('error: ' + util.format(e) ) );
