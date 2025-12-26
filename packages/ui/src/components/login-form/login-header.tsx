import { Box, Heading, Text, VStack } from '../../chakra';

export interface LoginHeaderProps {
  logo?: React.ReactNode;
  title?: string;
  subtitle?: string;
  showTitle?: boolean;
  showSubtitle?: boolean;
}

export function LoginHeader({
  logo,
  title,
  subtitle,
  showTitle,
  showSubtitle,
}: LoginHeaderProps) {
  return (
    <>
      {logo && (
        <Box textAlign="center" mb={2}>
          {logo}
        </Box>
      )}

      {showTitle && (
        <VStack gap={2}>
          <Heading size="2xl" fontWeight="semibold" textAlign="center">
            {title}
          </Heading>
          {showSubtitle && (
            <Text color="fg.muted" textAlign="center">
              {subtitle}
            </Text>
          )}
        </VStack>
      )}
    </>
  );
}
