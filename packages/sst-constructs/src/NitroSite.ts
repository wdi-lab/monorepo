import fs from 'node:fs';
import path from 'node:path';
import { SsrSite, SsrSiteNormalizedProps, SsrSiteProps } from './SsrSite.js';
import { SsrFunctionProps } from 'sst/constructs/SsrFunction.js';
import { VisibleError } from 'sst/error.js';
import { Construct } from 'constructs';

const NITRO_OUTPUT_DIR = '.output';

type NitroSSiteProps = SsrSiteProps;

type NitroSiteNormalizedProps = SsrSiteProps & SsrSiteNormalizedProps;

/**
 * The `NitroSite` construct is a higher level CDK construct that makes it easy to create a Nitro app.
 *
 * @example
 *
 * Deploys a Nitro app in the `my-nitro-app` directory.
 *
 * ```js
 * new NitroSite(stack, "web", {
 *   path: "my-nitro-app/",
 * });
 * ```
 */
export class NitroSite extends SsrSite {
  declare props: NitroSiteNormalizedProps;

  constructor(scope: Construct, id: string, props?: NitroSSiteProps) {
    super(scope, id, props);
  }

  protected plan(): ReturnType<SsrSite['validatePlan']> {
    const { path: sitePath } = this.props;

    const nitro = JSON.parse(
      fs.readFileSync(
        path.join(sitePath, NITRO_OUTPUT_DIR, 'nitro.json'),
        'utf-8'
      )
    ) as {
      preset: string;
      config?: {
        awsLambda?: {
          streaming?: boolean;
        };
      };
    };

    if (!['aws-lambda'].includes(nitro.preset)) {
      throw new VisibleError(
        `Nitro must be configured to use the "aws-lambda" preset. It is currently set to "${nitro.preset}".`
      );
    }

    // Remove the .output/public/_server directory from the assets
    // b/c all `_server` requests should go to the server function. If this folder is
    // not removed, it will create an s3 route that conflicts with the `_server` route.
    fs.rmSync(path.join(sitePath, NITRO_OUTPUT_DIR, 'public', '_server'), {
      recursive: true,
      force: true,
    });
    fs.rmSync(path.join(sitePath, NITRO_OUTPUT_DIR, 'public', 'api'), {
      recursive: true,
      force: true,
    });

    const { handler, inject } = this.createServerLambdaBundle();

    const serverConfig = {
      description: 'Server handler for Nitro site',
      handler,
      runtime: 'nodejs22.x' as const,
      nodejs: {
        esbuild: {
          inject,
          format: 'esm' as const,
        },
      },
    } satisfies SsrFunctionProps;

    // The path for all files that need to be in the "/" directory (static assets)
    const assetsPath = path.join(NITRO_OUTPUT_DIR, 'public');
    const assetsVersionedSubDir = undefined;

    return this.validatePlan({
      edge: false,
      cloudFrontFunctions: {
        serverCfFunction: {
          constructId: 'CloudFrontFunction',
          injections: [this.useCloudFrontFunctionHostHeaderInjection()],
        },
      },
      origins: {
        regionalServer: {
          type: 'function',
          constructId: 'ServerFunction',
          function: serverConfig,
          streaming: nitro.config?.awsLambda?.streaming === true,
        },
        s3: {
          type: 's3',
          copy: [
            {
              from: assetsPath,
              to: '',
              cached: true,
              versionedSubDir: assetsVersionedSubDir,
            },
          ],
        },
      },
      behaviors: [
        {
          cacheType: 'server',
          cfFunction: 'serverCfFunction',
          origin: 'regionalServer',
        },
        // create 1 behaviour for each top level asset file/folder
        ...fs.readdirSync(path.join(sitePath, assetsPath)).map(
          (item) =>
            ({
              cacheType: 'static' as const,
              pattern: fs
                .statSync(path.join(sitePath, assetsPath, item))
                .isDirectory()
                ? `${item}/*`
                : item,
              // cfFunction: 'staticCfFunction',
              origin: 's3' as const,
            }) as const
        ),
      ],
    });
  }

  private createServerLambdaBundle() {
    // Ensure build directory exists
    const buildPath = path.join(this.props.path, NITRO_OUTPUT_DIR);
    fs.mkdirSync(buildPath, { recursive: true });

    return {
      handler: path.join(buildPath, 'server/index.handler'),
      inject: [],
    };
  }

  public getConstructMetadata() {
    return {
      type: 'NitroSite' as const,
      ...this.getConstructMetadataBase(),
    };
  }
}
