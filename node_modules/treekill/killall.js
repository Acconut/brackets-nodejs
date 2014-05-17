/**!
 * treekill - killall.js
 *
 * Copyright(c) fengmk2 and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <fengmk2@gmail.com> (http://fengmk2.github.com)
 */

'use strict';

/**
 * Module dependencies.
 */

var treekill = require('./');

var pid = parseInt(process.argv[2]);

if (!pid) {
  console.log('Usage: killall $pid');
  process.exit(-1);
}

treekill(pid);
