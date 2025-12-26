import { Box, Heading, Text, VStack } from '../../chakra';

export interface LoginHeaderProps {
  logo?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function LoginHeader({ logo, title, subtitle }: LoginHeaderProps) {
  return (
    <>
      {logo && (
        <Box textAlign="center" mb={2}>
          {logo}
        </Box>
      )}

      {title && (
        <VStack gap={2}>
          <Heading size="2xl" fontWeight="semibold" textAlign="center">
            {title}
          </Heading>
          {subtitle && (
            <Text color="fg.muted" textAlign="center">
              {subtitle}
            </Text>
          )}
        </VStack>
      )}
    </>
  );
}
