import { ChakraLink } from '@lib/ui';
import { Link } from '@tanstack/react-router';
import React from 'react';

interface CustomLinkProps extends React.PropsWithChildren {
  to: string;
}

export function CustomLink({ to, children, ...props }: CustomLinkProps) {
  return (
    <ChakraLink
      asChild
      color="white"
      fontWeight="medium"
      _hover={{ textDecoration: 'underline' }}
      {...props}
    >
      <Link to={to} preload="intent">
        {children}
      </Link>
    </ChakraLink>
  );
}
