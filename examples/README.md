# Example Tools for Apigee Edge

These are example tools implemented in nodejs/Javascript, that use the apigee-edge-js library. 

They all can retrieve credentials from a .netrc file, or you can pass in user credentials interactively. 
Also, they use the OAuth authentication mechanism for Apigee Edge. 


# Import a proxy

```
./importAndDeploy.js -n -v -o ORGNAME  -d ../bundles/oauth2-cc  -N demo-oauth2-cc 

```

# Import and Deploy a proxy

```
./importAndDeploy.js -n -v -o ORGNAME  -d ../bundles/protected-by-oauth -N demo-protected-by-oauth -e test

```

# Import and Deploy a sharedflow

```
./importAndDeploy.js -n -v -o ORGNAME  -d ../bundles/sharedflow-1 -N sf-1 -e main -S

```

# Create a product

```
./provisionApiProduct.js -n -v -o ORGNAME  -p demo-protected-by-oauth -N Demo-Product-1 
```


# Create a developer

```
 ./createDeveloper.js -n -v -o ORGNAME -E dchiesa+2017@google.com -F Dino -L Chiesa 

```

# Create a developer app

```
./createDeveloperApp.js -n -v -o ORGNAME -N DemoApp1 -E dchiesa+2017@google.com -p Demo-Product-1 
```


# Delete a developer app

```
./deleteDeveloperApp.js -n -v -o ORGNAME -N DemoApp3 -E dchiesa+2017@google.com

```


# Export a set of proxies with a name matching a RegExp pattern

```
./exportApi.js -n -v -o ORGNAME -P ^r.\*

```

# Export a single named proxy

```
./exportApi.js -n -v -o ORGNAME -N runload

```

