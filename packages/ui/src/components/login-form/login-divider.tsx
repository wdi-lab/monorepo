import type { ReactNode } from 'react';
import { Separator, Flex, Text } from '../../chakra';

export interface LoginDividerProps {
  children?: ReactNode;
  text?: string;
}

export function LoginDivider({
  children,
  text = 'other options',
}: LoginDividerProps) {
  const displayText = children || text;

  return (
    <Flex align="center" gap={8} width="full" py={6}>
      <Separator flex={1} borderColor="border.muted" />
      <Text color="fg.muted" fontSize="sm" fontWeight="medium">
        {displayText}
      </Text>
      <Separator flex={1} borderColor="border.muted" />
    </Flex>
  );
}
