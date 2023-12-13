// connection.js
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

const request = require("postman-request"),
  qs = require("qs"),
  crypto = require("crypto"),
  sprintf = require("sprintf-js").sprintf,
  utility = require("./utility.js"),
  common = require("./common.js"),
  tokenMgmt = require("./tokenMgmt.js"),
  promiseWrap = require("./promiseWrap.js"),
  gDefaultBasicAuthBlobForLogin = "ZWRnZWNsaTplZGdlY2xpc2VjcmV0";

function mask(orig) {
  const obj = {};
  Object.keys(orig).forEach((key) => {
    obj[key] =
      key === "access_token" || key === "refresh_token" ? "***" : orig[key];
  });
  return obj;
}

function shortString(s) {
  if (s.length > 32) s = s.substring(0, 32) + "...";
  return s.replace(new RegExp("\n", "g"), " ");
}

function invokeLegacyApigeeTokenEndpoint(conn, formparams, cb) {
  let requestOptions = {
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + (conn.basicAuthBlobForLogin || gDefaultBasicAuthBlobForLogin)
    },
    body: qs.stringify(formparams),
    url: conn.loginBaseUrl + "/oauth/token"
  };
  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("POST %s", requestOptions.url));
  }
  //request.debug = true;
  request.post(
    requestOptions,
    common.callback(conn, [200], function (e, result) {
      if (conn.verbosity > 0) {
        if (e) {
          utility.logWrite("POST error: " + e.message);
        } else if (typeof result == "string") {
          utility.logWrite("POST result (string): " + shortString(result));
        } else {
          utility.logWrite("POST result: " + JSON.stringify(mask(result)));
        }
      }
      if (e) {
        return cb(e, result);
      }
      if (result && typeof result == "object" && result.access_token) {
        result.issued_at = new Date().valueOf();
        if (formparams.username) {
          conn.user = formparams.username;
        }
        tokenMgmt.stashToken(
          conn.user,
          conn.loginBaseUrl,
          conn.mgmtServer,
          result
        );
        conn.requestHeaders.authorization = "Bearer " + result.access_token;
        delete conn.org.passcode;
        delete conn.org.password;
        return cb(null, result);
      }

      return cb(new Error("invalid token response"), result);
    })
  );
}

function toBase64Url(s) {
  return s.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64(theString) {
  return toBase64Url(Buffer.from(theString).toString("base64"));
}

function rs256Jwt(header, payload, key) {
  if (!header.alg) {
    throw new Error("missing alg");
  }
  if (header.alg == "RS256") {
    const signer = crypto.createSign("sha256"),
      signatureBase = [header, payload]
        .map((x) => b64(JSON.stringify(x)))
        .join(".");
    signer.update(signatureBase);
    return signatureBase + "." + toBase64Url(signer.sign(key, "base64"));
  }
  throw new Error("unhandled alg: " + header.alg);
}

function postGoogleapisTokenEndpoint(conn, config, cb) {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  // var examplePayload = {
  //   iss:"service-account-1@project-name-here.iam.gserviceaccount.com",
  //   scope:"https://www.googleapis.com/auth/logging.write",
  //   aud:"https://www.googleapis.com/oauth2/v4/token",
  //   exp:1328554385
  //     };
  const requiredScopes = "https://www.googleapis.com/auth/cloud-platform";
  const header = { alg: "RS256", typ: "JWT" },
    claims = {
      iss: config.client_email,
      aud: config.token_uri,
      iat: nowInSeconds,
      exp: nowInSeconds + 3 * 60,
      scope: requiredScopes
    },
    jwt1 = rs256Jwt(header, claims, config.private_key),
    requestOptions = {
      url: config.token_uri,
      method: "post",
      body: qs.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt1
      }),
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      }
    };

  if (conn.verbosity > 0) {
    utility.logWrite(sprintf("POST %s", requestOptions.url));
  }
  request.post(
    requestOptions,
    common.callback(conn, [200], function (e, result) {
      if (conn.verbosity > 0) {
        if (e) {
          utility.logWrite("POST error: " + e.message);
        } else if (typeof result == "string") {
          utility.logWrite("POST result (string): " + shortString(result));
        } else {
          utility.logWrite("POST result: " + JSON.stringify(mask(result)));
        }
      }
      if (e) {
        return cb(e, result);
      }
      if (result && typeof result == "object" && result.access_token) {
        // {
        //   "access_token": "ya29...akdjdkjd",
        //   "expires_in": 3600,
        //   "token_type": "Bearer"
        // }

        result.issued_at = new Date().valueOf();
        conn.user = config.client_email;
        tokenMgmt.stashToken(
          conn.user,
          conn.loginBaseUrl,
          conn.mgmtServer,
          result
        );
        conn.requestHeaders.authorization = "Bearer " + result.access_token;
        return cb(null, result);
      }
      return cb(new Error("invalid token response"), result);
    })
  );
}

function Connection() {}

Connection.prototype.getExistingToken = promiseWrap(function (cb) {
  const conn = this,
    existingToken = tokenMgmt.currentToken(
      conn.user,
      conn.loginBaseUrl,
      conn.mgmtServer
    );
  cb(null, existingToken);
});

Connection.prototype.refreshToken = promiseWrap(function (expiredToken, cb) {
  const conn = this;
  if (cb == null) {
    cb = expiredToken;
    expiredToken = null;
  }
  const existingToken =
      expiredToken ||
      tokenMgmt.currentToken(conn.user, conn.loginBaseUrl, conn.mgmtServer),
    formparams = {
      refresh_token: existingToken.refresh_token,
      grant_type: "refresh_token"
    };
  return invokeLegacyApigeeTokenEndpoint(conn, formparams, cb);
});

Connection.prototype.getNewToken = promiseWrap(function (arg1, cb) {
  const conn = this;
  if (conn.explicitlyProvidedToken) {
    return cb(null, { access_token: conn.explicitlyProvidedToken });
  }
  if (arg1.config) {
    return postGoogleapisTokenEndpoint(conn, arg1.config, cb);
  }

  let formparams = { grant_type: "password" };
  if (typeof arg1 == "string") {
    // assume it is a password
    formparams = { ...formparams, username: conn.user, password: arg1 };
  } else if (arg1.passcode) {
    // exchange passcode for token
    formparams = {
      ...formparams,
      response_type: "token",
      passcode: arg1.passcode
    };
  } else if (arg1.password) {
    // this is not well tested
    formparams = {
      ...formparams,
      username: conn.user || arg1.username,
      password: arg1.password
    };
    if (arg1.mfa_token) {
      formparams = { ...formparams, mfa_token: arg1.mfa_token };
    }
  }
  return invokeLegacyApigeeTokenEndpoint(conn, formparams, cb);
});

Connection.prototype.isGoogle = function () {
  return this.urlBase.startsWith("https://apigee.googleapis.com");
};

module.exports = Connection;
