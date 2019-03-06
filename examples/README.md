# Example Tools for Apigee Edge

These are example tools implemented in nodejs/Javascript, that use the apigee-edge-js library.

They all can retrieve credentials from a .netrc file, or you can pass in user credentials interactively.
Also, they use the OAuth authentication mechanism for Apigee Edge.

## Disclaimer

These tools are not an official Google product, nor are they part of an official Google product, nor are they included under any Google support contract.
Support is available on a best-effort basis via github or community.apigee.com .


# Common options

All of the scripts in this directory support some common options, where appropriate. These are:

```
Options:
  -M, --mgmtserver=ARG the base path, including optional port, of the Edge mgmt server. Defaults to https://api.enterprise.apigee.com .
  -u, --username=ARG   org user with permissions to read Edge configuration.
  -p, --password=ARG   password for the org user.
  -n, --netrc          retrieve the username + password from the .netrc file. In lieu of -u/-p
  -o, --org=ARG        the Edge organization.
  -Z, --ssoZone=ARG    specify the SSO zone to use when authenticating.
  -C, --passcode=ARG   specify the passcode to use when authenticating.
  -T, --notoken        do not try to obtain an oauth token.
  -v, --verbose
  -h, --help
```

For example, to list developers for an organization, if you have a passcode, then you can do this:

```
 node ./listAndQueryDevelopers.js -v -o orgname -Z zonename  -C passcodehere
```

You do not need to pass a username if using a passcode to obtain a token.

Also: the underlying apigee-edge-js library caches access tokens, so ... you will not need a passcode for each script invocation. Subsequent script invocations will use the cached token. Just pass the zonename and user:

```
 node ./listAndQueryDevelopers.js -v -u dchiesa@google.com -o orgname -Z zonename
```

Be aware that when the refresh token expires, you will need a new passcode to get a new token.


# Import a proxy

Import a proxy, using a bundle zip as the source. Derive the name for the proxy from the *.xml in the apiproxy directory:

```
ORG=orgname
./importAndDeploy.js -n -v -o $ORG  -d ../bundles/oauth2-cc.zip
```

Import a proxy, using an exploded directory as the source. Derive the name from the *.xml in the apiproxy directory:
```
./importAndDeploy.js -n -v -o $ORG  -d ../bundles/oauth2-cc
```

Import, but override the name specified in the proxy XML file in the apiproxy dir:

```
./importAndDeploy.js -n -v -o $ORG  -d ../bundles/oauth2-cc  -N demo-oauth2-cc
```


# Import and Deploy a proxy

Deploy to one environment:
```
ENV=test
./importAndDeploy.js -n -v -o $ORG  -d ../bundles/protected-by-oauth -e $ENV
```

Deploy to multiple environments:

```
./importAndDeploy.js -n -v -o $ORG  -d ../bundles/protected-by-oauth -e test,prod
```


# Import and Deploy a sharedflow
```
./importAndDeploy.js -n -v -o $ORG  -d ../bundles/sharedflow-1 -e main -S
```

# Undeploy all revisions of a proxy from all environments
```
.//undeployAndMaybeDelete.js -v -n -o $ORG -P jsonpath-extract
```

# Undeploy all revisions of a proxy and delete it
```
.//undeployAndMaybeDelete.js -v -n -o $ORG -P jsonpath-extract -D
```

# Create a product

```
PROXY=demo-protected-by-oauth
PRODUCTNAME=Demo-Product-1
./provisionApiProduct.js -n -v -o $ORG  -p $PROXY -N $PRODUCTNAME
```


# Create a developer

```
FIRST=Dino
LAST=Chiesa
EMAIL=dchiesa+2017@google.com
 ./createDeveloper.js -n -v -o $ORG -E $EMAIL -F $FIRST -L $LAST
```

# Create a developer app

```
./createDeveloperApp.js -n -v -o $ORG -N DemoApp1 -E dchiesa+2017@google.com -p Demo-Product-1
```


# Delete a developer app

```
./deleteDeveloperApp.js -n -v -o $ORG -N DemoApp3 -E dchiesa+2017@google.com
```


# Export a set of proxies with a name matching a RegExp pattern

```
./exportApi.js -n -v -o $ORG -P ^r.\*
```

If you  want to just see which proxies would be exported, you can use the -T option.

```
./exportApi.js -n -v -o $ORG -P ^r.\* -T
```


# Export all proxies in an org

This just uses a regex pattern that matches all names.

```
./exportApi.js -n -v -o $ORG -P .
```


# Export a single named proxy

In lieu of the -P (pattern) option you can use -N (name) for a specific proxy.


```
./exportApi.js -n -v -o $ORG -N runload
```

By defaut the script will export the latest revision of the proxy.
If you know  the revision you'd like to export, you can use the -R option to specify it.


```
./exportApi.js -n -v -o $ORG -N runload -R 3
```

# Find all proxies that have a vhost with name matching "default"

```
node ./findVhostsForDeployedProxies.js -n -v -o $ORG  -R default

```


# Revoke a developer app by key

```
node ./revokeOrApprove.js -n -v -o $ORG  -k dc79ee0e4b95b74adef42d63a5c6 -R

```

# Revoke a developer app by developer email and app name

```
node ./revokeOrApprove.js -n -v -o $ORG  -d developer@example.com -a appnamehere -R

```

# Add (import) a credential to an existing developer app

```
./addAppCredential.js -v -n -o $ORG -A AppName-20180803 -E developerEmail@apigee.com -p ProductName -C Unique_Credential_Here_1983983XYZ123ABCDE
```

# Load a PEM as a value into a KVM (maybe encrypted)

```
./loadPemIntoKvm.js -n -v -o $ORG -e ENVNAME -m KVM_MAP_NAME -F ./public.pem -N NAME_OF_VALUE
```

# Resource Tool

## List
```
$ node ./resourceTool.js -v -n -o $ORG -A list -e test
Edge API resourcefile tool, version: 20190306-0851
Node.js v10.15.1

[2019-Mar-06 08:43:16] start
[2019-Mar-06 08:43:16] connect: {"orgname":"therealdinochiesa2-eval","loginBaseUrl":"https://login.apigee.com","user":"dchiesa@google.com","mgmtServer":"https://api.enterprise.apigee.com"}
[2019-Mar-06 08:43:16] found stashed token.
[2019-Mar-06 08:43:16] valid and not expired
[2019-Mar-06 08:43:16] GET https://api.enterprise.apigee.com/v1/o/therealdinochiesa2-eval/e/test/resourcefiles
[2019-Mar-06 08:43:17] status: 200
{
  "resourceFile": [
    {
      "name": "ScalCustomerOrder_ConvertSVToPKNamespace.xsl",
      "type": "xsl"
    },
    {
      "name": "ScalCustomerOrder_ConvertPKToSVNamespace.xsl",
      "type": "xsl"
    },
    {
      "name": "PKScalCustomerOrderService_1.wsdl",
      "type": "wsdl"
    },
    {
      "name": "SVScalCustomerOrderService_1.wsdl",
      "type": "wsdl"
    }
  ]
}
```

## Get
```
$ node ./resourceTool.js -v -n -o $ORG -A get -e test -t xsl -N ScalCustomerOrder_ConvertPKToSVNamespace.xsl
Edge API resourcefile tool, version: 20190306-0851
Node.js v10.15.1

[2019-Mar-06 08:43:13] start
[2019-Mar-06 08:43:13] connect: {"orgname":"therealdinochiesa2-eval","loginBaseUrl":"https://login.apigee.com","user":"dchiesa@google.com","mgmtServer":"https://api.enterprise.apigee.com"}
[2019-Mar-06 08:43:13] found stashed token.
[2019-Mar-06 08:43:13] valid and not expired
[2019-Mar-06 08:43:13] GET https://api.enterprise.apigee.com/v1/o/therealdinochiesa2-eval/e/test/resourcefiles/xsl/ScalCustomerOrder_ConvertPKToSVNamespace.xsl
[2019-Mar-06 08:43:13] status: 200

<xsl:stylesheet version="1.0"  xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:pk="http://service.north.net/scalcustomerorder/PKScalCustomerOrderService/v1" >
        <!--Identity transform-->
        <xsl:template match="@* | node()">
                <xsl:copy>
                        <xsl:apply-templates select="@* | node()"/>
                </xsl:copy>
        </xsl:template>
        <!--replace namespace of elements from PK to SV-->
        <xsl:template match="pk:*">
                <xsl:element name="pk:{local-name()}" namespace="http://service.north.net/scalcustomerorder/SVScalCustomerOrderService/v1">
                        <xsl:apply-templates select="@* | node()"/>
                </xsl:element>
        </xsl:template>
</xsl:stylesheet>

```

## Create
```
$ node ./resourceTool.js -v -n -o $ORG -e test -A create -F ./resourcefiles/xsl/apigee-edgejs-test-lowerCaseElements.xsl
Edge API resourcefile tool, version: 20190306-0851
Node.js v10.15.1

[2019-Mar-06 08:48:35] start
[2019-Mar-06 08:48:35] connect: {"orgname":"therealdinochiesa2-eval","loginBaseUrl":"https://login.apigee.com","user":"dchiesa@google.com","mgmtServer":"https://api.enterprise.apigee.com"}
[2019-Mar-06 08:48:35] found stashed token.
[2019-Mar-06 08:48:35] valid and not expired
[2019-Mar-06 08:48:35] POST https://api.enterprise.apigee.com/v1/o/therealdinochiesa2-eval/e/test/resourcefiles?type=xsl&name=apigee-edgejs-test-lowerCaseElements.xsl
[2019-Mar-06 08:48:36] status: 201
[2019-Mar-06 08:48:36] Create result: {"name":"apigee-edgejs-test-lowerCaseElements.xsl","type":"xsl"}

{
  "name": "apigee-edgejs-test-lowerCaseElements.xsl",
  "type": "xsl"
}

```

## Update
```
$ node ./resourceTool.js -v -n -o $ORG -e test -A update -F ./resourcefiles/xsl/apigee-edgejs-test-lowerCaseElements.xsl
Edge API resourcefile tool, version: 20190306-0851
Node.js v10.15.1

[2019-Mar-06 08:48:53] start
[2019-Mar-06 08:48:53] connect: {"orgname":"therealdinochiesa2-eval","loginBaseUrl":"https://login.apigee.com","user":"dchiesa@google.com","mgmtServer":"https://api.enterprise.apigee.com"}
[2019-Mar-06 08:48:53] found stashed token.
[2019-Mar-06 08:48:53] valid and not expired
[2019-Mar-06 08:48:53] PUT https://api.enterprise.apigee.com/v1/o/therealdinochiesa2-eval/e/test/resourcefiles/xsl/apigee-edgejs-test-lowerCaseElements.xsl
[2019-Mar-06 08:48:55] status: 200
[2019-Mar-06 08:48:55] Update result: {"name":"apigee-edgejs-test-lowerCaseElements.xsl","type":"xsl"}

{
  "name": "apigee-edgejs-test-lowerCaseElements.xsl",
  "type": "xsl"
}
```

## Delete

```
$ node ./resourceTool.js -v -n -o $ORG -e test -A delete -N apigee-edgejs-test-lowerCaseElements.xsl -t xsl
Edge API resourcefile tool, version: 20190306-0851
Node.js v10.15.1

[2019-Mar-06 08:52:55] start
[2019-Mar-06 08:52:55] connect: {"orgname":"therealdinochiesa2-eval","loginBaseUrl":"https://login.apigee.com","user":"dchiesa@google.com","mgmtServer":"https://api.enterprise.apigee.com"}
[2019-Mar-06 08:52:55] found stashed token.
[2019-Mar-06 08:52:55] valid and not expired
[2019-Mar-06 08:52:55] DELETE https://api.enterprise.apigee.com/v1/o/therealdinochiesa2-eval/e/test/resourcefiles/xsl/apigee-edgejs-test-lowerCaseElements.xsl
[2019-Mar-06 08:52:56] status: 200
OK
{"name":"apigee-edgejs-test-lowerCaseElements.xsl","type":"xsl"}

```