// insertResponseHeader.js
// ------------------------------------------------------------------
//
// This is just a simple JSC to inject a header.
//
// created: Mon Feb  2 11:48:21 2015
// last saved: <2015-April-14 13:04:56>

context.setVariable('response.header.DinoWasHere', "This is the OLD value");
context.setVariable('response.header.region-name', context.getVariable('system.region.name'));
