import { Construct } from 'constructs';
import { App, Stack, StackContext } from 'sst/constructs';
import { SSTConstruct } from 'sst/constructs/Construct.js';
import { BindingProps } from 'sst/constructs/util/binding.js';
import { serviceConfig } from '@lib/sst-helpers';

export interface ServiceConfigProps {
  path: serviceConfig.ServicePath;
}

export class ServiceConfig extends Construct implements SSTConstruct {
  public readonly id: string;
  public readonly path: serviceConfig.ServicePath;
  public readonly parameterName: string;
  public readonly parameterArn: string;

  constructor(scope: Construct, id: string, props: ServiceConfigProps) {
    super(scope, `ServiceConfig_${id}`);

    this.id = id;
    this.path = props.path;

    const stack = Stack.of(this);
    const app = stack.node.root as App;

    this.parameterName = serviceConfig.getParameterName(
      { app, stack } as StackContext,
      { path: this.path, validateDependency: false }
    );
    this.parameterArn = serviceConfig.getParameterArn(
      { app, stack } as StackContext,
      { path: this.path, validateDependency: false }
    );

    // Create SSM Parameter construct reference so SST won't create a new one
    // ssm.StringParameter.fromStringParameterName(
    //   this,
    //   `Parameter_value`,
    //   this.parameterName
    // );

    // Register with SST's type system
    app.registerTypes(this);
  }

  /** @internal */
  public getConstructMetadata() {
    return {
      type: 'ServiceConfig' as const,
      data: { path: this.path },
    };
  }

  /** @internal */
  public getBindings(): BindingProps {
    return {
      clientPackage: 'config',
      variables: { value: { type: 'plain', value: this.parameterName } },
      permissions: { 'ssm:GetParameter': [this.parameterArn] },
    };
  }
}
