// findAppForApiProduct.js
// ------------------------------------------------------------------
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
// created: Mon Mar 20 09:57:02 2017
// last saved: <2019-February-11 13:14:55>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      version    = '20190211-1314',
      getopt     = new Getopt(common.commonOptions.concat([
        ['P' , 'apiproduct=ARG', 'Required. the apiproduct for which to list apps.'],
      ['D' , 'developers', 'Optional. List the developers that own the apps.']
      ])).bindHelp();

function handleError(e) {
    if (e) {
      console.log(e);
      console.log(e.stack);
      process.exit(1);
    }
}

function uniquify(value, index, self) {
    return self.indexOf(value) === index;
}

// ========================================================

console.log(
  'Apigee Edge findAppForApiProduct.js tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.apiproduct ) {
  console.log('You must specify an apiproduct to find');
  getopt.showHelp();
  process.exit(1);
}

apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  handleError(e);
  common.logWrite('searching...');
  org.apps.get({expand:true}, function(e, result) {
    handleError(e);
    var apps = result.app;
    common.logWrite('total count of apps for that org: %d', apps.length);
    var filteredApps = apps.filter(function(app) {
          var creds = app.credentials.filter(function(cred) {
                return cred.apiProducts.find( function (prod) {
                  return (prod.apiproduct == opt.options.apiproduct);
                });
              });
          return creds && (creds.length > 0);
        });

    if (filteredApps) {
      common.logWrite('count of Apps containing %s (%d)', opt.options.apiproduct, filteredApps.length);
      var developerList = [];
      if (filteredApps.length) {
        filteredApps.forEach( (a, ix) => {
          common.logWrite(ix + ': /v1/o/' + org.conn.orgname + '/developers/' + a.developerId + '/apps/' + a.name);
          developerList.push(a.developerId);
        });

      }
      if ( opt.options.verbose ) {
        common.logWrite(JSON.stringify(filteredApps, null, 2));
      }

      if (opt.options.developers) {
        var uniqueDevelopers = developerList.filter( uniquify );
        common.logWrite('Developers who manage these Apps (%d):', uniqueDevelopers.length);
        uniqueDevelopers.forEach(function(developer) {
          org.developers.get({id : developer}, function(e, devRecord) {
            common.logWrite( "%s", devRecord.email); // devRecord.userName, devRecord.firstName, devRecord.lastName
          });
        });
      }
    }
    else {
      common.logWrite("none found");
    }

  });
});
