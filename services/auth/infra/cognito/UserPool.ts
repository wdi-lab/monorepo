import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { App, Stack } from 'sst/constructs';
import { removalPolicy } from '@lib/sst-helpers';

type UserPoolProps = {
  cdk?: {
    userPool?: cognito.UserPoolProps;
  };
  clients?: Record<string, cognito.UserPoolClientOptions>;
};

export class UserPool extends Construct {
  app: App;
  stack: Stack;
  userPool!: cognito.UserPool;

  constructor(
    readonly scope: Construct,
    readonly id: string,
    readonly props: UserPoolProps = {}
  ) {
    super(scope, id);

    this.app = scope.node.root as App;
    this.stack = Stack.of(this) as Stack;

    this.createUserPool();
    this.createUserPoolClients();
  }

  private createUserPool() {
    this.userPool = new cognito.UserPool(this, `UserPool-${this.id}`, {
      userPoolName: this.app.logicalPrefixedName(`${this.id}`),
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireUppercase: true,
        requireLowercase: true,
        requireSymbols: true,
        ...this.props.cdk?.userPool?.passwordPolicy,
      },
      signInAliases: {
        username: true,
        phone: true,
        preferredUsername: true,
        email: true,
        ...this.props.cdk?.userPool?.signInAliases,
      },
      removalPolicy: removalPolicy.retainForPermanentStage({
        stack: this.stack,
        app: this.app,
      }),
      ...this.props.cdk?.userPool,
    });
  }

  private createUserPoolClients() {
    if (!this.props.clients) return;

    Object.entries(this.props.clients).forEach(([clientId, clientProps]) => {
      this.userPool.addClient(`UserPoolClient-${clientId}`, {
        userPoolClientName: clientId,
        generateSecret: false,
        authFlows: {
          adminUserPassword: false,
          userPassword: false,
          userSrp: false,
          custom: true,
          ...clientProps.authFlows,
        },
        preventUserExistenceErrors: true,
        ...clientProps,
      });
    });
  }
}
