import { createFileRoute } from '@tanstack/react-router';
import {
  Badge,
  Box,
  Button,
  Card,
  HStack,
  Heading,
  Highlight,
  Mark,
  Separator,
  SimpleGrid,
  Stack,
  Stat,
  Tag,
  Text,
  Timeline,
  VStack,
} from '@lib/ui';
import z from 'zod';

export const Route = createFileRoute('/')({
  validateSearch: z.object({
    count: z.number().optional(),
  }),
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: 'Home - TanStack Start + Chakra UI',
      },
      {
        name: 'description',
        content:
          'A modern React application built with TanStack Start, TanStack Router, and Chakra UI v3. Featuring SSR, type-safe routing, and beautiful components.',
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <Box as="main" id="main-content">
      <Stack gap={8}>
        {/* Hero Section with Highlight */}
        <Box as="section" aria-labelledby="hero-heading">
          <VStack gap={4} textAlign="center" py={12}>
            <Badge colorPalette="purple" size="lg">
              TanStack Start + Chakra UI
            </Badge>
            <Heading as="h1" id="hero-heading" size="4xl" lineHeight="tall">
              <Highlight
                query={['Modern', 'React']}
                styles={{ px: '2', bg: 'purple.subtle', color: 'purple.fg' }}
              >
                Welcome to Modern React Development
              </Highlight>
            </Heading>
            <Text fontSize="xl" color="gray.700" maxW="2xl">
              A modern React application built with{' '}
              <Mark bg="blue.subtle" color="blue.fg" px="1">
                TanStack Start
              </Mark>
              ,{' '}
              <Mark bg="teal.subtle" color="teal.fg" px="1">
                TanStack Router
              </Mark>
              , and{' '}
              <Mark bg="green.subtle" color="green.fg" px="1">
                Chakra UI v3
              </Mark>
              . Featuring SSR, type-safe routing, and beautiful components.
            </Text>
            <HStack gap={4} pt={4}>
              <Button colorPalette="blue" size="lg" asChild>
                <a href="#features">Get Started</a>
              </Button>
              <Button variant="outline" colorPalette="blue" size="lg" asChild>
                <a href="/about">Learn More</a>
              </Button>
            </HStack>
          </VStack>
        </Box>

        <Separator />

        {/* Statistics Section */}
        <Box as="section" aria-labelledby="stats-heading" py={8}>
          <Heading
            as="h2"
            id="stats-heading"
            size="2xl"
            mb={6}
            textAlign="center"
          >
            Project Statistics
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
            <Card.Root>
              <Card.Body>
                <Stat.Root>
                  <Stat.Label>Total Downloads</Stat.Label>
                  <Stat.ValueText fontSize="3xl" fontWeight="bold">
                    192.1k
                  </Stat.ValueText>
                  <Stat.HelpText color="gray.700">
                    <Stat.UpIndicator />
                    23.36% from last month
                  </Stat.HelpText>
                </Stat.Root>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body>
                <Stat.Root>
                  <Stat.Label>Active Users</Stat.Label>
                  <Stat.ValueText fontSize="3xl" fontWeight="bold">
                    45.2k
                  </Stat.ValueText>
                  <Stat.HelpText color="gray.700">
                    <Stat.UpIndicator />
                    12.5% from last month
                  </Stat.HelpText>
                </Stat.Root>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body>
                <Stat.Root>
                  <Stat.Label>Response Time</Stat.Label>
                  <Stat.ValueText fontSize="3xl" fontWeight="bold">
                    58 <Stat.ValueUnit>ms</Stat.ValueUnit>
                  </Stat.ValueText>
                  <Stat.HelpText color="gray.700">
                    <Stat.DownIndicator />
                    15% faster
                  </Stat.HelpText>
                </Stat.Root>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body>
                <Stat.Root>
                  <Stat.Label>Build Time</Stat.Label>
                  <Stat.ValueText fontSize="3xl" fontWeight="bold">
                    2.3 <Stat.ValueUnit>sec</Stat.ValueUnit>
                  </Stat.ValueText>
                  <Stat.HelpText color="gray.700">
                    <Stat.DownIndicator />
                    8.2% from last build
                  </Stat.HelpText>
                </Stat.Root>
              </Card.Body>
            </Card.Root>
          </SimpleGrid>
        </Box>

        <Separator />

        {/* Features Section with Tags */}
        <Box as="section" aria-labelledby="features-heading" id="features">
          <Heading
            as="h2"
            id="features-heading"
            size="2xl"
            mb={6}
            textAlign="center"
          >
            Features
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            <Card.Root>
              <Card.Body>
                <HStack mb={3}>
                  <Heading as="h3" size="lg" aria-label="TanStack Start">
                    🚀 TanStack Start
                  </Heading>
                  <Tag.Root colorPalette="purple" size="sm">
                    <Tag.Label>New</Tag.Label>
                  </Tag.Root>
                </HStack>
                <Text color="gray.700" mb={3}>
                  Full-stack React framework with server-side rendering,
                  streaming, and progressive enhancement built-in.
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>SSR</Tag.Label>
                  </Tag.Root>
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>Streaming</Tag.Label>
                  </Tag.Root>
                </HStack>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body>
                <HStack mb={3}>
                  <Heading as="h3" size="lg" aria-label="Chakra UI v3">
                    🎨 Chakra UI v3
                  </Heading>
                  <Tag.Root colorPalette="green" size="sm">
                    <Tag.Label>Stable</Tag.Label>
                  </Tag.Root>
                </HStack>
                <Text color="gray.700" mb={3}>
                  Beautiful, accessible component library with dark mode support
                  and powerful theming capabilities.
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>Accessible</Tag.Label>
                  </Tag.Root>
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>Themeable</Tag.Label>
                  </Tag.Root>
                </HStack>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body>
                <HStack mb={3}>
                  <Heading as="h3" size="lg" aria-label="Type-Safe">
                    🔒 Type-Safe
                  </Heading>
                  <Tag.Root colorPalette="blue" size="sm">
                    <Tag.Label>TypeScript</Tag.Label>
                  </Tag.Root>
                </HStack>
                <Text color="gray.700" mb={3}>
                  Full TypeScript support with type-safe routing, search params,
                  and API endpoints.
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>Type Safety</Tag.Label>
                  </Tag.Root>
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>IntelliSense</Tag.Label>
                  </Tag.Root>
                </HStack>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body>
                <HStack mb={3}>
                  <Heading as="h3" size="lg" aria-label="Fast">
                    ⚡ Fast
                  </Heading>
                  <Tag.Root colorPalette="orange" size="sm">
                    <Tag.Label>Optimized</Tag.Label>
                  </Tag.Root>
                </HStack>
                <Text color="gray.700" mb={3}>
                  Optimized builds with Vite, automatic code splitting, and
                  efficient hot module replacement.
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>Vite</Tag.Label>
                  </Tag.Root>
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>HMR</Tag.Label>
                  </Tag.Root>
                </HStack>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body>
                <HStack mb={3}>
                  <Heading as="h3" size="lg" aria-label="Monorepo">
                    📦 Monorepo
                  </Heading>
                  <Tag.Root colorPalette="pink" size="sm">
                    <Tag.Label>Turborepo</Tag.Label>
                  </Tag.Root>
                </HStack>
                <Text color="gray.700" mb={3}>
                  Organized with Turborepo for fast builds, shared
                  configurations, and reusable packages.
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>Scalable</Tag.Label>
                  </Tag.Root>
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>Shared</Tag.Label>
                  </Tag.Root>
                </HStack>
              </Card.Body>
            </Card.Root>

            <Card.Root>
              <Card.Body>
                <HStack mb={3}>
                  <Heading as="h3" size="lg" aria-label="Quality">
                    ✅ Quality
                  </Heading>
                  <Tag.Root colorPalette="teal" size="sm">
                    <Tag.Label>Best Practices</Tag.Label>
                  </Tag.Root>
                </HStack>
                <Text color="gray.700" mb={3}>
                  ESLint with TanStack config, TypeScript strict mode, and
                  modern development practices.
                </Text>
                <HStack gap={2} flexWrap="wrap">
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>ESLint</Tag.Label>
                  </Tag.Root>
                  <Tag.Root size="sm" variant="outline">
                    <Tag.Label>Strict Mode</Tag.Label>
                  </Tag.Root>
                </HStack>
              </Card.Body>
            </Card.Root>
          </SimpleGrid>
        </Box>

        <Separator />

        {/* Project Timeline */}
        <Box as="section" aria-labelledby="timeline-heading" py={8}>
          <Heading
            as="h2"
            id="timeline-heading"
            size="2xl"
            mb={6}
            textAlign="center"
          >
            Project Timeline
          </Heading>
          <Box maxW="2xl" mx="auto">
            <Timeline.Root>
              <Timeline.Item>
                <Timeline.Connector>
                  <Timeline.Separator />
                  <Timeline.Indicator />
                </Timeline.Connector>
                <Timeline.Content>
                  <Timeline.Title>Project Initialized</Timeline.Title>
                  <Timeline.Description>Dec 2024</Timeline.Description>
                  <Text textStyle="sm" color="gray.700" mt={2}>
                    Set up the monorepo structure with Turborepo, configured
                    TanStack Start, and integrated Chakra UI v3.
                  </Text>
                </Timeline.Content>
              </Timeline.Item>

              <Timeline.Item>
                <Timeline.Connector>
                  <Timeline.Separator />
                  <Timeline.Indicator />
                </Timeline.Connector>
                <Timeline.Content>
                  <Timeline.Title>Core Features Added</Timeline.Title>
                  <Timeline.Description>Dec 2024</Timeline.Description>
                  <Text textStyle="sm" color="gray.700" mt={2}>
                    Implemented routing with TanStack Router, added shared UI
                    package, and configured TypeScript.
                  </Text>
                </Timeline.Content>
              </Timeline.Item>

              <Timeline.Item>
                <Timeline.Connector>
                  <Timeline.Separator />
                  <Timeline.Indicator />
                </Timeline.Connector>
                <Timeline.Content>
                  <Timeline.Title>Enhanced UI Components</Timeline.Title>
                  <Timeline.Description>Dec 2024</Timeline.Description>
                  <Text textStyle="sm" color="gray.700" mt={2}>
                    Added Statistics, Timeline, Tags, Highlights, and other
                    Chakra UI components to showcase the library&apos;s
                    capabilities.
                  </Text>
                </Timeline.Content>
              </Timeline.Item>
            </Timeline.Root>
          </Box>
        </Box>

        <Separator />

        {/* Tech Stack Section */}
        <Box
          as="section"
          aria-labelledby="tech-stack-heading"
          bg="gray.50"
          p={8}
          borderRadius="lg"
        >
          <Heading
            as="h2"
            id="tech-stack-heading"
            size="xl"
            mb={4}
            textAlign="center"
          >
            Tech Stack
          </Heading>
          <HStack justify="center" gap={3} flexWrap="wrap">
            <Badge colorPalette="blue" size="lg">
              React 19
            </Badge>
            <Badge colorPalette="purple" size="lg">
              TanStack Start
            </Badge>
            <Badge colorPalette="teal" size="lg">
              TanStack Router
            </Badge>
            <Badge colorPalette="green" size="lg">
              Chakra UI v3
            </Badge>
            <Badge colorPalette="blue" size="lg">
              TypeScript
            </Badge>
            <Badge colorPalette="orange" size="lg">
              Vite
            </Badge>
            <Badge colorPalette="pink" size="lg">
              pnpm
            </Badge>
            <Badge colorPalette="cyan" size="lg">
              Turborepo
            </Badge>
          </HStack>
        </Box>
      </Stack>
    </Box>
  );
}
