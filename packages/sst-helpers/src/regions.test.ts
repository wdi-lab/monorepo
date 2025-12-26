import { describe, it, expect } from 'vitest';
import {
  getRegionsByRegionGroup,
  getRegionGroup,
  getPrimaryRegionByRegionGroup,
  getPrimaryRegionByCurrentRegion,
  isPrimaryRegion,
  getHomeRegion,
} from './regions.ts';

describe('region helpers', () => {
  describe('getRegionsByRegionGroup', () => {
    it('should return all regions for us1 group', () => {
      const regions = getRegionsByRegionGroup('us1');
      expect(regions).toEqual(['us-west-2', 'us-west-1']);
    });

    it('should return all regions for ap1 group', () => {
      const regions = getRegionsByRegionGroup('ap1');
      expect(regions).toEqual(['ap-northeast-1', 'ap-northeast-2']);
    });

    it('should return all regions for eu1 group', () => {
      const regions = getRegionsByRegionGroup('eu1');
      expect(regions).toEqual(['eu-west-1', 'eu-west-2']);
    });

    it('should throw error for unknown region group', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid input
        getRegionsByRegionGroup('invalid-group');
      }).toThrow('Unknown region group: invalid-group');
    });
  });

  describe('getRegionGroup', () => {
    it('should return us1 for us-west-2', () => {
      expect(getRegionGroup('us-west-2')).toBe('us1');
    });

    it('should return us1 for us-west-1', () => {
      expect(getRegionGroup('us-west-1')).toBe('us1');
    });

    it('should return ap1 for ap-northeast-1', () => {
      expect(getRegionGroup('ap-northeast-1')).toBe('ap1');
    });

    it('should return ap1 for ap-northeast-2', () => {
      expect(getRegionGroup('ap-northeast-2')).toBe('ap1');
    });

    it('should return eu1 for eu-west-1', () => {
      expect(getRegionGroup('eu-west-1')).toBe('eu1');
    });

    it('should return eu1 for eu-west-2', () => {
      expect(getRegionGroup('eu-west-2')).toBe('eu1');
    });

    it('should throw error for unknown region', () => {
      expect(() => {
        getRegionGroup('us-east-1');
      }).toThrow('Unknown region group for region: us-east-1');
    });

    it('should throw error for invalid region', () => {
      expect(() => {
        getRegionGroup('invalid-region');
      }).toThrow('Unknown region group for region: invalid-region');
    });
  });

  describe('getPrimaryRegionByRegionGroup', () => {
    it('should return us-west-2 as primary for us1', () => {
      const primary = getPrimaryRegionByRegionGroup('us1');
      expect(primary).toBe('us-west-2');
    });

    it('should return ap-northeast-1 as primary for ap1', () => {
      const primary = getPrimaryRegionByRegionGroup('ap1');
      expect(primary).toBe('ap-northeast-1');
    });

    it('should return eu-west-1 as primary for eu1', () => {
      const primary = getPrimaryRegionByRegionGroup('eu1');
      expect(primary).toBe('eu-west-1');
    });

    it('should throw error for unknown region group', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid input
        getPrimaryRegionByRegionGroup('invalid-group');
      }).toThrow('Unknown region group: invalid-group');
    });
  });

  describe('getPrimaryRegionByCurrentRegion', () => {
    it('should return us-west-2 when current region is us-west-1', () => {
      expect(getPrimaryRegionByCurrentRegion('us-west-1')).toBe('us-west-2');
    });

    it('should return us-west-2 when current region is us-west-2', () => {
      expect(getPrimaryRegionByCurrentRegion('us-west-2')).toBe('us-west-2');
    });

    it('should return ap-northeast-1 when current region is ap-northeast-2', () => {
      expect(getPrimaryRegionByCurrentRegion('ap-northeast-2')).toBe(
        'ap-northeast-1'
      );
    });

    it('should return ap-northeast-1 when current region is ap-northeast-1', () => {
      expect(getPrimaryRegionByCurrentRegion('ap-northeast-1')).toBe(
        'ap-northeast-1'
      );
    });

    it('should return eu-west-1 when current region is eu-west-2', () => {
      expect(getPrimaryRegionByCurrentRegion('eu-west-2')).toBe('eu-west-1');
    });

    it('should return eu-west-1 when current region is eu-west-1', () => {
      expect(getPrimaryRegionByCurrentRegion('eu-west-1')).toBe('eu-west-1');
    });

    it('should throw error for unknown region', () => {
      expect(() => {
        getPrimaryRegionByCurrentRegion('us-east-1');
      }).toThrow('Unknown region group for region: us-east-1');
    });
  });

  describe('isPrimaryRegion', () => {
    it('should return true for us-west-2 (primary in us1)', () => {
      expect(isPrimaryRegion('us-west-2')).toBe(true);
    });

    it('should return false for us-west-1 (secondary in us1)', () => {
      expect(isPrimaryRegion('us-west-1')).toBe(false);
    });

    it('should return true for ap-northeast-1 (primary in ap1)', () => {
      expect(isPrimaryRegion('ap-northeast-1')).toBe(true);
    });

    it('should return false for ap-northeast-2 (secondary in ap1)', () => {
      expect(isPrimaryRegion('ap-northeast-2')).toBe(false);
    });

    it('should return true for eu-west-1 (primary in eu1)', () => {
      expect(isPrimaryRegion('eu-west-1')).toBe(true);
    });

    it('should return false for eu-west-2 (secondary in eu1)', () => {
      expect(isPrimaryRegion('eu-west-2')).toBe(false);
    });

    it('should throw error for unknown region', () => {
      expect(() => {
        isPrimaryRegion('us-east-1');
      }).toThrow('Unknown region group for region: us-east-1');
    });
  });

  describe('getHomeRegion', () => {
    it('should return us-west-2 as home region', () => {
      expect(getHomeRegion()).toBe('us-west-2');
    });

    it('should consistently return the same value', () => {
      const first = getHomeRegion();
      const second = getHomeRegion();
      expect(first).toBe(second);
    });

    it('should return primary region of us1 group', () => {
      const homeRegion = getHomeRegion();
      const us1Primary = getPrimaryRegionByRegionGroup('us1');
      expect(homeRegion).toBe(us1Primary);
    });
  });

  describe('region group structure', () => {
    it('should have primary region as first element in each group', () => {
      const us1Regions = getRegionsByRegionGroup('us1');
      const ap1Regions = getRegionsByRegionGroup('ap1');
      const eu1Regions = getRegionsByRegionGroup('eu1');

      expect(us1Regions[0]).toBe(getPrimaryRegionByRegionGroup('us1'));
      expect(ap1Regions[0]).toBe(getPrimaryRegionByRegionGroup('ap1'));
      expect(eu1Regions[0]).toBe(getPrimaryRegionByRegionGroup('eu1'));
    });

    it('should have at least one region in each group', () => {
      const us1Regions = getRegionsByRegionGroup('us1');
      const ap1Regions = getRegionsByRegionGroup('ap1');
      const eu1Regions = getRegionsByRegionGroup('eu1');

      expect(us1Regions.length).toBeGreaterThan(0);
      expect(ap1Regions.length).toBeGreaterThan(0);
      expect(eu1Regions.length).toBeGreaterThan(0);
    });
  });
});
