import {
  ActionIcon,
  Badge,
  Card,
  Center,
  Flex,
  Group,
  Image,
  Loader,
  MediaQuery,
  ScrollArea,
  Stack,
  Text,
  Title,
  createStyles,
} from '@mantine/core';
import { IconClock, IconRefresh, IconRss } from '@tabler/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';

import { z } from 'zod';
import { RouterOutputs, api } from '~/utils/api';
import { createWidgetComponent, defineWidget, widgetOption } from '../common/definition';

const definition = defineWidget({
  sort: 'rss',
  icon: IconRss,
  options: {
    rssFeedUrl: widgetOption.multipleText(z.array(z.string()), {
      defaultValue: [] as string[],
    }),
    refreshInterval: widgetOption.slider(z.number().min(15).max(300).step(15), {
      defaultValue: 30,
    }),
  },
  gridstack: {
    minWidth: 2,
    minHeight: 2,
    maxWidth: 12,
    maxHeight: 12,
  },
});

const RssWidget = createWidgetComponent(definition, ({ options }) => {
  const { t } = useTranslation('modules/rss');
  const { data, isLoading, isFetching, isError, refetch } = useGetRssFeeds(
    options.rssFeedUrl,
    options.refreshInterval
  );

  if (!data || isLoading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  if (data.length < 1 || !data[0].feed || isError) {
    return (
      <Center h="100%">
        <Stack align="center">
          <IconRss size={40} strokeWidth={1} />
          <Title order={6}>{t('descriptor.card.errors.general.title')}</Title>
          <Text align="center">{t('descriptor.card.errors.general.text')}</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack h="100%">
      <ScrollArea className="scroll-area-w100" w="100%" mt="sm" mb="sm">
        {data.map((feed, index) => (
          <Feed key={index} feed={feed} />
        ))}
      </ScrollArea>

      <ActionIcon
        size="sm"
        radius="xl"
        pos="absolute"
        right={10}
        onClick={() => refetch()}
        bottom={10}
        styles={{
          root: {
            borderColor: 'red',
          },
        }}
      >
        {isFetching ? <Loader /> : <IconRefresh />}
      </ActionIcon>
    </Stack>
  );
});

interface FeedProps {
  feed: RouterOutputs['rss']['all'][number];
}

const Feed = ({ feed }: FeedProps) => {
  const { classes } = useStyles();

  if (!feed.success) return null;

  return (
    <Stack w="100%" spacing="xs">
      {feed.feed.items.map((item, index: number) => (
        <Card
          key={index}
          withBorder
          component={Link ?? 'div'}
          href={item.link}
          radius="md"
          target="_blank"
          w="100%"
        >
          {item.enclosure && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={classes.backgroundImage}
              src={item.enclosure.url ?? undefined}
              alt="backdrop"
            />
          )}

          <Flex gap="xs">
            {item.enclosure && (
              <MediaQuery query="(max-width: 1200px)" styles={{ display: 'none' }}>
                <Image
                  src={item.enclosure.url ?? undefined}
                  width={140}
                  height={140}
                  radius="md"
                  withPlaceholder
                />
              </MediaQuery>
            )}
            <Flex gap={2} direction="column" w="100%">
              {item.categories && (
                <Flex gap="xs" wrap="wrap" h={20} style={{ overflow: 'hidden' }}>
                  {item.categories.map((category: any, categoryIndex: number) => (
                    <Badge key={categoryIndex}>{category}</Badge>
                  ))}
                </Flex>
              )}

              <Text lineClamp={2}>{item.title}</Text>
              <Text color="dimmed" size="xs" lineClamp={3}>
                {item.content}
              </Text>

              {item.pubDate && (
                <InfoDisplay title={feed.feed.title} date={formatDate(item.pubDate)} />
              )}
            </Flex>
          </Flex>
        </Card>
      ))}
    </Stack>
  );
};

const InfoDisplay = ({ date, title }: { date: string; title: string | undefined }) => (
  <Group mt="auto" spacing="xs">
    <IconClock size={14} />
    <Text size="xs" color="dimmed">
      {date}
    </Text>
    {title && (
      <Badge variant="outline" size="xs">
        {title}
      </Badge>
    )}
  </Group>
);

export const useGetRssFeeds = (feedUrls: string[], refreshInterval: number) =>
  api.rss.all.useQuery(
    {
      urls: feedUrls,
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      staleTime: 1000 * 60 * refreshInterval,
    }
  );

function formatDate(input: string): string {
  // Parse the input date as a local date
  try {
    const inputDate = dayjs(new Date(input));
    const now = dayjs(); // Current date and time
    const difference = now.diff(inputDate, 'ms');
    const duration = dayjs.duration(difference, 'ms');
    const humanizedDuration = duration.humanize();
    return `${humanizedDuration} ago`;
  } catch (e) {
    return 'Error';
  }
}

const useStyles = createStyles(({ colorScheme }) => ({
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    filter: colorScheme === 'dark' ? 'blur(30px)' : 'blur(15px)',
    transform: 'scaleX(-1)',
    opacity: colorScheme === 'dark' ? 0.3 : 0.2,
    transition: 'ease-in-out 0.2s',

    '&:hover': {
      opacity: colorScheme === 'dark' ? 0.4 : 0.3,
      filter: 'blur(40px) brightness(0.7)',
    },
  },
}));

export default RssWidget;
