import { ChakraLink } from 'ui';
import { Link } from '@tanstack/react-router';
import React from 'react';

interface CustomLinkProps extends React.PropsWithChildren {
  to: string;
}

export function CustomLink({ to, children, ...props }: CustomLinkProps) {
  return (
    <ChakraLink asChild {...props}>
      <Link to={to} preload="intent">
        {children}
      </Link>
    </ChakraLink>
  );
}
