#! /usr/local/bin/node
/*jslint node:true */
// getOrgProperties.js
// ------------------------------------------------------------------
//
// Copyright 2019 Google LLC.
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
// last saved: <2019-July-09 10:52:57>

const edgejs     = require('apigee-edge-js'),
      common     = edgejs.utility,
      apigeeEdge = edgejs.edge,
      Getopt     = require('node-getopt'),
      version    = '20190708-1404',
      getopt     = new Getopt(common.commonOptions).bindHelp();

console.log(
  'Edge Get Org Properties, version: ' + version + '\n' +
    'Node.js ' + process.version + '\n');

var opt = getopt.parse(process.argv.slice(2));

common.verifyCommonRequiredParameters(opt.options, getopt);

apigeeEdge.connect(common.optToOptions(opt))
  .then( org => {
    org.getProperties()
      .then (props => {
        console.log(JSON.stringify(props, null, 2) + '\n') ;
      })
      .catch( e =>{
        console.error(e);
        process.exit(1);
      });
  })
  .catch( e => console.error(e) );
