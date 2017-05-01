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
      console.log(e);
      console.log(e.stack);
      process.exit(1);
    }
    common.logWrite(sprintf('ok. developer: %s', JSON.stringify(result, null, 2)));
  });
});
```

## The Basic Object Model

To start, you call apigeeEdge.connect.  This will connect to an Edge organization. If it is a SaaS organization, this method will try to find a stashed OAuth token and if not will get an OAuth token.
The callback will return (e, org), where e is an error, possibly null, and org is an Organization object with these members. Each is a hash and has child members as functions: 


| member               | functions                                                |
| -------------------- | -------------------------------------------------------- |
| proxies              | get, deploy, undeploy, del, importFromDir, importFromZip |
| caches               | get, create, del                                         |
| kvms                 | get, create, put, del                                    |
| sharedflows          | deploy, undeploy, importFromDir, importFromZip           |
| products             | get, create, del                                         |
| developers           | get, create, del                                         |
| developerapps        | get, create, del                                         |
| appcredentials       | add, del                                                 |


## What is possible here?

As you can see from the function list above, pretty much all the basic stuff you want to do with Apigee Edge administration is here. There are some gaps but those are being filled in as need arises.

You can examine the lib/edge.js file to see the full list of operations.  Or see the tests directory for example code. 

Pull requests are welcomed.


## License?

This code is copyright (C) 2017 Google Inc, and is licensed under the Apache 2.0 source license.

## Bugs

* The tests are incomplete

## Related

See also, [this Powershell module](https://github.com/DinoChiesa/Edge-Powershell-Admin)


