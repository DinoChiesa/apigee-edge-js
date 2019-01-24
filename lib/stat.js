// stats.js
// ------------------------------------------------------------------
//
// created: Mon Oct 15 17:23:24 2018
// last saved: <2019-January-24 15:28:50>

/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

'use strict';

(function (){
  const common      = require('./common.js'),
        utility     = require('./utility.js'),
        promiseWrap = require('./promiseWrap.js'),
        urljoin     = require('url-join'),
        merge       = require('merge'),
        sprintf     = require('sprintf-js').sprintf,
        request     = require('request'),
        dateFormat  = require('dateformat');

  function utcOffset_apigeeTimeFormat(date) {
    var s = dateFormat(date, "isoUtcDateTime");
    s = s.slice(0, -4);
    return s.slice(-5);
  }

  function getTimeRange(start, end) {
    start = dateFormat(start, 'mm/dd/yyyy') + ' ' + utcOffset_apigeeTimeFormat(start);
    end = dateFormat(end, 'mm/dd/yyyy') + ' ' + utcOffset_apigeeTimeFormat(end);
    return start + '~' + end;
  }

  function Stat(conn) {this.conn = conn;}

  Stat.prototype.get = promiseWrap(function(options, cb) {
    // GET "$mgmtserver/v1/o/$ORG/e/$ENV/stats/apis?select=sum(message_count)&timeRange=01/01/2018%2000:00~08/01/2018%2000:00&timeUnit=month"

    // var options = {
    //       environment : 'test',
    //       dimension: 'apis',
    //       metric: 'sum(message_count)',
    //       startTime: startTime,
    //       endTime : endTime,
    //       timeUnit : 'month',
    //       cacheCheck : fn
    //     };

    if ( ! cb) { cb = options; options = {}; }
    var conn = this.conn;
    var env = options.environmentName || options.environment;
    if (!env) {
      throw new Error("missing environment name");
    }
    if (!options.dimension) {
      throw new Error("missing dimension");
    }
    if (!options.metric) {
      throw new Error("missing metric");
    }
    common.insureFreshToken(conn, function(requestOptions) {
      var query = sprintf('?select=%s&timeUnit=%s&timeRange=%s',
                          options.metric,
                          options.timeUnit,
                          getTimeRange(options.startTime, options.endTime));

      requestOptions.url =
        urljoin(conn.urlBase, 'e', env, 'stats', options.dimension) + query;

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }

      // it takes a long time to retrieve some stats data. So let's
      // allow the use of a cache via an upcall.
      if (typeof options.cacheCheck == 'function') {
        let uniquifier = sprintf('%s-%s-%s-%s-%s-%s-%s',
                                 conn.orgname, env, options.dimension, options.metric,
                                 dateFormat(options.startTime, 'yyyymmdd'),
                                 dateFormat(options.endTime, 'yyyymmdd'), options.timeUnit);
        let cacheResponse = options.cacheCheck(requestOptions.url, uniquifier);
        if (cacheResponse) {
          if (cacheResponse.data) {
            return cb(null, {data: JSON.parse(cacheResponse.data) });
          }
          else if (cacheResponse.cachefile) {
            return request.get(requestOptions, common.callback(conn, [200], function(e, data){
              cb(e, {cachefile: cacheResponse.cachefile, data:data});
            }));
          }
        }
      }
      return request.get(requestOptions, common.callback(conn, [200], function(e, data){
              cb(e, {data:data});
            }));
    });
  });

  module.exports = Stat;

}());
