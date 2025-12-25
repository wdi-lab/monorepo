import { Button } from 'ui';
import { Link } from '@tanstack/react-router';
import React from 'react';

interface CustomButtonLinkProps extends React.PropsWithChildren {
  to: string;
  search?: Record<string, unknown>;
  colorPalette?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function CustomButtonLink({
  to,
  search,
  children,
  ...props
}: CustomButtonLinkProps) {
  return (
    <Button asChild {...props}>
      <Link to={to} search={search} preload="intent">
        {children}
      </Link>
    </Button>
  );
}
