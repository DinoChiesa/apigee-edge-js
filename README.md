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


## Disclaimer

This library and the example tools included here are not an official Google product.
Support is available on a best-effort basis via github or community.apigee.com .


## The Basic Object Model

To start, you call apigeeEdge.connect(). This will connect to an Edge organization. If it is a SaaS organization, this method will try to find a stashed OAuth token and if not will get an OAuth token.
The callback will return (e, org), where e is an error, possibly null, and org is an Organization object with these members. Each is itself a hash and has child members as functions:


| member               | functions                                                        |
| -------------------- | ---------------------------------------------------------------- |
| environments         | get, getVhosts                                                   |
| proxies              | get, del, deploy, undeploy, import, export, getRevisions, getResourcesForRevision, getPoliciesForRevision |
| caches               | get, create, del                                                 |
| kvms                 | get, create, put, del                                            |
| sharedflows          | get, del, deploy, undeploy, import, export, getRevisions, getResourcesForRevision, getPoliciesForRevision |
| flowhooks            | get, put                                                         |
| products             | get, create, del                                                 |
| developers           | get, create, del                                                 |
| developerapps        | get, create, del                                                 |
| appcredentials       | add, del                                                         |


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


## License

This code is copyright (C) 2017 Google Inc, and is licensed under the Apache 2.0 source license.

## Bugs

* The tests are incomplete

## Related

See also, [this Powershell module](https://github.com/DinoChiesa/Edge-Powershell-Admin)


