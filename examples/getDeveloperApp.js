// getDeveloperApp.js
// ------------------------------------------------------------------
//
// created: Sat Mar 17 17:20:25 2018
// last saved: <2019-February-11 13:07:42>
/* jshint esversion: 6, node: true */
/* global process, console */

'use strict';

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      version    = '20190211-1306',
      getopt     = new Getopt(common.commonOptions.concat([
        ['A' , 'app=ARG', 'Required. the name of the app to query.'],
        ['D' , 'developer=ARG', 'Required. the developer that owns the app.']
      ])).bindHelp();

function handleError(e) {
    if (e) {
      console.log(e);
      console.log(e.stack);
      process.exit(1);
    }
}

// ========================================================

console.log(
  'Apigee Edge getDeveloperApp.js tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.app ) {
  console.log('You must specify an App to query');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.developer ) {
  console.log('You must specify a developer');
  getopt.showHelp();
  process.exit(1);
}

apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  handleError(e);
  common.logWrite('searching...');
  org.developerapps.get({name:opt.options.app, email:opt.options.developer}, function(e, app) {
    handleError(e);
    console.log('app: ' + JSON.stringify(app, null, 2));
  });
});
