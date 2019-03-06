// testRc4.js
// ------------------------------------------------------------------
//
// created: Tue Feb 19 11:38:39 2019
// last saved: <2019-February-19 14:08:22>

/* jshint esversion: 8, node: true */
/* global process, console, Buffer */

'use strict';

let hex = {
      Decode : function(s){
        var hexes = s.match(/.{2}/g) || [];
        var back = [];
        for(var j = 0; j<hexes.length; j++) {
          back.push(parseInt(hexes[j], 16));
        }
        return back;
      },
      Encode : function(a){
        var hex, i;
        var result = '';
        for (i=0; i<a.length; i++) {
          hex = a[i].toString(16);
          result += ("0"+hex).slice(-2);
        }
        return result.toUpperCase();
      }
    };

var RC4 = (function (){
      // rc4 is reflexive - encryption is the same operation as decryption.
      // this function does either.
      // params:
      //   key : array of bytes representing the key
      //   str : array of bytes to be encrypted or decrypted.
      //
      // returns:
      //   array of bytes
      //
      // To use a string as a key, first convert it to char array.
      // To encrypt a string, convert it to char array, before passing it here.
      // To decrypt a byte array that represents an encrypted string, convert the result to a string.

      function rc4 (key, str) {
        var s = [], j = 0, x, res = [];
        // Set up KSA
        for (var i = 0; i < 256; i++) {
          s[i] = i;
        }
        for (i = 0; i < 256; i++) {
          j = (j + s[i] + key[i % key.length]) % 256;
          x = s[i];
          s[i] = s[j];
          s[j] = x;
        }
        // PSRNG Algorithm
        i = 0;
        j = 0;
        for (var y = 0; y < str.length; y++) {
          i = (i + 1) % 256;
          j = (j + s[i]) % 256;
          x = s[i];
          s[i] = s[j];
          s[j] = x;
          let keybyte = s[(s[i] + s[j]) % 256];
          let r = str[y] ^ keybyte;
          res.push(r);
        }
        return res;
      }

      return {
        encrypt: rc4,
        decrypt: rc4,
        rc4 : rc4,
        stringToCharArray: function(s) {
          if (typeof s !== 'string') {return s;}
          return s.split('').map( c => ('' + c).charCodeAt(0));
        },
        stringFromCharArray : function (a) {
          return a.reduce( (acc, c) => acc + String.fromCharCode(c), '');
        }
      };
    }());


let rc4Testcases = [
      // ------------------------------------------------
      // This data is from the wikipedia article on RC4
      {
        key: 'Key',
        plainstring : 'Plaintext',
        ciphertext : 'BBF316E8D940AF0AD3'
      },
      {
        key : 'Wiki',
        plainstring : 'pedia',
        ciphertext : '1021BF0420'
      },
      {
        key : 'Secret',
        plainstring : 'Attack at dawn',
        ciphertext : '45A01F645FC35B383552544B9BF5'
      },
      // ------------------------------------------------
      // This is just a made up test
      {
        key : hex.Decode('0102030405060708090a'),
        plainstring : 'The quick brown fox jumped over the lazy dog.',
        ciphertext : 'B98BD5663290EFAFFB5DA06A3E07F722653E1387E534569B475E85BBA4BA1531C190E979B36E26E904C47FD6BD'
      },
      // ------------------------------------------------
      // This data is from RFC6229
      {
        key : hex.Decode('0102030405060708090a'),
        plainstring : hex.Decode('00000000000000000000000000000000'),
        ciphertext : hex.Decode('EDE3B04643E586CC907DC21851709902')
      }
      // ------------------------------------------------
   ];

function keyAsString(key) {
  if (typeof key === 'string') {
    return '\'' + key + '\' ' + JSON.stringify(RC4.stringToCharArray(key));
  }
  return JSON.stringify(key);
}

rc4Testcases.forEach( testcase => {
  let keybytes = (typeof testcase.key === 'string') ? RC4.stringToCharArray(testcase.key) : testcase.key;
  let cipherstring = (typeof testcase.ciphertext === 'string') ? testcase.ciphertext : hex.Encode(testcase.ciphertext);
  let plainbytesIn = (typeof testcase.plainstring === 'string')? RC4.stringToCharArray(testcase.plainstring) : testcase.plainstring;
  console.log('\n\'%s\'(key=%s) => %s', testcase.plainstring, keyAsString(testcase.key), cipherstring);
  let cipherbytesOut = RC4.rc4(keybytes, plainbytesIn);
  let ciphertext = hex.Encode(cipherbytesOut);
  //console.log('cipher: ' + ciphertext);
  let status1 = (ciphertext === cipherstring)?'PASS': 'FAIL';
  console.log('encrypt %s', status1);
  let cipherbytesIn = (typeof testcase.ciphertext === 'string') ? hex.Decode(testcase.ciphertext) : testcase.ciphertext;
  let plainbytesOut = RC4.rc4(keybytes, cipherbytesIn);
  let decryptPass = (typeof testcase.plainstring === 'string')?
    (RC4.stringFromCharArray(plainbytesOut) === testcase.plainstring) :
    hex.Encode(plainbytesOut) === hex.Encode(testcase.plainstring);
  let status2 = (decryptPass)?'PASS': 'FAIL';
  console.log('decrypt %s', status2);
});
