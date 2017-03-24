# apigee-edge-js

The missing library of functions for administering Apigee Edge from nodejs.

## Do you want to automate the administration of Apigee Edge from Nodejs?

This library helps you do that.

Example:

To create a new developer account:

```js
apigeeEdge.setEdgeConnection(opt.options.mgmtserver, opt.options.org, {
  headers : { accept: 'application/json' },
  auth : {
    user: config.username,
    pass: config.password
  }});

var options = {
      developerEmail : "JDimaggio@example.org",
      lastName : "Dimaggio",
      firstName : "Josephine",
      userName : "JD1",
      attributes: { "uuid": uuidV4() }
    };

apigeeEdge.createDeveloper(options, function(e, result){
  if (e) {
    console.log(e);
    console.log(e.stack);
    process.exit(1);
  }
  console.log(sprintf('ok. developer: %s', JSON.stringify(result, null, 2)));
});

```

## What is possible here?

Pretty much all the basic stuff you want to do with Apigee Edge administration is here.

||      entity type    ||  operations                                   ||
|----------------------|------------------------------------------------|
| api proxies          | import, export, deploy, undeploy, delete, list | 
| API products         | create, list, update, delete  |
| cache                | create, list, delete |
| shared flow          | import, export, deploym undeploy |
| KVM                  | create, list, update, delete, populate |
| developer app        | create, delete, add credential, delete credential  |
| developer            | create, delete  |

You can examine the lib/edge.js file to see the full list of operations.

## License?

This code is copyright (C) 2017 Google Inc, and is licensed under the Apache 2.0 source license.


