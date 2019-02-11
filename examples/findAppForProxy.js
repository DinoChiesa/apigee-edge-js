// findAppForProxy.js
// ------------------------------------------------------------------
//
// Copyright 2017-2018 Google LLC.
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
// last saved: <2019-February-11 13:14:08>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      version    = '20190211-1313',
      getopt     = new Getopt(common.commonOptions.concat([
        ['P' , 'proxy=ARG', 'required. the proxy for which to list apps.']
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
  'Apigee Edge findAppForProxy.js tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

if ( !opt.options.proxy ) {
  console.log('You must specify a proxy to find');
  getopt.showHelp();
  process.exit(1);
}

apigeeEdge.connect(common.optToOptions(opt), function(e, org) {
  handleError(e);
  common.logWrite('searching...');
  org.products.get({expand:true}, function(e, result) {
    handleError(e);
    var apiproducts = result.apiProduct;
    common.logWrite('total count of API products for that org: %d', apiproducts.length);
    var filteredProducts = apiproducts.filter(function(product) {
          return (product.proxies.indexOf(opt.options.proxy) >= 0);
        });

    if (filteredProducts) {
      common.logWrite('count of API products containing %s: %d', opt.options.proxy, filteredProducts.length);
      if (filteredProducts.length) {
        common.logWrite('list: ' + filteredProducts.map( function(item) { return item.name;}).join(', '));
        org.apps.get({expand:true}, function(e, result) {
          handleError(e);
          var apps = result.app;
          common.logWrite('total count of apps for that org: %d', apps.length);
          var filteredProductNames = filteredProducts.map( p => p.name);
          var filteredApps = apps.filter(function(app) {
                var creds = app.credentials.filter(function(cred) {
                      return cred.apiProducts.find(function (prod) {
                        return (filteredProductNames.indexOf(prod.apiproduct) >= 0);
                      });
                    });
                return creds && (creds.length > 0);
              });

          if (filteredApps) {
            common.logWrite('count of Apps containing %s: %d', opt.options.proxy, filteredApps.length);
            if (filteredApps.length) {
              filteredApps.forEach( (a, ix) => {
                common.logWrite(ix + ': /v1/o/' + org.conn.orgname + '/developers/' + a.developerId + '/apps/' + a.name);
              });
            }
            if ( opt.options.verbose ) {
              common.logWrite(JSON.stringify(filteredApps, null, 2));
            }
          }
          else {
            common.logWrite("none found");
          }

        });
      }
    }
  });
});
