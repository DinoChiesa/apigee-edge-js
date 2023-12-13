// appcredential.js
// ------------------------------------------------------------------
// Copyright 2018-2023 Google LLC.
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
/* jshint esversion:9, node:true, strict:implied */
/* global process, console, Buffer */

const utility = require("./utility.js"),
  common = require("./common.js"),
  promiseWrap = require("./promiseWrap.js"),
  request = require("postman-request"),
  urljoin = require("url-join"),
  sprintf = require("sprintf-js").sprintf,
  DEFAULT_CREDENTIAL_EXPIRY = -1;

// uncomment to debug
//request.debug = true;

function AppCredential(conn) {
  this.conn = conn;
}

AppCredential.prototype.add = promiseWrap(function (options, cb) {
  // POST /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/create
  // {
  //   "consumerKey": "CDX-QAoqiu93ui20170301",
  //   "consumerSecret": "SomethingSomethingBeef"
  // }
  const conn = this.conn;
  const devDiscriminator =
    options.developer ||
    options.developerId ||
    options.developerEmail ||
    options.email;
  if (!devDiscriminator) {
    return cb(new Error("missing developer id or email"));
  }
  const product =
    options.apiProduct ||
    options.productName ||
    options.products ||
    options.apiProducts;
  if (!product) {
    return cb(new Error("missing required input: apiProduct"));
  }
  if (conn.verbosity > 0) {
    utility.logWrite(
      sprintf("Add Credential %s/apps/%s", devDiscriminator, options.appName)
    );
  }

  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.headers["content-type"] = "application/json";
    let attributes = options.attributes
      ? common.hashToArrayOfKeyValuePairs(options.attributes)
      : [];
    let apiProducts = Array.isArray(product) ? product : [product];

    if (options.consumerKey || options.clientId) {
      // attach the specified {key, secret} to the app as a new credential
      requestOptions.url = urljoin(
        conn.urlBase,
        sprintf(
          "developers/%s/apps/%s/keys/create",
          devDiscriminator,
          options.appName
        )
      );
      requestOptions.body = JSON.stringify({
        consumerKey: options.consumerKey || options.clientId,
        consumerSecret:
          options.consumerSecret ||
          options.clientSecret ||
          common.generateRandomString()
      });
      if (conn.verbosity > 0) {
        utility.logWrite(sprintf("POST %s", requestOptions.url));
      }

      request.post(requestOptions, function (e, _result) {
        // {
        //   "apiProducts": [],
        //   "attributes": [],
        //   "consumerKey": "17D7ECDF93314B9CBBDE8025308DC",
        //   "consumerSecret": "XYZzzz1098198198198",
        //   "issuedAt": 1538506759471,
        //   "scopes": [],
        //   "status": "approved"
        // }

        if (e) {
          return cb(e);
        }
        // now add the product to the credential
        requestOptions.url = urljoin(
          conn.urlBase,
          sprintf(
            "developers/%s/apps/%s/keys/%s",
            devDiscriminator,
            options.appName,
            options.consumerKey || options.clientId
          )
        );
        requestOptions.body = JSON.stringify({ apiProducts, attributes });
        if (conn.verbosity > 0) {
          utility.logWrite(sprintf("POST %s", requestOptions.url));
        }
        request.post(requestOptions, common.callback(conn, [200], cb));
      });
    } else {
      // ask Apigee to generate a new credential
      requestOptions.url = urljoin(
        conn.urlBase,
        sprintf("developers/%s/apps/%s", devDiscriminator, options.appName)
      );
      let keyExpiresIn = DEFAULT_CREDENTIAL_EXPIRY;
      if (options.expiry) {
        keyExpiresIn = common.resolveExpiry(options.expiry);
      }
      requestOptions.body = JSON.stringify({
        apiProducts,
        attributes: attributes,
        keyExpiresIn: keyExpiresIn
      });
      if (conn.verbosity > 0) {
        utility.logWrite(sprintf("POST %s", requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [200], cb));
    }
  });
});

AppCredential.prototype.del = promiseWrap(function (options, cb) {
  // DELETE /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/CONSUMERKEY
  const conn = this.conn;
  const devDiscriminator =
    options.developer ||
    options.developerId ||
    options.developerEmail ||
    options.email;
  if (!devDiscriminator) {
    return cb(new Error("missing developer id or email"));
  }
  const key = options.key || options.consumerKey;
  if (!options.appName || !key) {
    return cb(new Error("missing appName or key"));
  }
  const urlTail = sprintf(
    "developers/%s/apps/%s/keys/%s",
    devDiscriminator,
    options.appName,
    key
  );
  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("Delete credential %s", urlTail));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, urlTail);
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("DELETE %s", requestOptions.url));
    }
    request.del(requestOptions, common.callback(conn, [200], cb));
  });
});

AppCredential.prototype.get = promiseWrap(function (options, cb) {
  // GET /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/CONSUMERKEY
  // return list of api products and attrs for a credential
  var conn = this.conn;
  let devDiscriminator =
    options.developer ||
    options.developerId ||
    options.developerEmail ||
    options.email;
  if (!devDiscriminator) {
    return cb(new Error("missing developer id or email"));
  }
  let key = options.key || options.consumerKey;
  if (!options.appName || !key) {
    return cb(new Error("missing appName or key"));
  }
  var urlTail = sprintf(
    "developers/%s/apps/%s/keys/%s",
    devDiscriminator,
    options.appName,
    key
  );
  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("Get credential %s", urlTail));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, urlTail);
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("GET %s", requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

AppCredential.prototype.addProduct = promiseWrap(function (options, cb) {
  // PUT /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/CONSUMERKEY
  // append to the list of api products for a credential
  const conn = this.conn;
  const devDiscriminator =
    options.developer ||
    options.developerId ||
    options.developerEmail ||
    options.email;
  if (!devDiscriminator) {
    return cb(new Error("missing developer id or email"));
  }
  const key = options.key || options.consumerKey;
  if (!options.appName || !key) {
    return cb(new Error("missing appName or key"));
  }
  if (!options.product) {
    return cb(new Error("missing product"));
  }
  const urlTail = sprintf(
    "developers/%s/apps/%s/keys/%s",
    devDiscriminator,
    options.appName,
    key
  );
  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("Put credential %s", urlTail));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, urlTail);
    requestOptions.headers["content-type"] = "application/json";
    requestOptions.body = JSON.stringify({
      apiProducts: [options.product]
    });

    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("PUT %s", requestOptions.url));
    }
    request.put(requestOptions, common.callback(conn, [200], cb));
  });
});

AppCredential.prototype.removeProduct = promiseWrap(function (options, cb) {
  // DELETE /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/CONSUMERKEY/apiproducts/PRODUCT
  // remove one from the list of api products for a credential
  const conn = this.conn;
  const devDiscriminator =
    options.developer ||
    options.developerId ||
    options.developerEmail ||
    options.email;
  if (!devDiscriminator) {
    return cb(new Error("missing developer id or email"));
  }
  const key = options.key || options.consumerKey;
  if (!options.appName || !key) {
    return cb(new Error("missing appName or key"));
  }
  if (!options.product) {
    return cb(new Error("missing product"));
  }
  const urlTail = sprintf(
    "developers/%s/apps/%s/keys/%s/apiproducts/%s",
    devDiscriminator,
    options.appName,
    key,
    options.product
  );
  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("Remove product %s", urlTail));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = urljoin(conn.urlBase, urlTail);

    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("DELETE %s", requestOptions.url));
    }
    request.del(requestOptions, common.callback(conn, [200], cb));
  });
});

AppCredential.prototype.update = promiseWrap(function (options, cb) {
  // PUT /v1/o/ORGNAME/developers/EMAIL/apps/APPNAME/keys/CONSUMERKEY/apiproducts/PRODUCT
  // remove one from the list of api products for a credential
  const conn = this.conn;
  const devDiscriminator =
    options.developer ||
    options.developerId ||
    options.developerEmail ||
    options.email;
  if (!devDiscriminator) {
    return cb(new Error("missing developer id or email"));
  }
  const key = options.key || options.consumerKey;
  if (!options.appName || !key) {
    return cb(new Error("missing appName or key"));
  }
  if (!options.attributes) {
    return cb(new Error("missing attributes"));
  }
  const urlTail = sprintf(
    "developers/%s/apps/%s/keys/%s",
    devDiscriminator,
    options.appName,
    key
  );
  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("Update credential %s", urlTail));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    const attributes = Array.isArray(options.attributes)
      ? options.attributes
      : common.hashToArrayOfKeyValuePairs(options.attributes || {});
    requestOptions.url = urljoin(conn.urlBase, urlTail);
    requestOptions.headers["content-type"] = "application/json";
    requestOptions.body = JSON.stringify({ attributes });

    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("PUT %s", requestOptions.url));
    }
    request.put(requestOptions, common.callback(conn, [200], cb));
  });
});

AppCredential.prototype.find = promiseWrap(function (options, cb) {
  const conn = this.conn;
  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("find key %s", options.key));
  }
  const key = options.key || options.consumerKey;
  if (!key) {
    return cb(new Error("missing key"));
  }
  conn.org.apps.get({ expand: true }, function (e, result) {
    // will this fail for large number of apps?
    // need to page?
    if (e) {
      return cb(e);
    }
    let found = false;
    result.app.forEach(function (app) {
      if (!found && app.credentials)
        app.credentials.forEach(function (cred) {
          if (!found && cred.consumerKey == key) {
            found = { app: app, cred: cred };
          }
        });
    });

    if (found) {
      conn.org.developers.get(
        { id: found.app.developerId },
        function (e, developer) {
          if (e) {
            return cb(e);
          }
          return cb(null, {
            key,
            appName: found.app.name,
            appId: found.app.appId,
            developerId: found.app.developerId,
            developer: {
              firstName: developer.firstName,
              lastName: developer.lastName,
              userName: developer.userName,
              email: developer.email
            }
          });
        }
      );
    } else {
      cb(null);
    }
  });
});

function revokeOrApprove0(conn, options, cb) {
  // POST -H content-type:application/octet-stream
  //  /v1/o/ORGNAME/developers/DEVELOPERID/apps/APPNAME/keys/CONSUMERKEY?action=ACTION
  //
  // -or-
  //
  // POST -H content-type:application/octet-stream
  //  /v1/o/ORGNAME/developers/DEVELOPERID/apps/APPNAME/keys/CONSUMERKEY/apiproducts/PRODUCT?action=ACTION
  //
  // (no body)
  let item = "credential";
  const devDiscriminator =
    options.developer ||
    options.developerId ||
    options.developerEmail ||
    options.email;
  const urlTail = sprintf(
    "developers/%s/apps/%s/keys/%s",
    devDiscriminator,
    options.appName,
    options.key
  );
  if (options.product) {
    urlTail += sprintf("/apiproducts/%s", options.product);
    item = "product";
  }
  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("%s %s %s", options.action, item, urlTail));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = urljoin(
      conn.urlBase,
      sprintf("%s?action=%s", urlTail, options.action)
    );
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("POST %s", requestOptions.url));
    }
    request.post(requestOptions, common.callback(conn, [204], cb));
  });
}

function revokeOrApprove(conn, options, cb) {
  if (options.action != "revoke" && options.action != "approve") {
    return cb(new Error("missing or invalid action"));
  }
  if (!options.key) {
    return cb(new Error("missing key"));
  }
  const devDiscriminator =
    options.developer ||
    options.developerId ||
    options.developerEmail ||
    options.email;
  if (devDiscriminator && options.appName) {
    return revokeOrApprove0(conn, options, cb);
  }

  // first, need to find the key
  conn.org.appcredentials.find({ key: options.key }, function (e, found) {
    if (e) {
      return cb(e);
    }
    if (!found) {
      return cb(null, false);
    }
    const options2 = {
      developerId: found.developerId,
      key: found.key,
      appName: found.appName,
      action: options.action
    };
    revokeOrApprove0(conn, options2, (e, _result) => {
      return cb(e, true);
    });
  });
}

AppCredential.prototype.revoke = promiseWrap(function (options, cb) {
  const conn = this.conn;
  revokeOrApprove(conn, { ...options, action: "revoke" }, cb);
});

AppCredential.prototype.approve = promiseWrap(function (options, cb) {
  const conn = this.conn;
  revokeOrApprove(conn, { ...options, action: "approve" }, cb);
});

module.exports = AppCredential;
