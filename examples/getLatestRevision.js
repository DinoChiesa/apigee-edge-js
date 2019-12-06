#! /usr/local/bin/node
/*jslint node:true */
// getLatestRevision.js
// ------------------------------------------------------------------
//
// created: Mon Dec  3 13:31:48 2018
// last saved: <2019-December-05 21:16:36>

/* jshint esversion: 9, node: true, strict:implied */
/* global process, console, Buffer */

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      util       = require('util'),
      version    = '20191205-1914',
      getopt     = new Getopt(common.commonOptions.concat([
        ['P' , 'prefix=ARG', 'optional. name prefix. query revision of proxies with names starting with this prefix.' ],
        ['R' , 'regex=ARG', 'optional. a regular expression. query revision of proxies with names matching this regex.' ],
        ['S' , 'sharedflow', 'optional. query sharedflows. Default: query proxies.']
      ])).bindHelp();

function isKeeper(opt) {
  if (opt.options.regex) {
    common.logWrite('using regex match (%s)',opt.options.regex);
    let re1 = new RegExp(opt.options.regex);
    return function(name) {
      return name.match(re1);
    };
  }

  if (opt.options.prefix) {
    common.logWrite('using prefix match (%s)',opt.options.prefix);
    return function (name) {
      return name.startsWith(opt.options.prefix);
    };
  }

  return () => true;
}

// ========================================================

console.log(
  'Apigee Edge GetLatestRevision tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
let opt = getopt.parse(process.argv.slice(2));
common.verifyCommonRequiredParameters(opt.options, getopt);
apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    common.logWrite('connected');
    const collection = (opt.options.sharedflow) ? org.sharedflows : org.proxies;
    return collection.get({})
      .then( items => {
        let reducer = (promise, proxyname) =>
          promise .then( results =>
                         collection
                           .get({ name: proxyname })
                           .then( ({revision}) => [ ...results, {proxyname, revision:revision[revision.length-1]} ] )
                       );

        return items
            .sort()
            .filter( isKeeper(opt) )
            .reduce(reducer, Promise.resolve([]))
            .then( arrayOfResults => common.logWrite('all done...\n' + JSON.stringify(arrayOfResults, null, 2)) );
      });
  })
  .catch( e => console.error('error: ' + util.format(e) ));
