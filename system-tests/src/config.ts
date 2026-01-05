/**
 * System test configuration
 *
 * These values are set by the test runner (run-tests.mjs) based on CLI arguments:
 * - --stage sets STAGE environment variable
 * - --region sets AWS_REGION environment variable (defaults to us-west-2)
 *
 * @example
 * import { STAGE, REGION } from './config.ts';
 *
 * console.log(`Testing stage: ${STAGE} in region: ${REGION}`);
 */

if (!process.env.STAGE) {
  throw new Error(
    'STAGE environment variable not set. Run with: pnpm system-tests --stage <stage>'
  );
}

/**
 * The deployment stage being tested (e.g., 'dev', 'test', 'preview')
 * Set via --stage CLI argument
 */
export const STAGE = process.env.STAGE;

/**
 * AWS region where services are deployed
 * Set via --region CLI argument (defaults to us-west-2)
 */
export const REGION =
  process.env.REGION || process.env.AWS_REGION || 'us-west-2';
