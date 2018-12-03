// getLatestRevision.js
// ------------------------------------------------------------------
//
// created: Mon Dec  3 13:31:48 2018
// last saved: <2018-December-03 13:47:18>

/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

'use strict';

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      version    = '20181203-1332',
      defaults   = { basepath : '/' },
      getopt     = new Getopt(common.commonOptions.concat([
        ['S' , 'sharedflow', 'query sharedflows. Default: query proxies.']
      ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge GetLatestRevision tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      no_token: opt.options.notoken,
      verbosity: opt.options.verbose || 0
    };

apigeeEdge.connect(options)
  .then( (org) => {
    common.logWrite('connected');

    const collection = (opt.options.sharedflow) ? org.sharedflows : org.proxies;
    collection.get({})
      .then( (items) => {
        var reducer = (promise, proxyname) =>
          promise .then( (results) =>
                         collection
                           .get({ name: proxyname })
                           .then( ({revision}) => [ ...results, {proxyname, revision:revision[revision.length-1]} ] )

                       );

        items
            .reduce(reducer, Promise.resolve([]))
            .then( (arrayOfResults) => common.logWrite('all done...\n' + JSON.stringify(arrayOfResults)) )
            .catch( (e) => console.error('error: ' + e.stack) );

      });
  })
  .catch( (e) => console.error('error: ' + e.stack) );
