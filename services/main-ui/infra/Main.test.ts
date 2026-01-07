/**
 * Infrastructure tests for Main UI Stack
 *
 * Tests verify that the Main stack properly configures and exports
 * the necessary outputs for external reference.
 *
 * Note: Detailed NitroSite construct tests (CloudFront, S3, Lambda, IAM)
 * are located in packages/sst-constructs/src/NitroSite.test.ts
 */
import {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { Template } from 'aws-cdk-lib/assertions';
import { initProject } from 'sst/project.js';
import { App, getStack, StackContext } from 'sst/constructs';
import { Main } from './Main.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Mock account-specific helpers to avoid validation in tests
vi.mock('@lib/sst-helpers', () => ({
  dns: {
    mainDomain: vi.fn(() => 'test.example.com'),
    mainHostedZone: vi.fn(() => 'example.com'),
  },
  envConfig: {
    getParameterName: vi.fn(() => '/test/certificate/arn'),
  },
  serviceConfig: {
    getParameterValue: vi.fn(() => 'test-api-id'),
    getParameterName: vi.fn(() => '/service/test/param'),
    getParameterArn: vi.fn(
      () => 'arn:aws:ssm:us-east-1:123456789012:parameter/service/test/param'
    ),
  },
  ssm: {
    getCrossRegionParameterValue: vi.fn(
      () => 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id'
    ),
  },
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates a stub Nitro output directory structure for testing
 * This simulates a built Nitro app without requiring an actual build
 */
const createStubNitroOutput = (appPath: string) => {
  const outputDir = path.join(appPath, '.output');
  fs.mkdirSync(path.join(outputDir, 'public'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'server'), { recursive: true });

  // Create stub nitro.json with required preset configuration
  fs.writeFileSync(
    path.join(outputDir, 'nitro.json'),
    JSON.stringify({ preset: 'aws-lambda' })
  );

  // Create stub server handler (NitroSite expects this path to exist)
  fs.writeFileSync(
    path.join(outputDir, 'server', 'index.ts'),
    'export const handler = async () => ({ statusCode: 200 });'
  );
};

describe('Main UI Stack', () => {
  const tmpDir = path.join(__dirname, '../.tmp-test');
  let testAppPath: string;

  beforeAll(async () => {
    await initProject({});
    // Create base tmp directory
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up base tmp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Create unique temp directory for this test
    testAppPath = fs.mkdtempSync(path.join(tmpDir, 'app-'));

    // Create stub Nitro output structure
    createStubNitroOutput(testAppPath);
  });

  afterEach(() => {
    // Clean up test-specific directories after each test
    if (fs.existsSync(testAppPath)) {
      fs.rmSync(testAppPath, { recursive: true, force: true });
    }
  });

  it('should export MainSiteUrl as stack output', async () => {
    const app = new App({ mode: 'deploy' });
    const MockStack = (ctx: StackContext) =>
      Main(ctx, { appPath: testAppPath });
    app.stack(MockStack);

    await app.finish();

    const template = Template.fromStack(getStack(MockStack));

    // Verify stack output exists
    template.hasOutput('MainSiteUrl', {});
  });
});
