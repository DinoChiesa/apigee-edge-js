#! /usr/local/bin/node
// createDeveloperAppWithRsaKeypair.js
// ------------------------------------------------------------------
// provision a developer app for an API Product in Apigee Edge,
// with a keypair.
//
// last saved: <2019-October-04 11:04:55>
/* jshint esversion:9, strict:implied,node:true */

const fs         = require('fs'),
      path       = require('path'),
      util       = require('util'),
      edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      NodeRSA    = require('node-rsa'),
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      version    = '20191004-1055',
      getopt     = new Getopt(common.commonOptions.concat([
        ['p' , 'product=ARG', 'name of the API product to enable on this app'],
        ['E' , 'email=ARG',   'email address of the developer for which to create the app'],
        ['N' , 'appname=ARG', 'name for the app'],
        ['x' , 'expiry=ARG',  'expiry for the credential']
      ])).bindHelp();

// ========================================================

console.log(
  'Apigee Edge Developer App creation tool, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

common.logWrite('start');

// process.argv array starts with 'node' and 'scriptname.js'
let opt = getopt.parse(process.argv.slice(2));

if ( !opt.options.appname ) {
  console.log('You must specify a name of an app');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.product ) {
  console.log('You must specify an API Product');
  getopt.showHelp();
  process.exit(1);
}

if ( !opt.options.email ) {
  console.log('You must specify an email address for the developer');
  getopt.showHelp();
  process.exit(1);
}

common.verifyCommonRequiredParameters(opt.options, getopt);

apigeeEdge.connect(common.optToOptions(opt))
  .then(org => {
    common.logWrite('connected');

    const keypair = new NodeRSA({b: 2048}),
          publicKeyPem = keypair.exportKey('pkcs8-public-pem'),
          privateKeyPem = keypair.exportKey('pkcs8-private-pem');

    const options = {
            developerEmail : opt.options.email,
            appName        : opt.options.appname,
            apiProduct     : opt.options.product,
            expiry         : opt.options.expiry,
            attributes     : { rsa_public_key: publicKeyPem, created: (new Date()).toISOString() }
          };

    return org.developerapps.create(options)
      .then (result => {
        common.logWrite('ok. app name: %s', result.name);
        common.logWrite('apikey %s', result.credentials[0].consumerKey);
        common.logWrite('secret %s', result.credentials[0].consumerSecret);
        let filename = path.resolve(__dirname, '..', opt.options.org + '.' +
                                    opt.options.appname + ".private.pkcs8.pem");
        fs.writeFileSync(filename, privateKeyPem);
        fs.chmodSync(filename, '400');
        common.logWrite('private key file %s', filename);
      });
  })
  .catch (e => console.log(util.format(e)));
