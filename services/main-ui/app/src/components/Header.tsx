import { Box, Flex, HStack } from '@lib/ui';
import { CustomLink } from './CustomLink';

export function Header() {
  return (
    <Box
      as="header"
      bg="blue.500"
      color="white"
      px={4}
      borderBottom="1px solid"
      borderColor="blue.600"
    >
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <HStack as="nav" gap={4} aria-label="Main navigation">
          <CustomLink to="/">Home</CustomLink>
          <CustomLink to="/about">About</CustomLink>
        </HStack>
      </Flex>
    </Box>
  );
}
