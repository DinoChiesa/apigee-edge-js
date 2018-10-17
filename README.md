# apigee-edge-js

The missing library of functions for administering Apigee Edge from nodejs.

## Do you want to automate the administration of Apigee Edge from Nodejs?

This library helps you do that.

Example:

To create a new developer account:

```js
var edgejs = require('apigee-edge-js'),
    common = edgejs.utility,
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
  common.logWrite('connected');

  var options = {
        developerEmail : "JDimaggio@example.org",
        lastName : "Dimaggio",
        firstName : "Josephine",
        userName : "JD1",
        attributes: { "uuid": uuidV4() }
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

You can also tell the library to read credentials from .netrc :

```js
var edgejs = require('apigee-edge-js'),
    utility = edgejs.utility,
    apigeeEdge = edgejs.edge;

var options = { org : config.org, netrc: true };
apigeeEdge.connect(options, function(e, org){
 ...
});
```


## This is not an official Google product

This library and the example tools included here are not an official Google product.
Support is available on a best-effort basis via github or community.apigee.com .
Pull requests are welcomed.


## The Object Model

To start, you call apigeeEdge.connect(). This will connect to an Edge organization. If
it is a SaaS organization, this method will try to find a stashed OAuth token and if not
will get an OAuth token. The callback will receive (e, org), where e is an error,
possibly null, and org is an Organization object with the following members, each a
hash with various child members as functions:


| member               | functions                                                        |
| -------------------- | ---------------------------------------------------------------- |
| environments         | get, getVhosts                                                   |
| proxies              | get, del, deploy, undeploy, import, export, getRevisions, getDeployments, getResourcesForRevision, getPoliciesForRevision, getProxyEndpoints |
| caches               | get, create, del                                                 |
| kvms                 | get, create, put, del                                            |
| sharedflows          | get, del, deploy, undeploy, import, export, getRevisions, getDeployments, getResourcesForRevision, getPoliciesForRevision |
| flowhooks            | get, put                                                         |
| products             | get, create, del                                                 |
| developers           | get, create, del,revoke, approve                                 |
| keystores            | get, create, del, import key and cert, create references         |
| developerapps        | get, create, del, revoke, approve                                |
| appcredentials       | add, del, revoke, approve                                        |
| audits               | get                                                              |
| stats                | get                                                              |
| maskconfigs          | get, set, add/update, remove                                     |

## What is possible here?

As you can see from the function list above, pretty much all the basic stuff you want to do with Apigee Edge administration is here. There are some gaps but those are being filled in as need arises.

You can examine the lib/edge.js file to see the full list of operations.  Or see [the examples directory](./examples) for some example code. A few examples are shown here.

Pull requests are welcomed, for the code or for examples.


### Export the latest revision of an API Proxy

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

```
var options = {
  name: 'proxy1',
  revision: 2,
  environment : 'test'
};
org.proxies.deploy(options, function(e, result) {
  if (e) {
    console.log(JSON.stringify(e, null, 2));
    if (result) { console.log(JSON.stringify(result, null, 2)); }
    return e;
  }
  console.log('deploy ok.');
});
```


### Get the latest revision of an API Proxy

```
org.proxies.getRevisions({name:'proxyname-here'}, function(e, result){
  if (e) {
    console.log("ERROR:\n" + JSON.stringify(e, null, 2));
    return;
  }
  console.log('revisions: ' + JSON.stringify(result)); // eg, [ "1", "2", "3"]
  var latestRevision = result[result.length-1];
});
```


### Get the latest revision of an API Proxy

```
var async = require('async');
analyzeOneProxy(proxyName, callback) {
  collection.get({ name: proxyName }, function(e, result) {
    console.log(JSON.stringify(result));
  });
}

org.proxies.get({}, function(e, proxies) {
  if (e) {
    console.log("ERROR:\n" + JSON.stringify(e, null, 2));
    return;
  }
  async.mapSeries(proxies, analyzeOneProxy, function (e, proxyResults) {
    if (e) {
      console.log("ERROR:\n" + JSON.stringify(e, null, 2));
      return;
    }
    var flattened = [].concat.apply([], proxyResults);
    console.log(JSON.stringify(flattened, null, 2));
  });
});
```

### Create a Keystore and load a Key and Cert

```
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

```
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


### More Examples

See [the examples directory](./examples) for a set of working example tools.


## To Run Tests

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

The latter example will retrieve credentials from .netrc.

Then, to run tests:
```sh
npm test
```

or
```
node_modules/mocha/bin/mocha
```


## Frequently Asked Questions

1. Is this an official Google product?  Is it supported?

   No, This library and the example tools included here are not an official Google product.
   Support is available on a best-effort basis via github or community.apigee.com .

2. What is this thing good for?

   If your team builds nodejs scripts to perform administrative operations on your
   Apigee Edge organization, you may want to use this library.  It provides a wrapper of
   basic operations to allow you to import and deploy proxies, create products or
   developers or applications, populate KVMs, create caches, and so on.

2. Does it have a wrapper for creating a virtualhost?

   No, that's one thing it does not help with, at this time. Let me know if you think that's important.

2. How does the library authenticate to Apigee Edge?

   The library obtains an oauth token using the standard client_id and secret for
   administrative operations.  The library caches the token into a filesystem file, for
   future use. The library runtime automatically refreshes the token as necessary, even
   during a single long-running script.



## License

This code is Copyright (C) 2017-2018 Google LLC, and is licensed under the Apache 2.0 source license.

## Bugs

* The tests are incomplete

## Related

See also, [this Powershell module](https://github.com/DinoChiesa/Edge-Powershell-Admin)


