import { describe, expect, test, vi } from 'vitest';
import { checkDeployment } from './deploy.ts';
import { App } from 'sst/constructs';

describe('deploy helpers', () => {
  describe('checkDeployment', () => {
    test('should skip deployment in non-home region', () => {
      const mockApp = { region: 'us-west-1' }; // Secondary region, not home

      const processSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((number) => {
          throw new Error('process exit: ' + number);
        });

      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      expect(() =>
        checkDeployment(mockApp as App, { type: 'home-region-only' })
      ).toThrowError('process exit: 0');

      // Verify that the process exits and the correct message is logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Skipping deployment in ${mockApp.region} region. Only home region (us-west-2) is allowed.`
      );

      consoleLogSpy.mockRestore();
      processSpy.mockRestore();
    });

    test('should allow deployment for multi-region', () => {
      const mockApp = { region: 'us-west-2' }; // Home region

      const processSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation((number) => {
          throw new Error('process exit: ' + number);
        });

      checkDeployment(mockApp as App, { type: 'multi-region' });

      expect(processSpy).not.toHaveBeenCalled();

      processSpy.mockRestore();
    });
  });
});
