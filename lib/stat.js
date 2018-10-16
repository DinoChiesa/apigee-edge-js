// stats.js
// ------------------------------------------------------------------
//
// created: Mon Oct 15 17:23:24 2018
// last saved: <2018-October-15 18:07:33>

/* jshint esversion: 6, node: true */
/* global process, console, Buffer */

'use strict';

(function (){
  const common  = require('./common.js'),
        urljoin = require('url-join'),
        merge   = require('merge'), 
        sprintf = require('sprintf-js').sprintf,
        shajs   = require('sha.js'),
        dateFormat = require('dateformat'),
        request = require('request'),
        utility = require('./utility.js');

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

  Stat.prototype.get = function(options, cb) {
    // GET "$mgmtserver/v1/o/$ORG/e/$ENV/stats/apis?select=sum(message_count)&timeRange=01/01/2018%2000:00~08/01/2018%2000:00&timeUnit=month"
    
    // var options = {
    //       environment : 'test',
    //       dimension: 'apis',
    //       metric: 'sum(message_count)',
    //       startTime: startTime,
    //       endTime : endTime,
    //       timeUnit : 'month',
    //       getCacheData : fn
    //     };
    
    var conn = this.conn;
    var name = options.environmentName || options.environment;
    if (!name) {
      throw new Error("missing environment name");
    }
    if (!options.dimension) {
      throw new Error("missing dimension");
    }
    if (!options.metric) {
      throw new Error("missing metric");
    }
    common.mergeRequestOptions(conn, function(requestOptions) {
      var query = sprintf('?select=%s&timeUnit=%s&timeRange=%s',
                          options.metric, 
                          options.timeUnit,
                          getTimeRange(options.startTime, options.endTime));

      requestOptions.url = 
        urljoin(conn.urlBase, 'e', name, 'stats', options.dimension) + query;

      if (conn.verbosity>0) {
        utility.logWrite(sprintf('GET %s', requestOptions.url));
      }

      var today = dateFormat(new Date(), "yyyymmdd");
      var sha = shajs('sha256')
        .update(JSON.stringify(requestOptions))
        .update(today) // redundant, if the date is in the filename
        .digest('hex');

      // it takes a long time to retrieve some stats data. So let's
      // allow the use of a cache via an upcall.
      if (typeof options.cacheCheck == 'function') {
        let cacheResponse = options.getCacheData(requestOptions.url, sha);
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
  };

  module.exports = Stat;

}());
