import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { App, Stack } from 'sst/constructs';
import { SSTConstruct } from 'sst/constructs/Construct.js';
import { BindingProps } from 'sst/constructs/util/binding.js';
import { removalPolicy } from '@lib/sst-helpers';

/////////////////////
// Interfaces
/////////////////////

type GlobalTableFieldType = Lowercase<keyof typeof dynamodb.AttributeType>;

export interface GlobalTableGlobalIndexProps {
  /**
   * The field that's to be used as a partition key for the index.
   */
  partitionKey: string;
  /**
   * The field that's to be used as the sort key for the index.
   */
  sortKey?: string;
  /**
   * The set of attributes that are projected into the secondary index.
   * @default "all"
   */
  projection?:
    | Lowercase<keyof Pick<typeof dynamodb.ProjectionType, 'ALL' | 'KEYS_ONLY'>>
    | string[];
}

export interface GlobalTableLocalIndexProps {
  /**
   * The field that's to be used as the sort key for the index.
   */
  sortKey: string;
  /**
   * The set of attributes that are projected into the secondary index.
   * @default "all"
   */
  projection?:
    | Lowercase<keyof Pick<typeof dynamodb.ProjectionType, 'ALL' | 'KEYS_ONLY'>>
    | string[];
}

export interface GlobalTableReplicaProps {
  /**
   * The AWS region where the replica table will be created.
   */
  region: string;
  /**
   * Whether to enable Point-in-Time Recovery for this replica.
   * @default inherited from primary table
   */
  pointInTimeRecovery?: boolean;
  /**
   * Whether to enable deletion protection for this replica.
   * @default inherited from primary table
   */
  deletionProtection?: boolean;
  /**
   * The table class for this replica.
   * @default inherited from primary table
   */
  tableClass?: dynamodb.TableClass;
}

export interface GlobalTableProps {
  /**
   * Override the default table name.
   * By default, the table name is prefixed with the app's logical prefix.
   *
   * @example
   * ```js
   * new GlobalTable(stack, "Table", {
   *   tableName: "my-custom-table-name",
   *   fields: {
   *     pk: "string",
   *   },
   *   primaryIndex: { partitionKey: "pk" },
   * });
   * ```
   */
  tableName?: string;
  /**
   * An object defining the fields of the table. Key is the name of the field and the value is the type.
   *
   * @example
   * ```js
   * new GlobalTable(stack, "Table", {
   *   fields: {
   *     pk: "string",
   *     sk: "string",
   *   }
   * })
   * ```
   */
  fields?: Record<string, GlobalTableFieldType>;
  /**
   * Define the primary index for the table.
   */
  primaryIndex?: {
    /**
     * Define the Partition Key for the table's primary index
     *
     * @example
     *
     * ```js
     * new GlobalTable(stack, "Table", {
     *   fields: {
     *     pk: "string",
     *   },
     *   primaryIndex: { partitionKey: "pk" },
     * });
     * ```
     */
    partitionKey: string;
    /**
     * Define the Sort Key for the table's primary index
     *
     * @example
     *
     * ```js
     * new GlobalTable(stack, "Table", {
     *   fields: {
     *     pk: "string",
     *     sk: "string",
     *   },
     *   primaryIndex: { partitionKey: "pk", sortKey: "sk" },
     * });
     * ```
     */
    sortKey?: string;
  };
  /**
   * Configure the table's global secondary indexes
   *
   * @example
   *
   * ```js
   * new GlobalTable(stack, "Table", {
   *   fields: {
   *     pk: "string",
   *     sk: "string",
   *     gsi1pk: "string",
   *     gsi1sk: "string",
   *   },
   *   globalIndexes: {
   *     "GSI1": { partitionKey: "gsi1pk", sortKey: "gsi1sk" },
   *   },
   * });
   * ```
   */
  globalIndexes?: Record<string, GlobalTableGlobalIndexProps>;
  /**
   * Configure the table's local secondary indexes
   *
   * @example
   *
   * ```js
   * new GlobalTable(stack, "Table", {
   *   fields: {
   *     pk: "string",
   *     sk: "string",
   *     lsi1sk: "string",
   *   },
   *   localIndexes: {
   *     "lsi1": { sortKey: "lsi1sk" },
   *   },
   * });
   * ```
   */
  localIndexes?: Record<string, GlobalTableLocalIndexProps>;
  /**
   * The field that's used to store the expiration time for items in the table.
   *
   * @example
   * ```js
   * new GlobalTable(stack, "Table", {
   *   timeToLiveAttribute: "expireAt",
   * });
   * ```
   */
  timeToLiveAttribute?: string;
  /**
   * Configure DynamoDB Streams for the table.
   *
   * @example
   * ```js
   * new GlobalTable(stack, "Table", {
   *   stream: "new_and_old_images",
   * });
   * ```
   */
  stream?: Lowercase<keyof typeof dynamodb.StreamViewType>;
  /**
   * Configure replica tables for global table functionality.
   * Each replica will be created in the specified AWS region.
   *
   * Note: The primary table region is automatically included and should NOT
   * be specified in replicas.
   *
   * @example
   * ```js
   * new GlobalTable(stack, "Table", {
   *   fields: { pk: "string" },
   *   primaryIndex: { partitionKey: "pk" },
   *   replicas: [
   *     { region: "us-east-1" },
   *     { region: "eu-west-1" },
   *   ],
   * });
   * ```
   */
  replicas?: GlobalTableReplicaProps[];
  /**
   * Whether to enable Point-in-Time Recovery for the table.
   * @default true
   */
  pointInTimeRecovery?: boolean;
  /**
   * Whether to enable deletion protection for the table.
   * @default false
   */
  deletionProtection?: boolean;
  /**
   * The table class to use for the table.
   * @default dynamodb.TableClass.STANDARD
   */
  tableClass?: dynamodb.TableClass;
  cdk?: {
    /**
     * Allows you to override default id for this construct.
     */
    id?: string;
    /**
     * Override the settings of the internally created CDK TableV2.
     * Cannot be used with `fields` and `primaryIndex`.
     */
    table?:
      | dynamodb.ITableV2
      | Omit<dynamodb.TablePropsV2, 'partitionKey' | 'sortKey' | 'replicas'>;
  };
}

/////////////////////
// Construct
/////////////////////

/**
 * The `GlobalTable` construct is a higher level CDK construct that makes it easy to create
 * a DynamoDB Global Table using CDK's TableV2.
 *
 * @example
 *
 * ```js
 * import { GlobalTable } from "@lib/sst-constructs";
 *
 * new GlobalTable(stack, "Users", {
 *   fields: {
 *     userId: "string",
 *     email: "string",
 *   },
 *   primaryIndex: { partitionKey: "userId" },
 *   replicas: [
 *     { region: "us-east-1" },
 *     { region: "eu-west-1" },
 *   ],
 * });
 * ```
 */
export class GlobalTable extends Construct implements SSTConstruct {
  public readonly id: string;
  public readonly cdk: {
    /**
     * The internally created CDK `TableV2` instance.
     */
    table: dynamodb.ITableV2;
  };
  private dynamodbTableType?: 'CREATED' | 'IMPORTED';
  private props: GlobalTableProps;
  private fields?: Record<string, GlobalTableFieldType>;

  constructor(scope: Construct, id: string, props: GlobalTableProps) {
    super(scope, props.cdk?.id || id);

    this.id = id;
    this.props = props;
    const { fields, globalIndexes, localIndexes } = this.props;
    this.cdk = {} as { table: dynamodb.ITableV2 };
    this.fields = fields;

    // Input Validation
    this.validateFieldsAndIndexes(id, props);

    // Create Table
    this.createTable();

    // Create Secondary Indexes
    if (globalIndexes) this.addGlobalIndexes(globalIndexes);
    if (localIndexes) this.addLocalIndexes(localIndexes);

    const app = this.node.root as App;
    app.registerTypes(this);
  }

  /**
   * The ARN of the internally created DynamoDB Table.
   */
  public get tableArn(): string {
    return this.cdk.table.tableArn;
  }

  /**
   * The name of the internally created DynamoDB Table.
   */
  public get tableName(): string {
    return this.cdk.table.tableName;
  }

  /**
   * Add additional global secondary indexes where the `key` is the name of the global secondary index
   *
   * @example
   * ```js
   * table.addGlobalIndexes({
   *   gsi1: {
   *     partitionKey: "pk",
   *     sortKey: "sk",
   *   }
   * })
   * ```
   */
  public addGlobalIndexes(
    secondaryIndexes: NonNullable<GlobalTableProps['globalIndexes']>
  ) {
    if (!this.fields)
      throw new Error(
        `Cannot add secondary indexes to "${this.node.id}" GlobalTable without defining "fields"`
      );

    for (const [
      indexName,
      { partitionKey, sortKey, projection },
    ] of Object.entries(secondaryIndexes)) {
      (this.cdk.table as dynamodb.TableV2).addGlobalSecondaryIndex({
        indexName,
        partitionKey: this.buildAttribute(this.fields, partitionKey),
        sortKey: sortKey
          ? this.buildAttribute(this.fields, sortKey)
          : undefined,
        ...this.buildProjection(projection),
      });
    }
  }

  /**
   * Add additional local secondary indexes where the `key` is the name of the local secondary index
   *
   * @example
   * ```js
   * table.addLocalIndexes({
   *   lsi1: {
   *     sortKey: "sk",
   *   }
   * })
   * ```
   */
  public addLocalIndexes(
    secondaryIndexes: NonNullable<GlobalTableProps['localIndexes']>
  ) {
    if (!this.fields)
      throw new Error(
        `Cannot add local secondary indexes to "${this.node.id}" GlobalTable without defining "fields"`
      );

    for (const [indexName, { sortKey, projection }] of Object.entries(
      secondaryIndexes
    )) {
      (this.cdk.table as dynamodb.TableV2).addLocalSecondaryIndex({
        indexName,
        sortKey: this.buildAttribute(this.fields, sortKey),
        ...this.buildProjection(projection),
      });
    }
  }

  /**
   * Add a replica table in the specified region.
   *
   * @example
   * ```js
   * table.addReplica({ region: "eu-west-1" });
   * ```
   */
  public addReplica(props: GlobalTableReplicaProps): void {
    if (this.dynamodbTableType === 'IMPORTED') {
      throw new Error(
        `Cannot add replicas to imported GlobalTable "${this.node.id}"`
      );
    }

    (this.cdk.table as dynamodb.TableV2).addReplica({
      region: props.region,
      pointInTimeRecoverySpecification:
        props.pointInTimeRecovery !== undefined
          ? { pointInTimeRecoveryEnabled: props.pointInTimeRecovery }
          : undefined,
      deletionProtection: props.deletionProtection,
      tableClass: props.tableClass,
    });
  }

  /**
   * Get a reference to a replica table in the specified region.
   *
   * @example
   * ```js
   * const euReplica = table.replica("eu-west-1");
   * ```
   */
  public replica(region: string): dynamodb.ITableV2 {
    return (this.cdk.table as dynamodb.TableV2).replica(region);
  }

  /** @internal */
  public getConstructMetadata() {
    return {
      type: 'GlobalTable' as const,
      data: {
        tableName: this.cdk.table.tableName,
      },
    };
  }

  /** @internal */
  public getBindings(): BindingProps {
    return {
      clientPackage: 'table',
      variables: {
        tableName: {
          type: 'plain',
          value: this.tableName,
        },
      },
      permissions: {
        'dynamodb:*': [this.tableArn, `${this.tableArn}/*`],
      },
    };
  }

  private createTable() {
    const {
      fields,
      primaryIndex,
      stream,
      timeToLiveAttribute,
      replicas,
      pointInTimeRecovery,
      deletionProtection,
      tableClass,
      cdk,
    } = this.props;
    const app = this.node.root as App;
    const stack = Stack.of(this) as Stack;
    const id = this.node.id;

    if (this.isCDKConstruct(cdk?.table)) {
      // Validate "fields" is not configured
      if (fields !== undefined) {
        throw new Error(
          `Cannot configure the "fields" when "cdk.table" is a construct in the "${id}" GlobalTable`
        );
      }

      // Validate "stream" is not configured
      if (stream !== undefined) {
        throw new Error(
          `Cannot configure the "stream" when "cdk.table" is a construct in the "${id}" GlobalTable`
        );
      }

      // Validate "replicas" is not configured
      if (replicas !== undefined) {
        throw new Error(
          `Cannot configure the "replicas" when "cdk.table" is a construct in the "${id}" GlobalTable`
        );
      }

      this.dynamodbTableType = 'IMPORTED';
      this.cdk.table = cdk.table;
    } else {
      const dynamodbTableProps = (cdk?.table || {}) as Omit<
        dynamodb.TablePropsV2,
        'partitionKey' | 'sortKey' | 'replicas'
      >;

      // Validate "fields" is configured
      if (fields === undefined) {
        throw new Error(`Missing "fields" in the "${id}" GlobalTable`);
      }

      // Build replica configurations
      const replicaConfigs: dynamodb.ReplicaTableProps[] | undefined =
        replicas?.map((replica) => ({
          region: replica.region,
          pointInTimeRecoverySpecification:
            replica.pointInTimeRecovery !== undefined
              ? { pointInTimeRecoveryEnabled: replica.pointInTimeRecovery }
              : undefined,
          deletionProtection: replica.deletionProtection,
          tableClass: replica.tableClass,
        }));

      this.dynamodbTableType = 'CREATED';
      this.cdk.table = new dynamodb.TableV2(this, 'Table', {
        ...dynamodbTableProps,
        tableName: this.props.tableName ?? app.logicalPrefixedName(id),
        partitionKey: this.buildAttribute(fields, primaryIndex!.partitionKey),
        sortKey: primaryIndex?.sortKey
          ? this.buildAttribute(fields, primaryIndex.sortKey)
          : undefined,
        billing: dynamodbTableProps.billing ?? dynamodb.Billing.onDemand(),
        dynamoStream: this.buildStreamConfig(stream),
        timeToLiveAttribute,
        pointInTimeRecoverySpecification: {
          pointInTimeRecoveryEnabled: pointInTimeRecovery ?? true,
        },
        deletionProtection,
        tableClass,
        removalPolicy: removalPolicy.retainForPermanentStage({ app, stack }),
        replicas: replicaConfigs,
      });
    }
  }

  private buildAttribute(
    fields: Record<string, GlobalTableFieldType>,
    name: string
  ): dynamodb.Attribute {
    // Ensure the key is specified in "fields"
    if (!fields[name]) {
      throw new Error(
        `Please define "${name}" in "fields" to create the index in the "${this.node.id}" GlobalTable.`
      );
    }

    return {
      name,
      type: dynamodb.AttributeType[
        fields[name].toUpperCase() as keyof typeof dynamodb.AttributeType
      ],
    };
  }

  private buildStreamConfig(
    stream?: Lowercase<keyof typeof dynamodb.StreamViewType>
  ): dynamodb.StreamViewType | undefined {
    if (!stream) {
      return undefined;
    }

    return dynamodb.StreamViewType[
      stream.toUpperCase() as keyof typeof dynamodb.StreamViewType
    ];
  }

  private buildProjection(
    projection?:
      | Lowercase<
          keyof Pick<typeof dynamodb.ProjectionType, 'ALL' | 'KEYS_ONLY'>
        >
      | string[]
  ): { projectionType?: dynamodb.ProjectionType; nonKeyAttributes?: string[] } {
    if (!projection) {
      return {};
    }

    if (Array.isArray(projection)) {
      return {
        projectionType: dynamodb.ProjectionType.INCLUDE,
        nonKeyAttributes: projection,
      };
    }

    return {
      projectionType:
        dynamodb.ProjectionType[
          projection.toUpperCase() as keyof typeof dynamodb.ProjectionType
        ],
    };
  }

  private validateFieldsAndIndexes(id: string, props: GlobalTableProps): void {
    const { fields, primaryIndex } = props;

    // Validate "fields"
    if (fields && Object.keys(fields).length === 0) {
      throw new Error(`No fields defined for the "${id}" GlobalTable`);
    }

    // Validate "primaryIndex"
    if (primaryIndex && !primaryIndex.partitionKey) {
      throw new Error(
        `Missing "partitionKey" in primary index for the "${id}" GlobalTable`
      );
    }

    // Validate "fields" and "primaryIndex" co-exists
    if (fields) {
      if (!primaryIndex) {
        throw new Error(`Missing "primaryIndex" in "${id}" GlobalTable`);
      }
    } else if (!this.isCDKConstruct(props.cdk?.table)) {
      if (primaryIndex) {
        throw new Error(
          `Cannot configure the "primaryIndex" without setting the "fields" in "${id}" GlobalTable`
        );
      }
    }
  }

  private isCDKConstruct(
    table:
      | dynamodb.ITableV2
      | Omit<dynamodb.TablePropsV2, 'partitionKey' | 'sortKey' | 'replicas'>
      | undefined
  ): table is dynamodb.ITableV2 {
    return table !== undefined && 'tableArn' in table;
  }
}
