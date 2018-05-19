// developer.js
// ------------------------------------------------------------------

(function (){
  'use strict';
  const utility = require('./utility.js'),
        common  = require('./common.js'),
        request = require('request'),
        urljoin = require('url-join'),
        merge   = require('merge'),
        path   = require('path'),
        sprintf = require('sprintf-js').sprintf;

  function Developer(conn) { this.conn = conn; }

  Developer.prototype.create = function(options, cb) {
    // POST :mgmtserver/v1/o/:orgname/developers
    // Authorization: :edge-auth
    // Content-type: application/json
    //
    // {
    //   "attributes": [ {
    //     "name" : "tag1",
    //     "value" : "whatever you like" }],
    //   "status": "active",
    //   "userName": "test-3a-HiDxfHvHrB",
    //   "lastName": "Martino",
    //   "firstName": "Dino",
    //   "email": "tet-3a-HiDxfHvHrB@apigee.com"
    // }
    var conn = this.conn;
    var email = options.developerEmail || options.email;
    if ( !email || !options.firstName || !options.lastName || !options.userName) {
      return cb({error: "missing required inputs, one of {email, firstName, lastName, userName}"});
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Create Developer %s', email));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.headers['content-type'] = 'application/json';
      requestOptions.url = urljoin(conn.urlBase, 'developers');
      var devAttributes = common.hashToArrayOfKeyValuePairs(merge(options.attributes, {
            "tool": "nodejs " + path.basename(process.argv[1])
          }));
      requestOptions.body = JSON.stringify({
        attributes : devAttributes,
        userName : options.userName,
        firstName : options.firstName,
        lastName : options.lastName,
        email: email
      });
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('POST %s', requestOptions.url));
      }
      //request.debug = true;
      request.post(requestOptions, common.callback(conn, [201], cb));
    });
  };

  Developer.prototype.del = function(options, cb) {
    // DELETE :mgmtserver/v1/o/:orgname/developers/:developer
    // Authorization: :edge-auth
    var conn = this.conn;
    if ( !options.developerEmail) {
      return cb({error: "missing developerEmail"});
    }
    if (conn.verbosity>0) {
      utility.logWrite(sprintf('Delete Developer %s', options.developerEmail));
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      requestOptions.url = urljoin(conn.urlBase, 'developers', options.developerEmail);
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('DELETE %s', requestOptions.url));
      }
      request.del(requestOptions, common.callback(conn, [200], cb));
    });
  };

  Developer.prototype.get = function(options, cb) {
    var conn = this.conn;
    if ( ! cb) { cb = options; options = {}; }
    common.mergeRequestOptions(conn, function(requestOptions) {
      if (options.developerEmail || options.email) {
        requestOptions.url = urljoin(conn.urlBase, 'developers', options.developerEmail || options.email);
      }
      else if (options.developerId || options.id) {
        requestOptions.url = urljoin(conn.urlBase, 'developers', options.developerId || options.id);
      }
      else {
        requestOptions.url = urljoin(conn.urlBase, 'developers');
      }
      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }
      request.get(requestOptions, common.callback(conn, [200], cb));
    });
  };

  module.exports = Developer;

}());
