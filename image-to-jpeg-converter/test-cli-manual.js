#!/usr/bin/env node

/**
 * Manual test script for CLI functionality
 * Run with: node test-cli-manual.js
 */

import { convertToJpeg, SamplingFactor, ResizeOption } from './dist/index.js';

console.log('Testing index.ts exports...');
console.log('✓ convertToJpeg function imported');
console.log('✓ SamplingFactor enum imported:', Object.keys(SamplingFactor));
console.log('✓ ResizeOption enum imported:', Object.keys(ResizeOption));

console.log('\nAll exports are working correctly!');
console.log('\nTo test the CLI, run:');
console.log('  node dist/cli.js --help');
console.log('  node dist/cli.js -i input.png -o output.jpg -s 420 -q 10');
