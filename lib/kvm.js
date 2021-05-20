// kvm.js
// ------------------------------------------------------------------
// Copyright 2018-2021 Google LLC.
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


const utility     = require('./utility.js'),
      common      = require('./common.js'),
      promiseWrap = require('./promiseWrap.js'),
      request     = require('request'),
      urljoin     = require('url-join'),
      sprintf     = require('sprintf-js').sprintf;

function Kvm(conn) {this.conn = conn;}

function resolveKvmPath(conn, options) {
  if (options && (options.env || options.environment)) {
    return urljoin(conn.urlBase, 'environments', (options.env || options.environment), 'keyvaluemaps');
  }
  if (options && options.proxy) {
    return (options.revision) ?
      urljoin(conn.urlBase, 'apis', options.proxy, 'revisions', options.revision, 'keyvaluemaps') :
      urljoin(conn.urlBase, 'apis', options.proxy, 'keyvaluemaps');
  }
  return urljoin(conn.urlBase, 'keyvaluemaps');
}

function putKvm0(conn, options, cb) {
  common.insureFreshToken(conn, function(requestOptions) {
    let baseKvmPath = resolveKvmPath(conn, options);
    let name = options.name || options.kvmName || options.kvm;

    if (conn.orgProperties['features.isCpsEnabled']) {
      if (!options.key || !options.value) {
        throw new Error("missing key or value");
      }
      requestOptions.url = urljoin(baseKvmPath, name, 'entries', options.key);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, function(error, response, body) {
        if (error) {
          utility.logWrite(error);
          return cb(error, body);
        }
        requestOptions.url = urljoin(baseKvmPath, name, 'entries');

        if (response.statusCode == 200) {
          // Update is required if the key already exists.
          if (conn.verbosity>0) {
            utility.logWrite('KVM entry update');
          }
          requestOptions.url = urljoin(requestOptions.url, options.key);
        }
        else if (response.statusCode == 404) {
          if (conn.verbosity>0) {
            utility.logWrite('KVM entry create');
          }
        }

        if ((response.statusCode == 200) || (response.statusCode == 404)) {
          //
          // POST :mgmtserver/v1/o/:orgname/e/:env/keyvaluemaps/:mapname/entries/key1
          // Authorization: :apigee-auth
          // content-type: application/json
          //
          // {
          //    "name" : "key1",
          //    "value" : "value_one_updated"
          // }
          requestOptions.headers['content-type'] = 'application/json';
          requestOptions.body = JSON.stringify({ name: options.key, value : options.value });
          if (conn.verbosity>0) {
            utility.logWrite(sprintf('POST %s', requestOptions.url));
          }
          request.post(requestOptions, common.callback(conn, [200, 201], cb));
        }
        else {
          if (conn.verbosity>0) {
            utility.logWrite(body);
          }
          cb({error: 'bad status', statusCode: response.statusCode });
        }
      });
    }
    else {
      if (!options.entries && (!options.key || !options.value)) {
        throw new Error("missing entries or key/value");
      }
      // for non-CPS KVM, use a different model to add/update an entry.
      //
      // POST :mgmtserver/v1/o/:orgname/e/:env/keyvaluemaps/:mapname
      // Authorization: :apigee-auth
      // content-type: application/json
      //
      // {
      //    "entry": [ {"name" : "key1", "value" : "value_one_updated" } ],
      //    "name" : "mapname"
      // }
      requestOptions.url = urljoin(baseKvmPath, name);
      requestOptions.headers['content-type'] = 'application/json';
      var entry = options.entries ?
        common.hashToArrayOfKeyValuePairs(options.entries) :
        [{ name: options.key, value : options.value }] ;

      requestOptions.body = JSON.stringify({ name: name, entry: entry });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      request.post(requestOptions, common.callback(conn, [200, 201], cb));
    }
  });
}

Kvm.prototype.get = promiseWrap(function(options, cb) {
  var conn = this.conn;
  if ( ! cb) { cb = options; options = {}; }
  var name = options.name || options.kvmName || options.kvm;
  common.insureFreshToken(conn, function(requestOptions) {
    let baseKvmPath = resolveKvmPath(conn, options);
    requestOptions.url = (name) ? urljoin(baseKvmPath, name) : baseKvmPath;
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('GET %s', requestOptions.url));
    }
    request.get(requestOptions, common.callback(conn, [200], cb));
  });
});

Kvm.prototype.create = promiseWrap(function(options, cb) {
  // POST :mgmtserver/v1/o/:orgname/keyvaluemaps
  // POST :mgmtserver/v1/o/:orgname/e/:env/keyvaluemaps
  // POST :mgmtserver/v1/o/:orgname/apis/:proxy/keyvaluemaps
  // POST :mgmtserver/v1/o/:orgname/apis/:proxy/revisions/:rev/keyvaluemaps
  // Authorization: :apigee-auth
  // Content-type: application/json
  //
  // {
  //  "encrypted" : "false",
  //  "name" : ":mapname",
  //   "entry" : [   {
  //     "name" : "key1",
  //     "value" : "value_one"
  //     }, ...
  //   ]
  // }
  let conn = this.conn;
  if (conn.verbosity>0) {
    utility.logWrite(sprintf('Create KVM %s', options.name));
  }
  const name = options.name || options.kvmName || options.kvm;
  if ( ! name ) {
    return cb({error:"missing KVM name"});
  }

  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = resolveKvmPath(conn, options);
    requestOptions.headers['content-type'] = 'application/json';
    const body = {
      encrypted : options.encrypted ? "true" : "false",
      name
    };
    if (options.entries) {
      // This will not work with GAAMBO
      body.entry = common.hashToArrayOfKeyValuePairs(options.entries);
    }
    requestOptions.body = JSON.stringify(body);

    if (conn.verbosity>0) {
      utility.logWrite(sprintf('POST %s', requestOptions.url));
    }
    request.post(requestOptions, common.callback(conn, [201], cb));
  });
});

Kvm.prototype.put = promiseWrap(function(options, cb) {
  let conn = this.conn;
  if ( ! conn.orgProperties) {
    conn.org.getProperties(function(e, result) {
      if (e) { return cb(e, result); }
      putKvm0(conn, options, cb);
    });
  }
  else {
    return putKvm0(conn, options, cb);
  }
});

Kvm.prototype.del = promiseWrap(function(options, cb) {
  // DELETE :mgmtserver/v1/o/:orgname/keyvaluemaps/:kvmname
  // DELETE :mgmtserver/v1/o/:orgname/e/:env/keyvaluemaps/:kvmname
  // DELETE :mgmtserver/v1/o/:orgname/apis/:proxy/keyvaluemaps/:kvmname
  // DELETE :mgmtserver/v1/o/:orgname/apis/:proxy/revisions/:rev/keyvaluemaps/:kvmname
  let conn = this.conn,
      name = options.name || options.kvmName || options.kvm;
  if ( ! name ) {
    return cb({error:"missing KVM name"});
  }
  common.insureFreshToken(conn, function(requestOptions) {
    requestOptions.url = urljoin(resolveKvmPath(conn, options), name);
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('DELETE %s', requestOptions.url));
    }
    request.del(requestOptions, common.callback(conn, [200], cb));
  });
});

Kvm.prototype.removeEntry = promiseWrap(function(options, cb) {
  // This results in a GET, then a PUT with the given entry removed.
  // if the entry does not exist, then throw error.
  // DELETE :mgmtserver/v1/o/:org/e/:env/keyvaluemaps/:mapname/entries/:entryname
  let conn = this.conn,
      name = options.name || options.kvmName || options.kvm,
      key = options.entryName || options.key || options.entry;
  if ( ! name ) {
    return cb({error:"missing KVM name"});
  }
  if ( ! key ) {
    return cb({error:"missing KVM entryName"});
  }
  common.insureFreshToken(conn, function(requestOptions) {
    conn.org.getProperties(function(e, result) {
      if (e) { return cb(e, result); }
      if ( ! conn.orgProperties['features.isCpsEnabled']) {
        return cb(new Error('not possible with non-CPS org'));
      }
      let baseKvmPath = resolveKvmPath(conn, options);
      requestOptions.url = urljoin(baseKvmPath, name, 'entries', key);
      requestOptions.method = 'DELETE';
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request(requestOptions, common.callback(conn, [200], cb));
    });
  });
});

module.exports = Kvm;
