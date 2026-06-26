#!/usr/bin/env node
'use strict';

// Thin CLI wrapper so `npx meatsuit <file>` works. All logic lives in the detector module.
require('../detector/meatsuit.js').runCli(process.argv);
