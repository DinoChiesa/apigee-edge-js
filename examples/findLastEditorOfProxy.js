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

const request = require('request'),
      edgejs = require('apigee-edge-js'),
      common = edgejs.utility,
      apigeeEdge = edgejs.edge,
      sprintf = require('sprintf-js').sprintf,
      eightHoursInMillis = 8 * 60 * 60 * 1000,
      version = '20180605-1119',
      Getopt = require('node-getopt'),
      getopt = new Getopt(common.commonOptions.concat([
        ['P' , 'proxy=ARG+', 'the proxy to find. You can pecify this option multiple times.']
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

// ========================================================

function proxiesOfInterest(proxyData) {
  return Object.keys(proxyData).filter(function(key) {
    return(proxyData[key] == null);
  });
}

function processOneBatch(records, proxyData) {
  var regexi = {
        CREATE : new RegExp('/v1/(?:o|organizations)/[^/]+/apis/([^/]+)/\\?action=import&name=[\\S]+$'),
        UPDATE : new RegExp('/v1/(?:o|organizations)/[^/]+/apis/([^/]+)/(?:r|revisions)/[0-9]+.*')
      };
  var ofInterest = proxiesOfInterest(proxyData);
  ofInterest.forEach(function(proxyName){
    records.forEach(function(record) {
      var a;
      //console.log('looking at: %s %s', record.operation, record.requestUri);
      Object.keys(regexi).forEach(function(key) {
        var regex = regexi[key];
        if (record.operation == key) {
          var a = regex.exec(record.requestUri);
          if (a != null) {
            //console.log('found %s', key);
            if ((a[1] == proxyName) && proxyData[proxyName] == null) {
              //console.log('matched %s %s', key, proxyName);
              proxyData[proxyName] = record;
              proxyData[proxyName].humanTime = new Date(record.timeStamp).toISOString();
            }
          }
        }
      });
    });
  });
}

function moreToDo(proxyData) {
  return (proxiesOfInterest(proxyData).length == 0);
}

function getOneBatch(org, startTime, endTime, proxyData, cb) {
  if ( ! proxyData) {
    return cb(new Error("missing proxyData"));

  }
  if (moreToDo(proxyData)) {
    return cb(null, proxyData);
  }

  var auditQuery = sprintf("expand=true&endTime=%d&startTime=%d", endTime, startTime);
  org.audits.get({endTime:endTime, startTime:startTime},
                 function (error, response) {
                   var result;
                   if (error) {
                     console.log(error);
                     return cb(error);
                   }
                   //console.log(JSON.stringify(response));
                   if (response.auditRecord) {
                     //console.log('%d records', records.length);
                     if (!opt.options.verbose) {
                       process.stdout.write('.');
                     }
                     if (response.auditRecord.length > 0) {
                       processOneBatch(response.auditRecord, proxyData);
                     }
                     // invoke again
                     endTime = startTime + (10 * 1000); // fudge
                     startTime -= eightHoursInMillis;
                     setTimeout(function() { getOneBatch(org, startTime, endTime, proxyData, cb); }, 1);
                   }
                   else {
                     cb(null, proxyData);
                   }
                 });

}


var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      no_token: opt.options.notoken,
      verbosity: opt.options.verbose || 0
    };

apigeeEdge.connect(options, function(e, org) {
  if (e) {
    common.logWrite(JSON.stringify(e, null, 2));
    //console.log(e.stack);
    process.exit(1);
  }
  common.logWrite('connected');

  //const auditUrlBase = joinUrlElements(opt.options.mgmtserver, auditBase, opt.options.org);
  const now = (new Date()).getTime();
  var endTime = now;
  var startTime = now - eightHoursInMillis;

  var proxyData = transformArrayIntoHash(opt.options.proxy);

  getOneBatch(org, startTime, endTime, proxyData, function(e, results) {
    console.log('\n');
    if (e) {
      console.log(e);
    }
    else {
      console.log(JSON.stringify(proxyData, null, 2));
    }
  });

});
