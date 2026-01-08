declare module 'sst/node/config' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface GlobalTableResources {}
}

export type GlobalTableTypes = {
  [T in keyof import('sst/node/config').GlobalTableResources]: {
    tableName: string;
  };
};

function normalizeId(name: string) {
  return name.replace(/-/g, '_');
}

function createProxy<T extends object>(constructName: string): T {
  // Build map of property names to values from environment variables
  const variables = new Map<string, { tableName: string }>();

  for (const key in process.env) {
    if (key.startsWith(`SST_${constructName}_tableName_`)) {
      const propName = key.replace(`SST_${constructName}_tableName_`, '');
      const tableName = process.env[key];

      if (tableName) {
        variables.set(propName, { tableName });
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = new Proxy<T>({} as any, {
    get(target, prop) {
      if (typeof prop === 'string') {
        // normalize prop to convert kebab cases like `my-table` to `my_table`
        const normProp = normalizeId(prop);

        // Check if variable exists for this property
        const value = variables.get(normProp);
        if (!value) {
          throw new Error(
            `Cannot use ${constructName}.${String(
              prop
            )}. Please make sure it is bound to this function.`
          );
        }

        return value;
      }
      return Reflect.get(target, prop);
    },
  });

  return result;
}

export const GlobalTable =
  /* @__PURE__ */ createProxy<GlobalTableTypes>('GlobalTable');
