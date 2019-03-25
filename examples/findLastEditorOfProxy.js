// findLastEditorOfProxy.js
// ------------------------------------------------------------------
//
// Copyright 2018 Google LLC.
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
/* global process */

const request            = require('request'),
      edgejs             = require('apigee-edge-js'),
      common             = edgejs.utility,
      apigeeEdge         = edgejs.edge,
      sprintf            = require('sprintf-js').sprintf,
      eightHoursInMillis = 8 * 60 * 60 * 1000,
      lookbackInterval   = eightHoursInMillis,
      version            = '20190325-1056',
      regexi             = {
        CREATE : [
          new RegExp('/v1/(?:o|organizations)/[^/]+/apis/([^/]+)/\\?action=import&name=[\\S]+$'),
          new RegExp('/v1/(?:o|organizations)/[^/]+/apis/([^/]+)/\\?(?:[^&]+&)action=import$')
        ],
        UPDATE : [ new RegExp('/v1/(?:o|organizations)/[^/]+/apis/([^/]+)/(?:r|revisions)/[0-9]+.*') ]
      },
      Getopt             = require('node-getopt'),
      getopt             = new Getopt(common.commonOptions.concat([
        ['P' , 'proxy=ARG+', 'Required. the proxy to find. You can specify this option multiple times.']
      ])).bindHelp();

function joinUrlElements() {
  var re1 = new RegExp('^\\/|\\/$', 'g'),
      elts = Array.prototype.slice.call(arguments);
  return elts.map(function(element){return element.replace(re1,""); }).join('/');
}

function transformArrayIntoHash(a) {
  return a.reduce(function(result, item, index, array) {
      result[item] = null;
      return result;
    }, {});
}

// ========================================================

function proxiesRemaining(proxyData) {
  return Object.keys(proxyData).filter(key => proxyData[key] == null);
}

function processOneBatch(records, proxyData) {
  const notYetFound = proxiesRemaining(proxyData);
  records.forEach(function(record) {
    // if (opt.options.verbose) {
    //   console.log('looking at: %s %s', record.operation, record.requestUri);
    // }
    Object.keys(regexi).forEach(function(key) {
      if (record.operation == key) {
        regexi[key].forEach(regex => {
          var a = regex.exec(record.requestUri);
          if (a != null) {
            notYetFound.forEach(function(proxyName){
              if ((proxyData[proxyName] == null) && (a[1] == proxyName)) {
                //console.log('matched %s %s', key, proxyName);
                proxyData[proxyName] = record;
                proxyData[proxyName].humanTime = new Date(record.timeStamp).toISOString();
              }
            });
          }
        });
      }
    });
  });
}

function findAuditRecords(org, proxyData) {
  const now = (new Date()).getTime();
  const endTime = now;
  const startTime = now - lookbackInterval;

  return getOneBatch(org, startTime, endTime, transformArrayIntoHash(proxyData));
}


function getOneBatch(org, startTime, endTime, proxyData) {
  return new Promise( (resolve, reject) => {
    if ( ! proxyData) {
      return reject(new Error("missing proxyData"));
    }

    var auditQuery = sprintf("expand=true&endTime=%d&startTime=%d", endTime, startTime);
    org.audits.get({startTime, endTime})
      .then( response => {
        var result;
        //console.log(JSON.stringify(response));
        if (response.auditRecord) {
          //console.log('%d records', response.auditRecord.length);
          if (!opt.options.verbose) {
            process.stdout.write('.');
          }
          if (response.auditRecord.length > 0) {
            processOneBatch(response.auditRecord, proxyData);
          }
          if ((proxiesRemaining(proxyData).length == 0)) {
            return resolve(proxyData);
          }
          // invoke again
          endTime = startTime + (10 * 1000); // fudge 10s
          startTime -= lookbackInterval;     // backup one interval
          setTimeout(function() { getOneBatch(org, startTime, endTime, proxyData); }, 1);
        }
        else {
          return resolve(proxyData);
        }
      })
      .catch( e => reject(e) );
  });
}


// ========================================================

console.log(
  'Apigee Edge Last Editor finder tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.proxy ) {
  console.log('You must specify at least one proxy to find');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);

apigeeEdge.connect(common.optToOptions(opt))
  .then(org =>
    findAuditRecords(org, opt.options.proxy)
      .then( results => {
        console.log('\n');
        console.log(JSON.stringify(results, null, 2));
      }))
  .catch( e => console.log('error: ' + e.stack));
