/// <reference types="vite/client" />
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import { Box, Container, UIProvider } from '@lib/ui';
import React from 'react';
import { Header } from '~/components/Header';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: React.PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <HeadContent />
      </head>
      <body>
        <UIProvider>
          <Box minH="100vh">
            <Header />
            <Container maxW="container.xl" py={8}>
              {children}
            </Container>
          </Box>
        </UIProvider>

        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
