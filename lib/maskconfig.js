// maskconfig.js
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
/* global Buffer */

const utility = require("./utility.js"),
  common = require("./common.js"),
  promiseWrap = require("./promiseWrap.js"),
  request = require("postman-request"),
  urljoin = require("url-join"),
  sprintf = require("sprintf-js").sprintf,
  prefixes = ["jSONPaths", "xPaths"],
  suffixes = ["Fault", "Request", "Response"],
  basePropNames = ["namespaces", "variables"],
  allValidKeys = [].concat.apply(
    [],
    basePropNames.concat(
      prefixes.map((prefix) => suffixes.map((x) => prefix + x))
    )
  );

function MaskConfig(conn) {
  this.conn = conn;
}

function resolveMaskconfigsPath(conn, options) {
  if (!options) {
    return urljoin(conn.urlBase, "maskconfigs");
  }
  let proxy = options.apiproxy || options.proxy;
  if (options.name) {
    return proxy
      ? urljoin(conn.urlBase, "apis", proxy, "maskconfigs", options.name)
      : urljoin(conn.urlBase, "maskconfigs", options.name);
  }
  return proxy
    ? urljoin(conn.urlBase, "apis", proxy, "maskconfigs")
    : urljoin(conn.urlBase, "maskconfigs");
}

MaskConfig.prototype.get = promiseWrap(function (options, cb) {
  const conn = this.conn;
  if (!cb) {
    cb = options;
    options = {};
  }
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = resolveMaskconfigsPath(conn, options);
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("GET %s", requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

function insureArray(item) {
  if (Array.isArray(item)) {
    return item;
  }
  return [item];
}

function validMaskConfigKey(key) {
  const ix = allValidKeys.indexOf(key);
  return ix >= 0;
}

function produceMaskConfigPayload(inboundOptions) {
  const hash = { name: "default" };
  Object.keys(inboundOptions).forEach((key) => {
    //key = key.toLowerCase();
    const item = insureArray(inboundOptions[key]);
    // possible to use 'json' as a key, to apply to request or response.
    // also similar with xpath.
    const prefix =
      key === "json" || key === "jsonpath"
        ? prefixes[0]
        : key === "xpath" || key === "xml"
        ? prefixes[1]
        : null;
    if (prefix) {
      suffixes.forEach((propSuffix) => {
        hash[prefix + propSuffix] = item;
      });
    } else if (validMaskConfigKey(key)) {
      hash[key] = item;
    }
    // else {
    //   console.log('** unknown key: %s', key);
    // }
  });
  return hash;
}

function chopLastSegment(url) {
  const lastSlash = url.lastIndexOf("/");
  if (lastSlash === -1) {
    return url;
  }
  return url.substring(0, lastSlash);
}

function makeGetOptions(options) {
  const getOptions = {
    headers: {
      accept: options.headers.accept,
      authorization: options.headers.authorization
    },
    url: options.url
  };
  return getOptions;
}

function putMaskConfig(conn, requestOptions, cb) {
  // possible results:
  // if maskconfig exists, then PUT /v1/o/ORG/maskconfigs/default
  // else, POST /v1/o/ORG/maskconfigs
  //

  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("GET %s", requestOptions.url));
  }
  request.get(makeGetOptions(requestOptions), function (error, response, body) {
    if (error) {
      utility.logWrite(error);
      return cb(error, body);
    }
    let verb = "none";
    if (response.statusCode == 404) {
      verb = "post";
      requestOptions.url = chopLastSegment(requestOptions.url);
    } else if (response.statusCode == 200) {
      verb = "put";
    } else {
      return cb(
        new Error("unexpected status code: " + response.statusCode),
        body
      );
    }

    if (conn.verbosity > 0) {
      utility.logWrite(
        sprintf("%s %s", verb.toUpperCase(), requestOptions.url)
      );
    }
    requestOptions.headers["content-type"] = "application/json";
    request[verb](requestOptions, common.callback(conn, [200], cb));
  });
}

MaskConfig.prototype.set = promiseWrap(function (options, cb) {
  var conn = this.conn;
  // JSON payload looks like this:
  //
  // {
  //   "namespaces": [
  //   {
  //     "prefix": "apigee",
  //     "value": "http://apigee.com"
  //   }],
  //   "jSONPathsFault": [
  //     "$.store.book[*].author"
  //   ],
  //   "jSONPathsRequest": [
  //     "$.store.book[*].author"
  //   ],
  //   "jSONPathsResponse": [
  //     "$.store.book[*].author"
  //   ],
  //   "name": "default",
  //   "variables": [
  //     "request.header.user-agent",
  //     "request.formparam.password"
  //   ],
  //   "xPathsFault": [
  //     "/apigee:Greeting/apigee:User"
  //   ],
  //   "xPathsRequest": [
  //     "/apigee:Greeting/apigee:User"
  //   ],
  //   "xPathsResponse": [
  //     "/apigee:Greeting/apigee:User"
  //   ]
  // }

  if (!cb) {
    cb = options;
    options = {};
  }
  //var name = options.name || 'default';
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = resolveMaskconfigsPath(conn, options);
    requestOptions.body = JSON.stringify(produceMaskConfigPayload(options));
    putMaskConfig(conn, requestOptions, cb);
  });
});

function addOrUpdate(conn, options, cb) {
  if (!cb) {
    throw new Error("missing callback");
  }
  if (!options.name) {
    options.name = "default";
  }
  //var proxy = options.apiproxy || options.proxy;
  common.insureFreshToken(conn, function (requestOptions) {
    // first read, then write
    requestOptions.url = resolveMaskconfigsPath(conn, options);
    if (conn.verbosity > 0) {
      utility.logWrite(sprintf("GET %s", requestOptions.url));
    }
    request.get(requestOptions, function (error, response, body) {
      if (error) {
        utility.logWrite(error);
        return cb(error, body);
      }
      if (response.statusCode == 200) {
        body = JSON.parse(body);
        requestOptions.body = JSON.stringify({
          ...body,
          ...produceMaskConfigPayload(options)
        });
      } else {
        requestOptions.body = JSON.stringify(produceMaskConfigPayload(options));
      }
      //requestOptions.url = resolveMaskconfigsPath(conn, options);
      if (conn.verbosity > 0) {
        utility.logWrite(sprintf("POST %s", requestOptions.url));
      }
      requestOptions.headers["content-type"] = "application/json";
      request.post(requestOptions, common.callback(conn, [200], cb));
    });
  });
}

MaskConfig.prototype.add = promiseWrap(function (options, cb) {
  var conn = this.conn;
  return addOrUpdate(conn, options, cb);
});

MaskConfig.prototype.update = promiseWrap(function (options, cb) {
  var conn = this.conn;
  return addOrUpdate(conn, options, cb);
});

MaskConfig.prototype.remove = promiseWrap(function (options, cb) {
  var conn = this.conn;
  if (!cb) {
    throw new Error("missing callback");
  }
  //var name = options.name || 'default';
  if (!options.name) {
    options.name = "default";
  }
  var proxy = options.apiproxy || options.proxy;
  common.insureFreshToken(conn, function (requestOptions) {
    // first read, then write
    requestOptions.url = resolveMaskconfigsPath(conn, options);
    request.get(requestOptions, function (error, response, body) {
      if (error) {
        utility.logWrite(error);
        return cb(error, body);
      }
      if (response.statusCode != 200) {
        return cb({ error: "failed to read maskconfig" }, body);
      }
      let newConfig = {};
      body = JSON.parse(body);
      Object.keys(body).forEach((key) => {
        if (options.remove.indexOf(key) == -1) {
          newConfig[key] = body[key];
        }
      });
      requestOptions.body = JSON.stringify(newConfig);
      delete options.name;
      requestOptions.url = resolveMaskconfigsPath(conn, options);
      putMaskConfig(conn, requestOptions, cb);
    });
  });
});

MaskConfig.prototype.del = promiseWrap(function (options, cb) {
  // DELETE :mgmtserver/v1/o/:orgname/maskconfigs/:name
  // DELETE :mgmtserver/v1/o/:orgname/apis/:proxy/maskconfigs/:name
  var conn = this.conn;
  if (!cb) {
    throw new Error("missing callback");
  }
  if (!options.name) {
    options.name = "default";
  }
  var proxy = options.apiproxy || options.proxy;
  common.insureFreshToken(conn, function (requestOptions) {
    requestOptions.url = resolveMaskconfigsPath(conn, options);
    request.del(requestOptions, common.callback(conn, [200, 204], cb));
  });
});

module.exports = MaskConfig;
