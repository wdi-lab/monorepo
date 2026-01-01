import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { VisibleError } from 'sst/error.js';
import { validateServiceDependency } from './serviceDependency.ts';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('serviceDependency', () => {
  beforeEach(() => {
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/services/consumer');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateServiceDependency', () => {
    it('should throw VisibleError when package.json is missing', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => validateServiceDependency('shared-infra')).toThrow(
        VisibleError
      );
      expect(() => validateServiceDependency('shared-infra')).toThrow(
        'Cannot find package.json'
      );
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join('/mock/services/consumer', 'package.json')
      );
    });

    it('should throw VisibleError when service dependency is missing', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: '@infra/consumer',
          dependencies: {
            '@lib/sst-helpers': 'workspace:*',
          },
        })
      );

      expect(() => validateServiceDependency('shared-infra')).toThrow(
        VisibleError
      );
      expect(() => validateServiceDependency('shared-infra')).toThrow(
        "'@infra/shared-infra' is not listed in package.json"
      );
    });

    it('should succeed when dependency is in dependencies', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: '@infra/consumer',
          dependencies: {
            '@infra/shared-infra': 'workspace:*',
          },
        })
      );

      expect(() => validateServiceDependency('shared-infra')).not.toThrow();
    });

    it('should succeed when dependency is in devDependencies', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: '@infra/consumer',
          devDependencies: {
            '@infra/auth': 'workspace:*',
          },
        })
      );

      expect(() => validateServiceDependency('auth')).not.toThrow();
    });

    it('should check both dependencies and devDependencies', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: '@infra/consumer',
          dependencies: {
            '@infra/shared-infra': 'workspace:*',
          },
          devDependencies: {
            '@infra/auth': 'workspace:*',
          },
        })
      );

      expect(() => validateServiceDependency('shared-infra')).not.toThrow();
      expect(() => validateServiceDependency('auth')).not.toThrow();
    });

    it('should handle missing dependencies field', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: '@infra/consumer',
        })
      );

      expect(() => validateServiceDependency('shared-infra')).toThrow(
        "'@infra/shared-infra' is not listed in package.json"
      );
    });

    it('should handle empty dependencies', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: '@infra/consumer',
          dependencies: {},
          devDependencies: {},
        })
      );

      expect(() => validateServiceDependency('shared-infra')).toThrow(
        "'@infra/shared-infra' is not listed in package.json"
      );
    });
  });
});
