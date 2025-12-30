# Infrastructure as Code (IAC) Testing Guide

## Overview

This guide provides patterns and best practices for writing **infrastructure tests** for AWS infrastructure code using SST (v2.49.6+) and AWS CDK.

**What are infrastructure tests?** Tests that verify your AWS resources are configured correctly to support your application features. They test the CloudFormation template, not application behavior.

**Scope:** This guide focuses exclusively on infrastructure/stack tests. For testing application logic (unit tests), API endpoints (integration tests), or user workflows (E2E tests), use different testing approaches.

## What to Test

### Testing Priorities

Focus on critical infrastructure properties that support your application features:

| Priority                       | Category                      | Examples                                                            |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------- |
| **1. Resource Existence**      | Required resources exist      | Lambda, SQS, DynamoDB, API Gateway                                  |
| **2. Resource Wiring**         | Resources connected correctly | Lambda → SQS, API Gateway → Lambda, Event source mappings           |
| **3. Security & IAM**          | Security settings in place    | Encryption, IAM permissions, public access blocking                 |
| **4. Environment Config**      | Configuration correct         | Environment variables, resource references, stage-specific settings |
| **5. Infrastructure Policies** | Organizational standards      | Retention policies, backups, tagging                                |

### What Infrastructure Tests Verify

- ✅ Required resources exist (Lambda, SQS, DynamoDB, API Gateway, etc.)
- ✅ Resources are configured correctly (runtime, memory, timeout, etc.)
- ✅ Resources are wired together (Lambda → SQS, API Gateway → Lambda)
- ✅ Security settings are in place (encryption, IAM permissions, public access blocking)
- ✅ Cross-resource references are correct (Lambda env vars reference DynamoDB table name)

### What Infrastructure Tests Do NOT Verify

- ❌ API endpoint behavior (use integration tests)
- ❌ Business logic correctness (use unit tests)
- ❌ End-to-end user workflows (use E2E tests)
- ❌ CDK implementation details or every CDK-generated property

**Example:** For a feature that sends signup emails, infrastructure tests verify the SQS queue exists, Lambda is connected to it, Lambda has SES permissions, and environment variables are configured—not whether emails actually arrive in inboxes.

## Testing Philosophy

### Core Philosophy: Quality Over Quantity

**Write fewer, better tests that are easier to maintain.** Each test synthesizes the entire CloudFormation stack (~1-2s each), making performance critical. Group related assertions together to minimize stack syntheses.

- **Target:** 3-6 well-organized tests per stack instead of 10+ micro-tests
- **Performance impact:** Grouping assertions can reduce test time by 50-70%

### Key Principles

1. **Group related assertions** - Test multiple properties of the same resource in one test. Target: 3-6 grouped tests per stack.

2. **Test CloudFormation output, not implementation** - Validate deployed resources; tests should survive refactoring if deployed resources remain the same.

3. **Focus on critical properties** - Security (encryption, IAM, public access), resource wiring, required configuration, cross-resource references.

4. **Write resilient tests** - Use flexible matchers (`Match.objectLike()`), mock account-specific helpers, ensure tests run independently.

## Project Structure

```
services/my-service/
├── infra/
│   ├── SomeConstruct.ts
│   ├── SomeConstruct.test.ts   # Co-located with construct
│   ├── Main.ts
│   └── Main.test.ts
├── vitest.config.ts
└── tsconfig.json
```

## Quick Start: SST Test Pattern

### Basic Test Structure

```typescript
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RemovalPolicy } from 'aws-cdk-lib';
import { initProject } from 'sst/project.js';
import { App, getStack, StackContext } from 'sst/constructs';
import { MyConstruct } from './MyConstruct.ts';

// Mock account-specific helpers to avoid validation in tests
vi.mock('@lib/sst-helpers', () => ({
  removalPolicy: {
    retainForPermanentStage: vi.fn(() => RemovalPolicy.DESTROY),
  },
}));

describe('MyConstruct', () => {
  // Initialize SST project once before all tests
  beforeAll(async () => {
    await initProject({});
  });

  it('should create resource with default configuration', async () => {
    // Create SST app in deploy mode
    const app = new App({ mode: 'deploy' });

    // Define stack function (MUST be named function for getStack to work)
    const Stack = function (ctx: StackContext) {
      new MyConstruct(ctx.stack, 'test-construct');
    };

    // Register stack and synthesize
    app.stack(Stack);
    await app.finish();

    // Get CloudFormation template
    const template = Template.fromStack(getStack(Stack));

    // Assert on template
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    });
  });
});
```

### Critical Requirements

| Requirement            | Correct                                   | Wrong                                    |
| ---------------------- | ----------------------------------------- | ---------------------------------------- |
| **Stack function**     | `const Stack = function (ctx) {}`         | `const Stack = (ctx) => {}`              |
| **SST initialization** | `beforeAll(() => initProject({}))`        | Missing `initProject`                    |
| **App mode**           | `new App({ mode: 'deploy' })`             | `new App()`                              |
| **Synthesis**          | `await app.finish()` before assertions    | Missing `app.finish()`                   |
| **Mocking**            | Mock `@lib/sst-helpers`                   | Direct import causing account validation |
| **Parallelism**        | `fileParallelism: false` in vitest.config | Parallel execution (SST state conflicts) |

### Per-Test initProject() (When Needed)

Use per-test `initProject()` when tests need different SST configuration:

```typescript
describe('MyConstruct with different configs', () => {
  it('should work with production stage', async () => {
    await initProject({ stage: 'production' });
    // ... test code
  });

  it('should work with development stage', async () => {
    await initProject({ stage: 'development' });
    // ... test code
  });
});
```

## Common Pitfalls

### 1. Using Arrow Functions for Stack

```typescript
// ❌ WRONG - getStack won't work
const Stack = (ctx: StackContext) => {
  new MyConstruct(ctx.stack, 'test');
};

// ✅ CORRECT
const Stack = function (ctx: StackContext) {
  new MyConstruct(ctx.stack, 'test');
};
```

### 2. Not Calling initProject

```typescript
// ❌ WRONG - SST not initialized
describe('MyConstruct', () => {
  it('should work', async () => {
    const app = new App({ mode: 'deploy' });
    // Error: SST not initialized
  });
});

// ✅ CORRECT
describe('MyConstruct', () => {
  beforeAll(async () => {
    await initProject({});
  });

  it('should work', async () => {
    const app = new App({ mode: 'deploy' });
    // Works correctly
  });
});
```

### 3. Not Calling app.finish()

```typescript
// ❌ WRONG - Template not synthesized
const app = new App({ mode: 'deploy' });
app.stack(Stack);
const template = Template.fromStack(getStack(Stack));
// Error: Stack not synthesized

// ✅ CORRECT
const app = new App({ mode: 'deploy' });
app.stack(Stack);
await app.finish(); // Synthesize first
const template = Template.fromStack(getStack(Stack));
```

### 4. Using Exact Property Matching

```typescript
// ❌ BRITTLE - Breaks on CDK updates
template.hasResourceProperties('AWS::S3::Bucket', {
  BucketName: 'my-bucket',
  BucketEncryption: {
    /* ... */
  },
  // If CDK adds any property, this fails
});

// ✅ FLEXIBLE
template.hasResourceProperties(
  'AWS::S3::Bucket',
  Match.objectLike({
    BucketName: 'my-bucket',
    // Only checks properties you specify
  })
);
```

### 5. Not Mocking Account-Specific Helpers

```typescript
// ❌ WRONG - Test fails on account validation
import { removalPolicy } from '@lib/sst-helpers';

const policy = removalPolicy.retainForPermanentStage();
// Error: Account my-account not found

// ✅ CORRECT - Mock the helper
vi.mock('@lib/sst-helpers', () => ({
  removalPolicy: {
    retainForPermanentStage: vi.fn(() => RemovalPolicy.DESTROY),
  },
}));
```

### 6. Parallel Test Execution

```typescript
// ❌ WRONG - SST doesn't support parallel tests
// vitest.config.ts
export default defineConfig({
  test: {
    fileParallelism: true, // SST state conflicts
  },
});

// ✅ CORRECT
export default defineConfig({
  test: {
    fileParallelism: false, // Sequential execution
  },
});
```

## AWS CDK Assertions

### Import Assertions

```typescript
import { Template, Match, Capture } from 'aws-cdk-lib/assertions';
```

### Resource Counting

```typescript
// Exact count
template.resourceCountIs('AWS::Lambda::Function', 1);

// At least one
template.resourceCountIs('AWS::S3::Bucket', Match.anyValue());
```

### Property Assertions

**Always use `Match.objectLike()`** to avoid test brittleness when CDK updates add new properties.

```typescript
// ✅ Flexible matching (recommended)
template.hasResourceProperties(
  'AWS::S3::Bucket',
  Match.objectLike({
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256',
          },
        },
      ],
    },
  })
);
```

### Match Utilities

```typescript
// Object with specific properties (ignores others)
Match.objectLike({ Property: 'value' });

// Array containing specific items (ignores others)
Match.arrayWith([Match.objectLike({ Key: 'Environment', Value: 'test' })]);

// String pattern matching
Match.stringLikeRegexp('arn:aws:s3:::my-bucket-.*');

// Any value (for counting or existence checks)
Match.anyValue();

// Absent property
Match.absent();
```

### Capturing Values

```typescript
import { Capture } from 'aws-cdk-lib/assertions';

const roleCapture = new Capture();
template.hasResourceProperties('AWS::Lambda::Function', {
  Role: roleCapture,
});

// Use captured value - extract logical ID from Fn::GetAtt
const roleLogicalId = roleCapture.asObject()['Fn::GetAtt'][0];
```

**Capture `as*()` methods:**

- `asString()` - for string values
- `asNumber()` - for numeric values
- `asObject()` - for JSON objects (like `Fn::GetAtt`, `Ref`)
- `asArray()` - for arrays

### Testing Resource References

CloudFormation uses `{ "Ref": "LogicalResourceId" }` for references:

```typescript
// Get all Lambda functions
const functions = template.findResources('AWS::Lambda::Function');
const functionLogicalId = Object.keys(functions)[0];

// Verify API Gateway references the function
template.hasResourceProperties(
  'AWS::ApiGateway::Method',
  Match.objectLike({
    Integration: Match.objectLike({
      Uri: Match.objectLike({
        'Fn::Join': Match.arrayWith([
          Match.arrayWith([
            Match.objectLike({
              'Fn::GetAtt': [functionLogicalId, 'Arn'],
            }),
          ]),
        ]),
      }),
    }),
  })
);
```

## Common Test Scenarios

### 1. Grouped Testing Pattern (Recommended)

**Target: 3-6 well-organized tests per stack instead of 10+ micro-tests.**

```typescript
describe('Main UI Stack', () => {
  beforeAll(async () => {
    await initProject({});
  });

  // Test 1: Groups CloudFront + S3 + security (related infrastructure)
  it('should create CloudFront distribution with S3 bucket and security', async () => {
    const app = new App({ mode: 'deploy' });
    app.stack(Main);
    await app.finish();
    const template = Template.fromStack(getStack(Main));

    // CloudFront distribution
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          Enabled: true,
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: Match.stringLikeRegexp(
              'redirect-to-https|https-only'
            ),
            Compress: true,
          }),
        }),
      })
    );

    // S3 bucket with security
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties(
      'AWS::S3::Bucket',
      Match.objectLike({
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      })
    );
  });

  // Test 2: Groups Lambda + API Gateway (related integration)
  it('should create Lambda function with API Gateway for SSR', async () => {
    // ... similar pattern
  });

  // Test 3: Groups ALL IAM permissions together
  it('should configure IAM permissions for S3 and CloudFront', async () => {
    // ... similar pattern
  });

  // Test 4: Stack outputs
  it('should export MainSiteUrl as stack output', async () => {
    // ... similar pattern
  });
});
```

**Performance comparison:**

| Approach                     | Tests         | Duration        | Stack Syntheses |
| ---------------------------- | ------------- | --------------- | --------------- |
| ❌ Micro-tests (8 separate)  | 8             | ~14-18s         | 8               |
| ✅ Grouped tests (optimized) | 4             | ~4-7s           | 4               |
| **Improvement**              | **50% fewer** | **~60% faster** | **50% fewer**   |

**Grouping strategies:**

1. **By relationship**: CloudFront + S3, Lambda + API Gateway
2. **By concern**: All IAM policies together, all security settings together
3. **By scenario**: Default config in one test, custom overrides in another

### 2. Testing Security Configuration

```typescript
it('should enforce S3 security best practices', async () => {
  const app = new App({ mode: 'deploy' });
  const Stack = function (ctx: StackContext) {
    new MyBucket(ctx.stack, 'test');
  };
  app.stack(Stack);
  await app.finish();

  const template = Template.fromStack(getStack(Stack));

  // Group: resource count + security properties + versioning
  template.resourceCountIs('AWS::S3::Bucket', 1);
  template.hasResourceProperties(
    'AWS::S3::Bucket',
    Match.objectLike({
      BucketEncryption: Match.objectLike({
        ServerSideEncryptionConfiguration: Match.arrayWith([
          Match.objectLike({
            ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' },
          }),
        ]),
      }),
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: { Status: 'Enabled' },
    })
  );
});
```

### 3. Testing Cross-Resource References

Use `Capture` to verify resources are wired correctly:

```typescript
it('should wire Lambda to IAM role with correct permissions', async () => {
  const app = new App({ mode: 'deploy' });
  const Stack = function (ctx: StackContext) {
    new ApiWithLambda(ctx.stack, 'test');
  };
  app.stack(Stack);
  await app.finish();

  const template = Template.fromStack(getStack(Stack));

  // Capture the role reference from Lambda
  const roleCapture = new Capture();
  template.hasResourceProperties(
    'AWS::Lambda::Function',
    Match.objectLike({
      Handler: 'handlers/processor.handler',
      Role: roleCapture,
    })
  );

  // Extract role logical ID and verify IAM policy
  const roleLogicalId = roleCapture.asObject()['Fn::GetAtt'][0];
  template.hasResourceProperties(
    'AWS::IAM::Policy',
    Match.objectLike({
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'dynamodb:*',
            Effect: 'Allow',
          }),
        ]),
      }),
      Roles: Match.arrayWith([{ Ref: roleLogicalId }]),
    })
  );
});
```

**Common cross-resource patterns:**

| Source Resource | Captured Property | Extract With                          | Linked Resource     |
| --------------- | ----------------- | ------------------------------------- | ------------------- |
| Lambda Function | Role (Fn::GetAtt) | `capture.asObject()['Fn::GetAtt'][0]` | IAM Policy          |
| Lambda Function | Function ARN      | `capture.asObject()['Fn::GetAtt'][0]` | API Gateway         |
| SQS Queue       | Queue ARN         | `capture.asObject()['Fn::GetAtt'][0]` | Lambda Event Source |
| DynamoDB Table  | Table Ref         | `capture.asObject()['Ref']`           | Lambda env var      |

### 4. Testing Multiple Resources

```typescript
it('should create multiple clients with OAuth configuration', async () => {
  const app = new App({ mode: 'deploy' });
  const Stack = function (ctx: StackContext) {
    new UserPool(ctx.stack, 'test', {
      clients: [
        { clientName: 'web-client', allowedOAuthFlows: ['code'] },
        { clientName: 'mobile-client', allowedOAuthFlows: ['implicit'] },
      ],
    });
  };
  app.stack(Stack);
  await app.finish();

  const template = Template.fromStack(getStack(Stack));

  template.resourceCountIs('AWS::Cognito::UserPoolClient', 2);

  template.hasResourceProperties(
    'AWS::Cognito::UserPoolClient',
    Match.objectLike({
      ClientName: 'web-client',
      AllowedOAuthFlows: ['code'],
    })
  );

  template.hasResourceProperties(
    'AWS::Cognito::UserPoolClient',
    Match.objectLike({
      ClientName: 'mobile-client',
      AllowedOAuthFlows: ['implicit'],
    })
  );
});
```

**Tip:** Use `description` property (if available) to make assertions more explicit when testing multiple instances of the same resource type.

### 5. Testing Conditional Resources

```typescript
it('should handle optional resources based on configuration', async () => {
  const app = new App({ mode: 'deploy' });
  const Stack = function (ctx: StackContext) {
    new UserPool(ctx.stack, 'test', {
      // No clients provided
      enableDomain: false,
    });
  };
  app.stack(Stack);
  await app.finish();

  const template = Template.fromStack(getStack(Stack));

  template.resourceCountIs('AWS::Cognito::UserPool', 1);
  template.resourceCountIs('AWS::Cognito::UserPoolClient', 0);
  template.resourceCountIs('AWS::Cognito::UserPoolDomain', 0);
});
```

### 6. Testing Stage-Dependent Configuration

```typescript
it('should apply production settings for permanent stages', async () => {
  await initProject({ stage: 'production' });

  const app = new App({ mode: 'deploy' });
  const Stack = function (ctx: StackContext) {
    new MyConstruct(ctx.stack, 'test');
  };
  app.stack(Stack);
  await app.finish();

  const template = Template.fromStack(getStack(Stack));

  // Group: removal policy + backup + point-in-time recovery
  template.hasResourceProperties(
    'AWS::DynamoDB::Table',
    Match.objectLike({
      DeletionPolicy: 'Retain',
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
    })
  );

  template.hasResourceProperties(
    'AWS::S3::Bucket',
    Match.objectLike({
      DeletionPolicy: 'Retain',
      VersioningConfiguration: { Status: 'Enabled' },
    })
  );
});
```

## Real-World Example: User Signup Email Feature

**Feature requirement:** When a user signs up, send them a welcome email.

**Infrastructure tests to write:**

```typescript
describe('User Signup Email Stack', () => {
  beforeAll(async () => {
    await initProject({});
  });

  it('should create signup API with Lambda integration', async () => {
    const app = new App({ mode: 'deploy' });
    const Stack = function (ctx: StackContext) {
      new UserSignupStack(ctx.stack, 'test');
    };
    app.stack(Stack);
    await app.finish();
    const template = Template.fromStack(getStack(Stack));

    // API Gateway + Lambda handler
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    template.hasResourceProperties(
      'AWS::ApiGatewayV2::Route',
      Match.objectLike({ RouteKey: 'POST /signup' })
    );
    template.hasResourceProperties(
      'AWS::Lambda::Function',
      Match.objectLike({
        Handler: 'signup.handler',
        Runtime: Match.stringLikeRegexp('nodejs'),
      })
    );
  });

  it('should create SQS queue with DLQ for signup events', async () => {
    // ... SQS + DLQ configuration
  });

  it('should wire Lambda to process SQS and have SES permissions', async () => {
    // ... Event source mapping + IAM permissions
  });
});
```

**What these tests verify:**

- ✅ API Gateway endpoint exists and routes to signup Lambda
- ✅ SQS queue exists with DLQ configured
- ✅ Lambda is wired to SQS with correct permissions
- ✅ IAM role has SES send email permissions

**What these tests do NOT verify:**

- ❌ Whether emails actually arrive (integration/E2E test)
- ❌ Email content formatting (unit test)

## Debugging Failed Tests

### View Full Template

```typescript
it('debug test', async () => {
  const app = new App({ mode: 'deploy' });
  const Stack = function (ctx: StackContext) {
    new MyConstruct(ctx.stack, 'test');
  };
  app.stack(Stack);
  await app.finish();

  const template = Template.fromStack(getStack(Stack));

  // Print entire template
  console.log(JSON.stringify(template.toJSON(), null, 2));
});
```

### Find All Resources

```typescript
// Get all resources of a type
const buckets = template.findResources('AWS::S3::Bucket');
console.log(JSON.stringify(buckets, null, 2));

// Get all resources in stack
const allResources = template.toJSON().Resources;
console.log(JSON.stringify(allResources, null, 2));
```

### Inspect Resource Properties

```typescript
const functions = template.findResources('AWS::Lambda::Function');
const functionLogicalId = Object.keys(functions)[0];
const functionProps = functions[functionLogicalId];
console.log('Function Properties:', JSON.stringify(functionProps, null, 2));
```

## Using AWS IAC MCP Tools

The AWS IAC MCP provides tools for working with AWS infrastructure code. Use these to write accurate tests and understand AWS resource configurations.

### When to Use Which Tool

| Task                                          | Tool                                       |
| --------------------------------------------- | ------------------------------------------ |
| Understanding CDK assertions (Capture, Match) | `search_cdk_documentation`                 |
| Finding CloudFormation property names         | `search_cloudformation_documentation`      |
| Finding code examples                         | `search_cdk_samples_and_constructs`        |
| Understanding CDK constructs (L1/L2/L3)       | `search_cdk_documentation`                 |
| Learning about CDK Aspects                    | `search_cdk_documentation`                 |
| Reading full documentation page               | `read_iac_documentation_page`              |
| Debugging deployment failures                 | `troubleshoot_cloudformation_deployment`   |
| Validating template syntax                    | `validate_cloudformation_template`         |
| Checking security compliance                  | `check_cloudformation_template_compliance` |

### Key Distinction

- **`search_cdk_documentation`** - CDK APIs, construct usage, testing utilities, app lifecycle, Aspects
- **`search_cloudformation_documentation`** - CloudFormation resource types, property names, valid values (what you assert against)

### Example Queries

```
// CDK assertions
search_cdk_documentation("Capture asString asObject assertions")
search_cdk_documentation("Match objectLike arrayWith stringLikeRegexp")

// CloudFormation properties for assertions
search_cloudformation_documentation("AWS::Lambda::Function properties")
search_cloudformation_documentation("AWS::S3::Bucket PublicAccessBlockConfiguration")
search_cloudformation_documentation("AWS::IAM::Policy PolicyDocument Statement")

// Code examples
search_cdk_samples_and_constructs("Lambda API Gateway integration TypeScript")
```

### Quick Reference: Common CloudFormation Properties

| Resource Type            | Common Properties to Test                                                      |
| ------------------------ | ------------------------------------------------------------------------------ |
| `AWS::Lambda::Function`  | Handler, Runtime, Role, Timeout, MemorySize, Environment.Variables             |
| `AWS::S3::Bucket`        | BucketEncryption, PublicAccessBlockConfiguration, VersioningConfiguration      |
| `AWS::DynamoDB::Table`   | KeySchema, AttributeDefinitions, BillingMode, PointInTimeRecoverySpecification |
| `AWS::IAM::Policy`       | PolicyDocument.Statement (Action, Effect, Resource), Roles                     |
| `AWS::IAM::Role`         | AssumeRolePolicyDocument, Policies, ManagedPolicyArns                          |
| `AWS::SQS::Queue`        | QueueName, VisibilityTimeout, RedrivePolicy                                    |
| `AWS::Cognito::UserPool` | Policies.PasswordPolicy, AliasAttributes, AutoVerifiedAttributes               |

## CloudFormation Property Patterns

### PascalCase in CloudFormation

```typescript
// CDK Input (camelCase)
new Bucket(stack, 'Bucket', {
  bucketName: 'my-bucket',
  encryption: BucketEncryption.S3_MANAGED,
});

// CloudFormation Output (PascalCase) - use in assertions
{
  BucketName: 'my-bucket',
  BucketEncryption: { /* ... */ }
}
```

### Reference Functions

```typescript
// Direct reference
{ "Ref": "LogicalResourceId" }

// Get attribute
{ "Fn::GetAtt": ["LogicalResourceId", "Arn"] }

// Join strings
{ "Fn::Join": ["", ["prefix-", { "Ref": "ResourceId" }]] }
```

### Boolean Values

```typescript
// Some use boolean
BlockPublicAcls: true;

// Some use string
Status: 'Enabled'; // not true/false
```

## Snapshot Testing

### When to Use

**✅ Good use cases:**

- Refactoring construct implementations while keeping outputs the same
- Ensuring changes to shared constructs don't unexpectedly affect other stacks

**❌ Not ideal for:**

- Primary regression testing (too broad, fails on CDK updates)
- Catching specific infrastructure policy violations

### Example

```typescript
it('matches snapshot', async () => {
  const app = new App({ mode: 'deploy' });
  const Stack = function (ctx: StackContext) {
    new MyConstruct(ctx.stack, 'test');
  };
  app.stack(Stack);
  await app.finish();

  const template = Template.fromStack(getStack(Stack));
  expect(template.toJSON()).toMatchSnapshot();
});
```

### Best Practices

1. **Combine with fine-grained assertions** - Use snapshots alongside specific property tests
2. **Review diffs carefully** - Don't blindly accept changes
3. **Keep snapshots focused** - Test individual constructs, not entire apps
4. **Hold external factors constant** - Use same CDK version during refactoring

## Writing Effective Tests

### Group Related Assertions

```typescript
// ❌ Over-fragmented (3 stack syntheses)
it('should create user pool', async () => {
  /* ... */
});
it('should enforce minimum password length', async () => {
  /* ... */
});
it('should auto-verify email', async () => {
  /* ... */
});

// ✅ Grouped (1 stack synthesis, 3x faster)
it('should configure user pool with security settings', async () => {
  template.resourceCountIs('AWS::Cognito::UserPool', 1);
  template.hasResourceProperties(
    'AWS::Cognito::UserPool',
    Match.objectLike({
      Policies: Match.objectLike({
        PasswordPolicy: Match.objectLike({ MinimumLength: 8 }),
      }),
      AutoVerifiedAttributes: ['email'],
      MfaConfiguration: 'OPTIONAL',
    })
  );
});
```

### Use Descriptive Test Names

```typescript
// ✅ Good - describes expected behavior
it('should enforce 8-character minimum password length', async () => {});
it('should block all public S3 bucket access', async () => {});

// ❌ Bad - too vague
it('test password policy', async () => {});
it('should work', async () => {});
```

### Extract Common Test Setup

```typescript
function createTestStack(props?: Partial<MyStackProps>) {
  const app = new App({ mode: 'deploy' });
  const Stack = function (ctx: StackContext) {
    new MyStack(ctx.stack, 'Stack', props);
  };
  app.stack(Stack);
  return { app, Stack };
}

it('should create resources', async () => {
  const { app, Stack } = createTestStack({ enableFeature: true });
  await app.finish();
  const template = Template.fromStack(getStack(Stack));
  // assertions...
});
```

## Running Tests

```bash
# Watch mode (interactive)
pnpm test

# Single run (CI)
pnpm test:run

# Specific file
vitest run infra/MyConstruct.test.ts

# Full validation
pnpm type-check && pnpm lint && pnpm test:run
```

## Additional Resources

- [AWS CDK Testing Guide](https://docs.aws.amazon.com/cdk/v2/guide/testing.html)
- [SST v2 Documentation](https://v2.sst.dev/)
- [SST v2 Constructs](https://v2.sst.dev/constructs)
- [SST v2 Testing](https://v2.sst.dev/testing)
- [CloudFormation Resource Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html)
- [Vitest Documentation](https://vitest.dev)
