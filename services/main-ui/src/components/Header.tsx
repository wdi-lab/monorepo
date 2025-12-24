import { Box, Flex, HStack } from 'ui';
import { CustomLink } from './CustomLink';

export function Header() {
  return (
    <Box bg="blue.500" color="white" px={4}>
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <HStack gap={4}>
          <CustomLink to="/">Home</CustomLink>
          <CustomLink to="/about">About</CustomLink>
        </HStack>
      </Flex>
    </Box>
  );
}
