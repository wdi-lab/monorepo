import { render } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from 'ui';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

// Custom render function that wraps components with ChakraProvider
function customRender(ui: ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
    ),
    ...options,
  });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
