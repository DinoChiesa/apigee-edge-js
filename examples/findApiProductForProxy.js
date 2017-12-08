// findApiProductForProxy.js
// ------------------------------------------------------------------
//
// created: Mon Mar 20 09:57:02 2017
// last saved: <2017-December-07 18:30:02>

var edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
    apigeeEdge = edgejs.edge,
    Getopt = require('node-getopt'),
    version = '20171207-1807',
    getopt = new Getopt(common.commonOptions.concat([
      ['P' , 'proxy=ARG', 'Required. the proxy to find.'],
      ['T' , 'notoken', 'Optional. do not try to obtain a login token.']
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
  'Apigee Edge findApiProductForProxy.js tool, version: ' + version + '\n' +
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

var options = {
      mgmtServer: opt.options.mgmtserver,
      org : opt.options.org,
      user: opt.options.username,
      password: opt.options.password,
      no_token: opt.options.notoken,
      verbosity: opt.options.verbose || 0
    };

apigeeEdge.connect(options, function(e, org) {
  handleError(e);
  org.products.get({expand:true}, function(e, result) {
    handleError(e);
    var apiproducts = result.apiProduct;
    common.logWrite('total count of API products for that org: %d', apiproducts.length);
    var filtered = apiproducts.filter(function(product) {
          return (product.proxies.indexOf(opt.options.proxy) >= 0);
        });

    if (filtered) {
      common.logWrite('count of API products containing %s: %d', opt.options.proxy, filtered.length);
      if (filtered.length) {
        common.logWrite(JSON.stringify(filtered.map( function(item) { return item.name;}), null, 2));

      }
      if ( opt.options.verbose ) {
        common.logWrite(JSON.stringify(filtered, null, 2));
      }
    }

  });
});
