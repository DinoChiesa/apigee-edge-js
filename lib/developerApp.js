// developerApp.js
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
/* global Buffer, process */

const common = require("./common.js"),
  utility = require("./utility.js"),
  promiseWrap = require("./promiseWrap.js"),
  request = require("postman-request"),
  path = require("path"),
  urljoin = require("url-join"),
  sprintf = require("sprintf-js").sprintf,
  DEFAULT_CREDENTIAL_EXPIRY = -1;

function DeveloperApp(conn) {
  this.conn = conn;
}

DeveloperApp.prototype.create = promiseWrap(function (options, cb) {
  // var THIRTY_DAYS_IN_MS = 1000 * 60 * 60 * 24 * 30;
  // POST :mgmtserver/v1/o/dchiesa2/developers/Elaine@example.org/apps
  // Content-type: application/json
  // Authorization: :apigee-auth
  //
  // {
  //   "attributes" : [ {
  //     "name" : "attrname",
  //     "value" : "attrvalue"
  //   } ],
  //   "apiProducts": [ "Manual-Approval-1" ],
  //   "keyExpiresIn" : "86400000",
  //   "name" : "ElaineApp2"
  // }
  const conn = this.conn,
    name = options.appName || options.name || options.app,
    product =
      options.apiProduct ||
      options.productName ||
      options.products ||
      options.apiProducts;
  let email = options.developer || options.developerEmail || options.email;
  if (!email) {
    return cb(new Error("missing required input: email"));
  }
  if (conn.isGoogle()) {
    email = email.toLowerCase();
  }
  if (!name) {
    return cb(new Error("missing required input: appName"));
  }
  if (!product) {
    return cb(new Error("missing required input: apiProduct"));
  }
  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("Create App %s for %s", name, email));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.headers["content-type"] = "application/json";
    requestOptions.url = urljoin(conn.urlBase, "developers", email, "apps");
    let keyExpiresIn = DEFAULT_CREDENTIAL_EXPIRY;
    if (options.expiry) {
      keyExpiresIn = common.resolveExpiry(options.expiry);
    } else {
      if (conn.verbosity > 0) {
        utility.logWrite(sprintf("Using default expiry of %d", keyExpiresIn));
      }
    }
    // inbound attributes can be one of 3 forms:
    // - array of string (each string a colon-separated pair)
    // - js hash of prop:value pairs
    // - array of hash, each containing key/value pair
    let attributes1 = common.maybeReformAttributes(options.attributes | {}),
      tool = "nodejs " + path.basename(process.argv[1]),
      appAttributes = common.hashToArrayOfKeyValuePairs({
        ...attributes1,
        tool
      }),
      apiProducts = Array.isArray(product) ? product : [product];

    requestOptions.body = JSON.stringify({
      attributes: appAttributes,
      apiProducts,
      keyExpiresIn,
      name,
      callbackUrl: options.callbackUrl
    });
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("POST %s", requestOptions.url));
    }
    //request.debug = true;
    request.post(requestOptions, common.callback(conn, [201], cb));
  });
});

DeveloperApp.prototype.del = promiseWrap(function (options, cb) {
  // DELETE :mgmtserver/v1/o/:orgname/developers/:developer/apps/:appname
  // Authorization: :apigee-auth
  let conn = this.conn,
    name = options.appName || options.name || options.app,
    email = options.developerEmail || options.email;
  if (email && conn.isGoogle()) {
    email = email.toLowerCase();
  }
  let discriminator = email || options.developerId || options.id;

  if (!discriminator) {
    return cb(new Error("missing developer email or id"));
  }
  if (!name) {
    return cb(new Error("missing developer app name"));
  }

  if (conn.verbosity > 0) {
    utility.logWrite(
      sprintf("Delete App %s for Developer %s", name, discriminator)
    );
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = urljoin(
      conn.urlBase,
      "developers",
      discriminator,
      "apps",
      name
    );
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("DELETE %s", requestOptions.url));
    }
    request.del(requestOptions, common.callback(conn, [200], cb));
  });
});

DeveloperApp.prototype.get = promiseWrap(function (options, cb) {
  if (!cb) {
    cb = options;
    options = {};
  }
  let conn = this.conn,
    name = options.appName || options.name || options.app,
    email = options.developerEmail || options.email;
  if (email && conn.isGoogle()) {
    email = email.toLowerCase();
  }
  let discriminator = email || options.developerId || options.id;

  if (!discriminator) {
    return cb(new Error("missing developer email or id"));
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = name
      ? urljoin(conn.urlBase, "developers", discriminator, "apps", name)
      : urljoin(conn.urlBase, "developers", discriminator, "apps");
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("GET %s", requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

function revokeOrApprove(conn, options, cb) {
  // POST -H content-type:application/octet-stream
  //  /v1/o/ORGNAME/developers/DEVELOPERID/apps/APPNAME?action=ACTION
  if (options.action != "revoke" && options.action != "approve") {
    return cb(new Error("missing or invalid action"));
  }
  let email = options.developerEmail || options.email;
  if (email && conn.isGoogle()) {
    email = email.toLowerCase();
  }
  let discriminator = email || options.developerId || options.id;

  if (!discriminator) {
    return cb(new Error("missing developer ID or email"));
  }

  if (!options.app && !options.appName) {
    return cb(new Error("missing app and appName"));
  }

  let urlTail = sprintf(
    "developers/%s/apps/%s",
    discriminator,
    options.app || options.appName
  );

  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("%s app %s", options.action, urlTail));
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

DeveloperApp.prototype.revoke = promiseWrap(function (options, cb) {
  let conn = this.conn;
  revokeOrApprove(conn, { ...options, action: "revoke" }, cb);
});

DeveloperApp.prototype.approve = promiseWrap(function (options, cb) {
  let conn = this.conn;
  revokeOrApprove(conn, { ...options, action: "approve" }, cb);
});

DeveloperApp.prototype.update = promiseWrap(function (options, cb) {
  if (!cb) {
    cb = options;
    options = {};
  }
  let conn = this.conn,
    name = options.appName || options.name || options.app,
    email = options.developerEmail || options.email;
  if (email && conn.isGoogle()) {
    email = email.toLowerCase();
  }
  let discriminator = email || options.developerId || options.id;

  if (!discriminator) {
    return cb(new Error("missing developer email or id"));
  }
  if (!name) {
    return cb(new Error("missing developer app name"));
  }
  if (!options.scopes && !options.attributes && !options.callbackUrl) {
    return cb(
      new Error(
        "nothing to update. specify one or more of {attributes, scopes, callbackUrl}"
      )
    );
  }

  //request.debug = true;
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = urljoin(
      conn.urlBase,
      "developers",
      discriminator,
      "apps",
      name
    );

    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("GET %s", requestOptions.url));
    }
    request.get(
      requestOptions,
      common.callback(conn, [200], function (e, app) {
        let attributes1 = common.maybeReformAttributes(
          options.attributes || {}
        );
        attributes1 = common.hashToArrayOfKeyValuePairs(attributes1);
        if (!options.replace) {
          attributes1 = attributes1.concat(app.attributes);
        }
        const valuesToUpdate = {
          scopes: options.scopes,
          attributes: attributes1,
          callbackUrl: options.callbackUrl
        };
        requestOptions.headers["content-type"] = "application/json";
        requestOptions.body = JSON.stringify({ ...app, ...valuesToUpdate });
        if (conn.verbosity > 0) {
          utility.logWrite(sprintf("PUT %s", requestOptions.url));
        }
        request.put(requestOptions, common.callback(conn, [200], cb));
      })
    );
  });
});

module.exports = DeveloperApp;
