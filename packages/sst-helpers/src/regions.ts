// mapping of region groups to their respective regions
// within a group, the first region is considered the primary region
// other regions are considered secondary
const REGIONS_GROUPS_MAPPINGS = {
  us1: ['us-west-2', 'us-west-1'],
  ap1: ['ap-northeast-1', 'ap-northeast-2'],
  eu1: ['eu-west-1', 'eu-west-2'],
} as const;

const _ALL_REGIONS = Object.values(REGIONS_GROUPS_MAPPINGS).flat();

const _ALL_REGION_GROUPS = Object.keys(
  REGIONS_GROUPS_MAPPINGS
) as unknown as (keyof typeof REGIONS_GROUPS_MAPPINGS)[];

export type RegionGroup = (typeof _ALL_REGION_GROUPS)[number];
export type Region = (typeof _ALL_REGIONS)[number];

export type RegionByGroup<G extends RegionGroup> =
  (typeof REGIONS_GROUPS_MAPPINGS)[G];

export const getRegionsByRegionGroup = <G extends RegionGroup>(
  group: G
): RegionByGroup<G> => {
  const regions = REGIONS_GROUPS_MAPPINGS[group];
  if (!regions) {
    throw new Error(`Unknown region group: ${group}`);
  }
  return regions as RegionByGroup<G>;
};

export const getRegionGroup = (region: string) => {
  const regionGroups = Object.keys(
    REGIONS_GROUPS_MAPPINGS
  ) as (keyof typeof REGIONS_GROUPS_MAPPINGS)[];

  for (const group of regionGroups) {
    const regions = getRegionsByRegionGroup(group) as unknown as string[];
    if (regions.includes(region)) {
      return group as RegionGroup;
    }
  }

  throw new Error(`Unknown region group for region: ${region}`);
};

export const getPrimaryRegionByRegionGroup = <G extends RegionGroup>(
  group: G
): RegionByGroup<G>[0] => {
  const regions = getRegionsByRegionGroup(group);
  return regions[0];
};

export const getPrimaryRegionByCurrentRegion = (region: string): Region => {
  const group = getRegionGroup(region);
  return getPrimaryRegionByRegionGroup(group);
};

export const isPrimaryRegion = (region: string): boolean => {
  const group = getRegionGroup(region);
  const primaryRegion = getPrimaryRegionByRegionGroup(group);
  return region === primaryRegion;
};

export const getHomeRegion = () => {
  return getPrimaryRegionByRegionGroup('us1');
};
