#!/usr/bin/env node

/**
 * System tests runner with stage and region support
 *
 * Usage:
 *   pnpm system-tests --stage dev
 *   pnpm system-tests --stage test --region us-west-2
 *   pnpm system-tests --stage test --reporter=verbose
 *   pnpm system-tests:watch --stage dev
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
let stage = process.env.STAGE;
let region = process.env.AWS_REGION;
let vitestArgs = [];
let isWatch = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--stage' && args[i + 1]) {
    // Intercept --stage parameter
    stage = args[i + 1];
    i++; // Skip next argument
  } else if (args[i] === '--region' && args[i + 1]) {
    // Intercept --region parameter
    region = args[i + 1];
    i++; // Skip next argument
  } else if (args[i] === '--watch') {
    // Track watch mode
    isWatch = true;
    // Pass through to vitest
    vitestArgs.push(args[i]);
  } else {
    // Pass through all other arguments to vitest
    vitestArgs.push(args[i]);
  }
}

// Set STAGE environment variable
if (stage) {
  process.env.STAGE = stage;
  console.log(`Running system tests against stage: ${stage}`);
} else {
  console.warn(
    'Warning: No stage specified. Use --stage <name> to specify target stage.'
  );
}

// Set AWS_REGION environment variable
if (region) {
  process.env.AWS_REGION = region;
  console.log(`Using AWS region: ${region}`);
} else if (!process.env.AWS_REGION) {
  // Default to us-west-2 if not specified
  process.env.AWS_REGION = 'us-west-2';
  console.log(`Using default AWS region: us-west-2`);
}

// Determine vitest command based on watch mode
const vitestCommand = isWatch ? 'vitest' : 'vitest run';
const finalArgs = vitestCommand.split(' ').concat(vitestArgs);

// Run vitest
const vitest = spawn('pnpm', ['exec', ...finalArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname,
  env: process.env,
});

vitest.on('exit', (code) => {
  process.exit(code || 0);
});
