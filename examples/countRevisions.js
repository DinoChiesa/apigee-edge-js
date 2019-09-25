// countRevisions.js
// ------------------------------------------------------------------
//
// created: Mon Dec  3 13:31:48 2018
// last saved: <2019-September-25 16:15:14>

/* jshint esversion: 9, node: true, strict:implied */
/* global process, console, Buffer */

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      util       = require('util'),
      version    = '20190925-1612',
      getopt     = new Getopt(common.commonOptions.concat([
        ['P' , 'prefix=ARG', 'optional. name prefix. query revision of proxies with names starting with this prefix.' ],
        ['S' , 'sharedflow', 'optional. query sharedflows. Default: query proxies.']
      ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge CountRevisions tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
let opt = getopt.parse(process.argv.slice(2));
common.verifyCommonRequiredParameters(opt.options, getopt);
apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    common.logWrite('connected');
    //console.log(org);
    const collection = (opt.options.sharedflow) ? org.sharedflows : org.proxies;
    return collection.get({})
      .then( items => {
        let reducer = (promise, proxyname) =>
          promise .then( results =>
                         collection
                         .get({ name: proxyname })
                         .then( ({revision}) => [ ...results, {proxyname, count:revision.length} ] )
                       );

        return items
            .sort()
            .filter( name => (! opt.options.prefix) || name.startsWith(opt.options.prefix ))
            .reduce(reducer, Promise.resolve([]))
            .then( arrayOfResults => common.logWrite('all done...\n' + JSON.stringify(arrayOfResults)) );
      });
  })
  .catch( e => console.error('error: ' + util.format(e) ));
