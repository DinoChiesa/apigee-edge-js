#! /usr/local/bin/node
/*jslint node:true, esversion:9 */
// findPoliciesByName.js
// ------------------------------------------------------------------
// In Apigee Edge, find policies in all proxies and/or sharedflows that have a
// matching name.
//
// Copyright 2017-2019 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// last saved: <2019-December-05 23:04:55>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf    = require('sprintf-js').sprintf,
      Getopt     = require('node-getopt'),
      util       = require('util'),
      version    = '20191205-2158',
      getopt     = new Getopt(common.commonOptions.concat([
        ['P' , 'proxiesonly', 'Optional. Look for policies only within proxies.'],
        ['S' , 'sharedflowsonly', 'Optional. Look for policies only within sharedflows.'],
        ['N' , 'policypattern=ARG', 'Required. a regular expression. Look for policies that match a regexp.'],
        ['R' , 'proxypattern=ARG', 'Optional. a regular expression. Look only in proxies that match this regexp.'],
        ['L' , 'latestrevisionnumber', 'Optional. only look in the latest revision number for each proxy.']
      ])).bindHelp();

var regexp1;
function getRegexp() {
  if ( ! regexp1) {
    regexp1 = new RegExp(opt.options.policypattern);
  }
  return regexp1;
}

function isKeeper(opt) {
  if (opt.options.proxypattern) {
    common.logWrite('using regex match (%s)',opt.options.proxypattern);
    let re1 = new RegExp(opt.options.proxypattern);
    return function(name) {
      return name.match(re1);
    };
  }
  return () => true;
}

function getRevisionChecker(collection, collectionName, itemName) {
  return revision =>
    collection.getPoliciesForRevision({ name: itemName, revision })
    .then( policyNames =>
           policyNames
           .filter( x => x.match(getRegexp()))
           .map(elt => sprintf('%s/%s/revisions/%s/policies/%s', collectionName, itemName, revision, elt))
         );
}

// a function that returns a revision reducer for the named proxy or sharedflow
function makeRevisionReducer(check) {
  return (promise, revision) =>
    promise.then( accumulator =>
                  check(revision)
                  .then( policies =>
                         policies.length ? [...accumulator, {revision, policies}] : accumulator ));
}

// expand from itemname to itemname and the list of revisions
function getRevisions(collection) {
  return (promise, itemname) =>
    promise .then( accumulator =>
                   collection.get({ name: itemname })
                   .then( ({revision}) => {
                     if (opt.options.latestrevisionnumber) {
                       revision = [revision.pop()];
                     }
                     return [ ...accumulator, {itemname, revision} ];
                   }));
}

function listChecker(collection, collectionName, typeName) {
  return items => items
    .sort()
    .filter( isKeeper(opt) )
    .reduce( getRevisions(collection), Promise.resolve([]))
    .then( itemsAndRevisions => {
      let itemReducer = (promise, nameAndRevisions) =>
        promise.then( accumulator => {
          let check = getRevisionChecker(collection, collectionName, nameAndRevisions.itemname);
          return nameAndRevisions.revision.reduce(makeRevisionReducer(check), Promise.resolve([]))
            .then( a => a.length? [...accumulator, {name: nameAndRevisions.itemname, type:typeName, found:a}] : accumulator);
        });

      return itemsAndRevisions.reduce(itemReducer, Promise.resolve([]));
    });
}

// ========================================================

console.log(
  'Apigee Edge Policy finder tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);
if ( ! opt.options.policypattern) {
  console.log('The --policypattern option is required.');
  getopt.showHelp();
  process.exit(1);
}

if (opt.options.proxiesonly && opt.options.sharedflowsonly) {
  console.log('You can use at most one of --proxiesonly and --sharedflowsonly .');
  getopt.showHelp();
  process.exit(1);
}

apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    let p = Promise.resolve([]);

    if (opt.options.proxiesonly || !opt.options.sharedflowsonly) {
      p = p.then( all => org.proxies.get({})
                  .then( listChecker(org.proxies, 'apis', 'proxy'))
                  .then( r => [...all, ...r] ) );
    }

    if (opt.options.sharedflowsonly || !opt.options.proxiesonly) {
      p = p.then( all => org.sharedflows.get({})
                  .then( listChecker(org.sharedflows, 'sharedflows', 'sharedflow'))
                  .then( r => [...all, ...r] ) );
    }

    return p;
  })

  .then( r => console.log('' + JSON.stringify(r, null, 2)) )

  .catch( e => console.log('while executing, error: ' + e.stack) );
