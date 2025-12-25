import { createFileRoute } from '@tanstack/react-router';
import {
  Accordion,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Flex,
  HStack,
  Heading,
  Input,
  Separator,
  SimpleGrid,
  Span,
  Stack,
  Tag,
  Text,
  Textarea,
  VStack,
} from '@lib/ui';
import { useState } from 'react';

export const Route = createFileRoute('/about')({
  component: RouteComponent,
});

function RouteComponent() {
  const [inputValue, setInputValue] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  return (
    <Stack gap={8}>
      {/* Header Section */}
      <VStack align="start" gap={3}>
        <Badge colorPalette="purple" size="lg">
          Chakra UI v3
        </Badge>
        <Heading as="h1" size="3xl">
          About Chakra UI
        </Heading>
        <Text color="gray.600" fontSize="lg">
          A comprehensive showcase of Chakra UI v3 components in TanStack Start
        </Text>
      </VStack>

      {/* Alert Section */}
      {showAlert && (
        <Alert.Root status="success">
          <Alert.Indicator />
          <Alert.Title>Success!</Alert.Title>
          <Alert.Description>
            This is an example alert component from Chakra UI.
          </Alert.Description>
        </Alert.Root>
      )}

      {/* Team Members with Avatars */}
      <Box>
        <Heading as="h2" size="xl" mb={4}>
          Team Members
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Card.Root>
            <Card.Body>
              <HStack gap={4}>
                <Avatar.Root size="lg" colorPalette="blue">
                  <Avatar.Fallback name="John Mason" />
                  <Avatar.Image src="https://i.pravatar.cc/300?u=john" />
                </Avatar.Root>
                <Stack gap={1}>
                  <Text fontWeight="semibold" fontSize="lg">
                    John Mason
                  </Text>
                  <Text color="gray.600" fontSize="sm">
                    john.mason@example.com
                  </Text>
                  <HStack gap={2} mt={1}>
                    <Badge colorPalette="purple" size="sm">
                      Lead Developer
                    </Badge>
                  </HStack>
                </Stack>
              </HStack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <HStack gap={4}>
                <Avatar.Root size="lg" colorPalette="green">
                  <Avatar.Fallback name="Sarah Chen" />
                  <Avatar.Image src="https://i.pravatar.cc/300?u=sarah" />
                </Avatar.Root>
                <Stack gap={1}>
                  <Text fontWeight="semibold" fontSize="lg">
                    Sarah Chen
                  </Text>
                  <Text color="gray.600" fontSize="sm">
                    sarah.chen@example.com
                  </Text>
                  <HStack gap={2} mt={1}>
                    <Badge colorPalette="teal" size="sm">
                      UI Designer
                    </Badge>
                  </HStack>
                </Stack>
              </HStack>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>
      </Box>

      <Separator />

      {/* FAQ with Accordion */}
      <Box>
        <Heading as="h2" size="xl" mb={4}>
          Frequently Asked Questions
        </Heading>
        <Accordion.Root collapsible defaultValue={['faq-1']}>
          <Accordion.Item value="faq-1">
            <Accordion.ItemTrigger>
              <Span flex="1">What is Chakra UI?</Span>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>
              <Accordion.ItemBody>
                Chakra UI is a simple, modular and accessible component library
                that gives you the building blocks to build React applications
                with speed. It follows WAI-ARIA standards and provides a great
                developer experience.
              </Accordion.ItemBody>
            </Accordion.ItemContent>
          </Accordion.Item>

          <Accordion.Item value="faq-2">
            <Accordion.ItemTrigger>
              <Span flex="1">Why use Chakra UI v3?</Span>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>
              <Accordion.ItemBody>
                Chakra UI v3 brings improved performance, better TypeScript
                support, enhanced theming capabilities, and a more flexible
                component composition pattern. It&apos;s built for modern React
                applications and works seamlessly with server-side rendering.
              </Accordion.ItemBody>
            </Accordion.ItemContent>
          </Accordion.Item>

          <Accordion.Item value="faq-3">
            <Accordion.ItemTrigger>
              <Span flex="1">How does it integrate with TanStack Start?</Span>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>
              <Accordion.ItemBody>
                Chakra UI integrates perfectly with TanStack Start through the
                ChakraProvider wrapper. All components support server-side
                rendering out of the box, making it ideal for full-stack React
                applications that need both performance and beautiful UI.
              </Accordion.ItemBody>
            </Accordion.ItemContent>
          </Accordion.Item>

          <Accordion.Item value="faq-4">
            <Accordion.ItemTrigger>
              <Span flex="1">Is it production-ready?</Span>
              <Accordion.ItemIndicator />
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>
              <Accordion.ItemBody>
                Yes! Chakra UI v3 is production-ready and used by thousands of
                companies worldwide. It has comprehensive documentation, active
                community support, and regular updates to ensure stability and
                security.
              </Accordion.ItemBody>
            </Accordion.ItemContent>
          </Accordion.Item>
        </Accordion.Root>
      </Box>

      <Separator />

      {/* Form Components Section */}
      <Box>
        <Heading as="h2" size="xl" mb={4}>
          Try It Out
        </Heading>
        <Card.Root maxW="2xl">
          <Card.Header>
            <Heading as="h3" size="lg">
              Contact Form
            </Heading>
            <Text color="gray.600" fontSize="sm" mt={1}>
              Fill out the form below to see components in action
            </Text>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              <Box>
                <Text mb={2} fontWeight="medium">
                  Name
                </Text>
                <Input
                  placeholder="Enter your name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </Box>
              <Box>
                <Text mb={2} fontWeight="medium">
                  Email
                </Text>
                <Input placeholder="your.email@example.com" type="email" />
              </Box>
              <Box>
                <Text mb={2} fontWeight="medium">
                  Message
                </Text>
                <Textarea placeholder="Enter your message here..." rows={4} />
              </Box>
            </Stack>
          </Card.Body>
          <Card.Footer>
            <Flex justify="space-between" gap={3} w="full">
              <Button
                flex={1}
                colorPalette="blue"
                onClick={() => setShowAlert(true)}
              >
                Submit
              </Button>
              <Button
                flex={1}
                variant="outline"
                onClick={() => {
                  setInputValue('');
                  setShowAlert(false);
                }}
              >
                Reset
              </Button>
            </Flex>
          </Card.Footer>
        </Card.Root>
      </Box>

      <Separator />

      {/* Installation Section */}
      <Box>
        <Heading as="h2" size="xl" mb={4}>
          Getting Started
        </Heading>
        <Card.Root>
          <Card.Body>
            <Stack gap={4}>
              <Box>
                <Text fontWeight="medium" mb={2}>
                  Installation
                </Text>
                <Box bg="gray.100" p={4} borderRadius="md">
                  <Code colorPalette="blue" fontSize="sm">
                    npm install @chakra-ui/react @emotion/react
                  </Code>
                </Box>
              </Box>
              <Box>
                <Text fontWeight="medium" mb={2}>
                  Quick Links
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  <Tag.Root colorPalette="blue" variant="subtle">
                    <Tag.Label>Documentation</Tag.Label>
                  </Tag.Root>
                  <Tag.Root colorPalette="purple" variant="subtle">
                    <Tag.Label>GitHub</Tag.Label>
                  </Tag.Root>
                  <Tag.Root colorPalette="green" variant="subtle">
                    <Tag.Label>Examples</Tag.Label>
                  </Tag.Root>
                  <Tag.Root colorPalette="orange" variant="subtle">
                    <Tag.Label>Community</Tag.Label>
                  </Tag.Root>
                </HStack>
              </Box>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Box>

      {/* Footer Info */}
      <Box pt={4}>
        <Text color="gray.500" fontSize="sm">
          This page demonstrates various Chakra UI components including Avatars,
          Tabs, Accordions, Progress bars, and more. Check out the{' '}
          <Code colorPalette="purple">about.tsx</Code> file to see the
          implementation.
        </Text>
      </Box>
    </Stack>
  );
}
