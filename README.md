# apigee-edge-js

![Node](https://img.shields.io/node/v/apigee-edge-js.svg) ![Test](https://raw.githubusercontent.com/DinoChiesa/apigee-edge-js/master/test/badge.svg?sanitize=true) ![LastCommit](https://img.shields.io/github/last-commit/DinoChiesa/apigee-edge-js/master.svg) ![Downloads](https://img.shields.io/npm/dm/apigee-edge-js.svg)

A library of functions for administering Apigee Edge from nodejs.

Do you want to automate the administration or management of Apigee Edge from Nodejs?
This library helps you do that.

Example:

To create a new developer in Apigee Edge:

```js
var edgejs = require('apigee-edge-js'),
    apigeeEdge = edgejs.edge;

var options = {
    org : config.org,
    user: config.username,
    password: config.password
    };

apigeeEdge.connect(options)
  .then ( (org) => {
    var options = {
          developerEmail : "JDimaggio@example.org",
          lastName : "Dimaggio",
          firstName : "Josephine",
          userName : "JD1"
        };

    return org.developers.create(options)
      .then( (result) => console.log('ok. developer: ' + JSON.stringify(result)) )
  })
  .catch ( error => {
    console.log('error: ' + error);
  });
```

You can also tell the library to read credentials from [.netrc](https://linux.die.net/man/5/netrc):

```js
var edgejs = require('apigee-edge-js'),
    utility = edgejs.utility,
    apigeeEdge = edgejs.edge;

var options = { org : config.org, netrc: true };
apigeeEdge.connect(options).then(...);
```


For customers who have SSO (SAML) enabled for their Edge SaaS organization, you can
obtain a token [with a
passcode](https://docs.apigee.com/api-platform/system-administration/using-saml#refresh).
This requires that you first sign-in with the browser using the interactive
experience, then visit `https://zoneName.login.apigee.com/passcode` to obtain a
passcode. Then:

```js
var edgejs = require('apigee-edge-js'),
    utility = edgejs.utility,
    apigeeEdge = edgejs.edge;

var options = { org : config.org, passcode: 'abcdefg' };
apigeeEdge.connect(options).then(...);

```

The methods on the various objects accept callbacks, and return promises. In code
you write that uses this library, it's probably best if you choose one or the
other. Here's an example using old-school callbacks instead of ES6 promises:

```js
var edgejs = require('apigee-edge-js'),
    apigeeEdge = edgejs.edge;

var options = {
      mgmtServer: config.mgmtserver,
      org : config.org,
      user: config.username,
      password: config.password
    };

apigeeEdge.connect(options, function(e, org){
  if (e) {
    console.log(e);
    console.log(e.stack);
    process.exit(1);
  }

  var options = {
        developerEmail : "JDimaggio@example.org",
        lastName : "Dimaggio",
        firstName : "Josephine",
        userName : "JD1"
      };

  org.developers.create(options, function(e, result){
    if (e) {
      utility.logWrite(JSON.stringify(e));
      process.exit(1);
    }
    utility.logWrite(sprintf('ok. developer: %s', JSON.stringify(result, null, 2)));
  });
});
```



## This is not an official Google product

This library and the example tools included here are not an official Google product.
Support is available on a best-effort basis via github or community.apigee.com .
Pull requests are welcomed.


## The Object Model

To start, you call apigeeEdge.connect(). This will connect to an Edge organization. If
it is a SaaS organization, this method will try to find a stashed OAuth token and if not
will get an OAuth token.

* *If you use callbacks,* the callback will receive `(e, org)`, where e is an error,
possibly null, and org is an Organization object

* *If you use promises,* the promise will resolve with the value of an Organization object

The organization object has the following members, each a
hash with various child members as functions:


| member               | functions                                                        |
| -------------------- | ---------------------------------------------------------------- |
| (self)               | get, getProperties, addProperties, removeProperties, setConsumerSecretLength, setConsumerKeyLength |
| environments         | get, getVhosts                                                   |
| proxies              | get, del, deploy, undeploy, import, export, getRevisions, getDeployments, getResourcesForRevision, getPoliciesForRevision, getProxyEndpoints |
| caches               | get, create, del                                                 |
| kvms                 | get, create, put, del                                            |
| resourcefiles        | get, create, update, del                                         |
| sharedflows          | get, del, deploy, undeploy, import, export, getRevisions, getDeployments, getResourcesForRevision, getPoliciesForRevision |
| flowhooks            | get, put                                                         |
| products             | get, create, del                                                 |
| developers           | get, create, del,revoke, approve                                 |
| keystores            | get, create, del, import key and cert, create references         |
| targetservers        | get, create, del, disable, enable, update                        |
| developerapps        | get, create, del, revoke, approve, update                        |
| appcredentials       | add, del, revoke, approve                                        |
| audits               | get                                                              |
| stats                | get                                                              |
| specs                | get, getMeta, list, create, update, del                          |
| maskconfigs          | get, set, add/update, remove                                     |

Each child function gets invoked as a function returning a promise: `fn(options)`, or in old-school callback style: `fn(options, callback)` .


## What is possible here?

As you can see from the function list above, pretty much all the basic stuff you want to do with Apigee Edge administration is here. There are some gaps but those are being filled in as need arises.

You can examine [the examples directory](./examples) for some example code illustrating some practical possibilities. A few specific code examples are shown here.

Pull requests are welcomed, for the code or for examples.

One disclaimer:

* The spec module wraps the /dapi API, which is at this moment undocumented and
  unsupported, and subject to change. It works today, but the spec module may stop
  functioning at any point. Use it at your own risk!



## Pre-Requisites

Nodejs v10.15.1 or later. The tests use Promise.finally and
other recent node features are also used in the library and examples.


### Export the latest revision of an API Proxy

using promises:
```js
edgeOrg.proxies.export({name:'proxyname'})
  .then ( result => {
    fs.writeFileSync(path.join('/Users/foo/export', result.filename), result.buffer);
    console.log('ok');
  })
  .catch( error => console.log(util.format(error)) );
```

In the case of an error, the catch()  will get the Error object. There will be an additional member on the reason object: result. The result is the payload send back, if any.

using callbacks:
```js
edgeOrg.proxies.export({name:'proxyname'}, function(e,result) {
  if (e) {
    console.log("ERROR:\n" + JSON.stringify(e, null, 2));
    return;
  }
  fs.writeFileSync(path.join('/Users/foo/export', result.filename), result.buffer);
  console.log('ok');
});
```


### Export a specific revision of an API Proxy

promises:
```js
edgeOrg.proxies.export({name:'proxyname', revision:3})
  .then ( result => {
    fs.writeFileSync(path.join('/Users/foo/export', result.filename), result.buffer);
    console.log('ok');
  });
```

callbacks:
```js
edgeOrg.proxies.export({name:'proxyname', revision:3}, function(e,result) {
  if (e) {
    console.log("ERROR:\n" + JSON.stringify(e, null, 2));
    return;
  }
  fs.writeFileSync(path.join('/Users/foo/export', result.filename), result.buffer);
  console.log('ok');
});
```



### Import an API Proxy from a Directory

promises:
```js
var options = {
      mgmtServer: mgmtserver,
      org : orgname,
      user: username,
      password:password
    };
apigeeEdge.connect(options)
  .then ( org =>
    org.proxies.import({name:opt.options.name, source:'/tmp/path/dir'})
      .then ( result =>
        console.log('import ok. %s name: %s r%d', term, result.name, result.revision) ) )
  .catch ( error => {
    console.log(util.format(error));
  });
```

callbacks:
```js
var options = {
      mgmtServer: mgmtserver,
      org : orgname,
      user: username,
      password:password
    };
apigeeEdge.connect(options, function(e, org){
  if (e) {
    console.log(JSON.stringify(e, null, 2));
    process.exit(1);
  }

  org.proxies.import({name:opt.options.name, source:'/tmp/path/dir'}, function(e, result) {
    if (e) {
      console.log('error: ' + JSON.stringify(e, null, 2));
      if (result) { console.log(JSON.stringify(result, null, 2)); }
      process.exit(1);
    }
    console.log('import ok. %s name: %s r%d', term, result.name, result.revision);
  });
```



### Deploy an API Proxy

```js
var options = {
  name: 'proxy1',
  revision: 2,
  environment : 'test'
};

org.proxies.deploy(options)
  .then( result => console.log('deployment succeeded.') )
  .catch( error => console.log('deployment failed. ' + error) );
```


### Get the latest revision of an API Proxy

```js
org.proxies.getRevisions({name:'proxyname-here'})
  then( (result) => {
    console.log('revisions: ' + JSON.stringify(result)); // eg, [ "1", "2", "3"]
    var latestRevision = result[result.length-1];
     ...
  });
```


### Get the latest revision of every API Proxy in an org

This uses an Array.reduce() with a series of promises, each of which appends an item to an array of results.

```js
apigeeEdge.connect(options)
  .then( (org) => {
    common.logWrite('connected');
    org.proxies.get({})
      .then( (items) => {
        var reducer = (promise, proxyname) =>
          promise .then( (results) =>
                         org.proxies
                           .get({ name: proxyname })
                           .then( ({revision}) => [ ...results, {proxyname, revision:revision[revision.length-1]} ] )

                       );

        items
            .reduce(reducer, Promise.resolve([]))
            .then( (arrayOfResults) => common.logWrite('all done...\n' + JSON.stringify(arrayOfResults)) )
            .catch( e => console.error('error: ' + e) );

      });
  })
  .catch( e => console.error(e) );
```


### Create a Keystore and load a Key and Cert

using callbacks:
```js
  var options = {
        environment : 'test',
        name : 'keystore1'
      };
  org.keystores.create(options, function(e, result){
    if (e) { ... }
    console.log('ok. created');
    options.certFile = './mycert.cert';
    options.keyFile = './mykey.pem';
    options.alias = 'alias1';
    options.keyPassword = 'optional password for key file';
    org.keystores.importCert(options, function(e, result){
      if (e) { ... }
      console.log('ok. key and cert stored.');
    });
  });
```

### Read and Update Mask Configs for an Organization

callbacks:
```js
const edgejs = require('apigee-edge-js');
const apigeeEdge = edgejs.edge;
var options = {org : 'ORGNAME', netrc: true, verbosity : 1 };
apigeeEdge.connect(options, function(e, org) {
  console.log('org: ' + org.conn.orgname);
  org.maskconfigs.get({name: 'default'}, function(e, body) {
    console.log(JSON.stringify(body));
    org.maskconfigs.set({ json : '$.store.book[*].author' }, function(e, body) {
      console.log(JSON.stringify(body));
      org.maskconfigs.add({ xml : '/apigee:Store/Employee' }, function(e, body) {
        console.log(JSON.stringify(body));
        org.maskconfigs.remove({ remove : ['xPathsFault','jSONPathsFault'] }, function(e, body) {
          console.log(JSON.stringify(body));
          org.maskconfigs.add({ variables : 'dino_var' }, function(e, body) {
            console.log(JSON.stringify(body));
            org.maskconfigs.add({ namespaces : { prefix:'apigee', value:'urn://apigee' } }, function(e, body) {
              console.log(JSON.stringify(body));
            });
          });
        });
      });
    });
  });
});
```

with ES6 promises:
```js
const edgejs = require('apigee-edge-js');
const apigeeEdge = edgejs.edge;
var options = {org : 'ORGNAME', netrc: true, verbosity : 1 };
apigeeEdge.connect(options)
  .then ( (org) => {
    console.log('org: ' + org.conn.orgname);
    org.maskconfigs.get({name: 'default'})
      .then( (result) => console.log(JSON.stringify(result)) )
      .then( () => org.maskconfigs.set({ json : '$.store.book[*].author' }) )
      .then( (result) => console.log(JSON.stringify(result)) )
      .then( () => org.maskconfigs.add({ xml : '/apigee:Store/Employee' }) )
      .then( (result) => console.log(JSON.stringify(result)) )
      .then( () => org.maskconfigs.remove({ remove : ['xPathsFault','jSONPathsFault'] }) )
      .then( (result) => console.log(JSON.stringify(result)) )
      .then( () => org.maskconfigs.add({ variables : 'dino_var' }) )
      .then( (result) => console.log(JSON.stringify(result)) )
      .then( () => org.maskconfigs.add({ namespaces : { prefix:'apigee', value:'urn://apigee' } })
      .then( (result) => console.log(JSON.stringify(result)) )
    })
  .catch ( e => console.log(e) );
```

### Create a Target Server

ES6 promises:
```js
const edgejs = require('apigee-edge-js');
const apigeeEdge = edgejs.edge;
var options = {org : 'ORGNAME', netrc: true, verbosity : 1 };
apigeeEdge.connect(options)
  .then ( org => {
    console.log('org: ' + org.conn.orgname);
    return org.targetservers.create({
      environment : 'test',
      target : {
        name : 'targetserver1',
        host: "api.example.com",
        port: 8080,
        sSLInfo : { enabled : false }
      }
    });
  })
  .catch ( e => console.log(e) );

```

### Create a Developer App

```js
apigeeEdge.connect(connectOptions)
  .then ( org => {
    const options = {
            developerEmail,
            name : entityName,
            apiProduct : apiProducts[0]
          };
    org.developerapps.create(options)
      .then( result => {
        ...
      })
      .catch( e => {
        console.log('failed to create: ' + e);
      });
  });
```

### Update attributes on a Developer App

```js
apigeeEdge.connect(connectOptions)
  .then ( org => {
    const attributes = {
            updatedBy : 'apigee-edge-js',
            updateDate: new Date().toISOString()
          };
    org.developerapps.update({ developerEmail, app, attributes })
      .then ( result => {
        console.log('attrs: ' + JSON.stringify(result.attributes));
      })
      .catch( e => {
        console.log('failed to update: ' + e);
      });
  });
```

### Load data from a file into a KVM entry

```js
function loadKeyIntoMap(org) {
  var re = new RegExp('(?:\r\n|\r|\n)', 'g');
  var pemcontent = fs.readFileSync(opt.options.pemfile, "utf8").replace(re,'\n');
  var options = {
        env: opt.options.env,
        kvm: opt.options.mapname,
        key: opt.options.entryname,
        value: pemcontent
      };
  common.logWrite('storing new key \'%s\'', opt.options.entryname);
  return org.kvms.put(options)
    .then( _ => common.logWrite('ok. the key was loaded successfully.'));
}

apigeeEdge.connect(common.optToOptions(opt))
  .then ( org => {
    common.logWrite('connected');
    return org.kvms.get({ env })
      .then( maps => {
        if (maps.indexOf(mapname) == -1) {
          // the map does not yet exist
          common.logWrite('Need to create the map');
          return org.kvms.create({ env: opt.options.env, name: opt.options.mapname, encrypted:opt.options.encrypted})
            .then( _ => loadKeyIntoMap(org) );
        }

        common.logWrite('ok. the required map exists');
        return loadKeyIntoMap(org);
      });
  })
  .catch( e => console.log('Error: ' + util.format(e)));
```

### Import an OpenAPI Spec

```js
apigeeEdge.connect(connectOptions)
  .then ( org =>
     org.specs.create({ name: 'mySpec', filename: '~/foo/bar/spec1.yaml' })
        .then( r => {
          console.log();
          console.log(r);
        }) )
  .catch( e => console.log('failed to create: ' + util.format(e)) );
```

### Lots More Examples

See [the examples directory](./examples) for a set of working example tools.
Or you can examine [the test directory](./test) for code that exercises the library.

## To Run the Tests

To run tests you should create a file called testConfig.json and put it in the toplevel dir of the repo.
It should have contents like this:

```json
{
  "org" : "my-org-name",
  "user": "username@example.com",
  "password": "password-goes-here",
  "verbosity": 1
}
```

or:
```json
{
  "org" : "my-org-name",
  "netrc": true
}
```

The latter example will retrieve administrative credentials for Apigee Edge from your .netrc file.

Then, to run tests:
```sh
npm test
```

or
```sh
node_modules/mocha/bin/mocha
```

To run a specific subset of tests, specify a regex to the grep option:
```sh
node_modules/mocha/bin/mocha  --grep "^Cache.*"
```


## Frequently Asked Questions

1. Is this an official Google product?  Is it supported?

   No, This library and the example tools included here are not an official Google product.
   Support is available on a best-effort basis via github or community.apigee.com .

2. What is this thing good for?

   If your team builds nodejs scripts to perform administrative operations on your
   Apigee Edge organization, you may want to use this library. It provides a wrapper of
   basic operations to allow you to import and deploy proxies, create products or
   developers or applications, populate KVMs, create caches, and so on.

2. Does it have a wrapper for creating a virtualhost?

   No, that's one thing it does not help with, at this time. Let me know if you
   think that's important.

2. How does the library authenticate to Apigee Edge?

   The library obtains an oauth token using the standard client_id and secret
   for administrative operations. The library caches the token into a filesystem
   file, for future use. The library runtime automatically caches the token, and
   refreshes the token as necessary, even during a single long-running script.



## License

This code is Copyright (C) 2017-2019 Google LLC, and is licensed under the Apache 2.0 source license.

## Bugs

* The tests are a work in progress

## Related

See also, [this Powershell module](https://github.com/DinoChiesa/Edge-Powershell-Admin)


