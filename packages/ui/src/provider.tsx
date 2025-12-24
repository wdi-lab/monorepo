'use client';

import { ChakraProvider, defaultSystem } from './chakra';
import type { SystemContext } from '@chakra-ui/react';

export interface UIProviderProps extends React.PropsWithChildren {
  value?: SystemContext;
}

export function UIProvider(props: UIProviderProps) {
  const { value = defaultSystem, children } = props;
  return <ChakraProvider value={value}>{children}</ChakraProvider>;
}
