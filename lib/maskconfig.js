// maskconfig.js
// ------------------------------------------------------------------
// Copyright 2018 Google LLC.
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

(function (){
  'use strict';
  const utility = require('./utility.js'),
        common  = require('./common.js'),
        request = require('request'),
        urljoin = require('url-join'),
        merge   = require('merge'),
        sprintf = require('sprintf-js').sprintf,
        suffixes = ['Fault', 'Request', 'Response'],
        prefixes = ['jSONPaths', 'xPaths'],
        basePropNames = ['namespaces', 'variables'],
        allKeys = [].concat.apply([],
                                  basePropNames.concat(prefixes.map( prefix => suffixes.map( x => prefix + x))));

  function MaskConfig(conn) { this.conn = conn; }

  MaskConfig.prototype.get = function(options, cb) {
    var conn = this.conn;
    if ( ! cb) { cb = options; options = {}; }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (options.name) ?
        urljoin(conn.urlBase, 'maskconfigs', options.name) :
        urljoin(conn.urlBase, 'maskconfigs'); // will always return only: [ "default" ]
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  function insureArray(item) {
    if (Array.isArray(item)) {
      return item;
    }
    return [item];
  }

  function validMaskConfigKey(key) {
    return allKeys.indexOf(key) > -1;
  }

  function produceMaskConfigPayload(inboundOptions) {
    var hash = { name: 'default' };
    Object.keys(inboundOptions).forEach((key) => {
      key = key.toLowerCase();
      let item = insureArray(inboundOptions[key]);
      let prefix = (key === 'json' || key === 'jsonpath') ? prefixes[0] :
        (key === 'xpath' || key === 'xml') ? prefixes[1] : null;
      if (prefix) {
        suffixes.forEach( (propSuffix) => {
          hash[prefix + propSuffix] = item;
        });
      }
      else if (validMaskConfigKey(key)) {
        hash[key] = item;
      }
    });
    return hash;
  }

  function putMaskConfig(conn, requestOptions, cb) {
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('POST %s', requestOptions.url));
    }
    requestOptions.headers['content-type'] = 'application/json';
    request.post(requestOptions, common.callback(conn, [200], cb));
  }

  MaskConfig.prototype.set = function(options, cb) {
    var conn = this.conn;
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

    if ( ! cb) { cb = options; options = {}; }
    var name = options.name || 'default';
    var proxy = options.apiproxy || options.proxy;
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = (proxy) ?
        urljoin(conn.urlBase, 'apis', proxy, 'maskconfigs') :
        urljoin(conn.urlBase, 'maskconfigs');
      requestOptions.body = JSON.stringify(produceMaskConfigPayload(options));
      putMaskConfig(conn, requestOptions, cb);
    });
  };

  function addOrUpdate(conn, options, cb) {
    if ( ! cb) {
      throw new Error("missing callback");
    }
    var name = options.name || 'default';
    var proxy = options.apiproxy || options.proxy;
    common.mergeRequestOptions(conn, function(requestOptions) {
      // first read, then write
      requestOptions.url = urljoin(conn.urlBase, 'maskconfigs', name);
      requestOptions.url = (proxy) ?
        urljoin(conn.urlBase, 'apis', proxy, 'maskconfigs', name) :
        urljoin(conn.urlBase, 'maskconfigs', name);

        request.get(requestOptions, function(error, response, body) {
          if (error) {
            utility.logWrite(error);
            return cb(error, body);
          }
          if (response.statusCode == 200) {
            body = JSON.parse(body);
            requestOptions.body = JSON.stringify(merge(body, produceMaskConfigPayload(options)));
          }
          else {
            requestOptions.body = JSON.stringify(produceMaskConfigPayload(options));
          }
          requestOptions.url = (proxy) ?
            urljoin(conn.urlBase, 'apis', proxy, 'maskconfigs') :
            urljoin(conn.urlBase, 'maskconfigs');
          putMaskConfig(conn, requestOptions, cb);
        });
    });
  }

  MaskConfig.prototype.add = function(options, cb) {
    var conn = this.conn;
    return addOrUpdate(conn, options, cb);
  };

  MaskConfig.prototype.update = function(options, cb) {
    var conn = this.conn;
    return addOrUpdate(conn, options, cb);
  };

  MaskConfig.prototype.remove = function(options, cb) {
    var conn = this.conn;
    if ( ! cb) {
      throw new Error("missing callback");
    }
    var name = options.name || 'default';
    var proxy = options.apiproxy || options.proxy;
    common.mergeRequestOptions(conn, function(requestOptions) {
      // first read, then write
      requestOptions.url = (proxy) ?
        urljoin(conn.urlBase, 'apis', proxy, 'maskconfigs', name) :
        urljoin(conn.urlBase, 'maskconfigs', name);

      request.get(requestOptions, function(error, response, body) {
        if (error) {
          utility.logWrite(error);
          return cb(error, body);
        }
        if (response.statusCode != 200) {
          return cb({error: 'failed to read maskconfig'}, body);
        }
        let newConfig = {};
        body = JSON.parse(body);
        Object.keys(body).forEach ( key => {
          if (options.remove.indexOf(key) == -1) {
            newConfig[key] = body[key];
          }
        });
        requestOptions.body = JSON.stringify(newConfig);
        requestOptions.url = (proxy) ?
          urljoin(conn.urlBase, 'apis', proxy, 'maskconfigs') :
          urljoin(conn.urlBase, 'maskconfigs');
        putMaskConfig(conn, requestOptions, cb);
      });
    });
  };

  module.exports = MaskConfig;

}());
