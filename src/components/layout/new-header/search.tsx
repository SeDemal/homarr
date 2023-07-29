import { Autocomplete, Group, Kbd, Text, Tooltip, useMantineTheme } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import {
  IconBrandYoutube,
  IconDownload,
  IconMovie,
  IconSearch,
  IconWorld,
  TablerIconsProps,
} from '@tabler/icons-react';
import { ReactNode, forwardRef, useMemo, useRef, useState } from 'react';
import { useConfigContext } from '~/config/provider';
import { api } from '~/utils/api';

export const Search = () => {
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useHotkeys([['mod+K', () => ref.current?.focus()]]);
  const { data: userWithSettings } = api.user.getWithSettings.useQuery();
  const { config } = useConfigContext();
  const { colors } = useMantineTheme();

  const apps = useConfigApps(search);
  const engines = generateEngines(
    search,
    userWithSettings?.settings.searchTemplate ?? 'https://www.google.com/search?q=%s'
  ).filter(
    (engine) =>
      engine.sort !== 'movie' || config?.apps.some((app) => app.integration.type === engine.value)
  );
  const data = [...engines, ...apps];

  return (
    <Autocomplete
      ref={ref}
      radius="xl"
      w={400}
      variant="filled"
      placeholder="Search..."
      hoverOnSearchChange
      autoFocus={typeof window !== 'undefined' && window.innerWidth > 768}
      rightSection={
        <IconSearch
          onClick={() => ref.current?.focus()}
          color={colors.gray[5]}
          size={16}
          stroke={1.5}
        />
      }
      limit={8}
      value={search}
      onChange={setSearch}
      data={data}
      itemComponent={SearchItemComponent}
      filter={(value, item: SearchAutoCompleteItem) =>
        engines.some((engine) => engine.sort === item.sort) ||
        item.value.toLowerCase().includes(value.trim().toLowerCase())
      }
      classNames={{
        input: 'dashboard-header-search-input',
        root: 'dashboard-header-search-root',
      }}
      onItemSubmit={(item: SearchAutoCompleteItem) => {
        setSearch('');
        if (item.sort === 'movie') {
          // TODO: show movie modal
          console.log('movie');
          return;
        }
        const target = userWithSettings?.settings.openSearchInNewTab ? '_blank' : '_self';
        window.open(item.metaData.url, target);
      }}
      aria-label="Search"
    />
  );
};

const SearchItemComponent = forwardRef<HTMLDivElement, SearchAutoCompleteItem>(
  ({ icon, label, value, sort, ...others }, ref) => {
    let Icon = getItemComponent(icon);

    return (
      <Group ref={ref} noWrap {...others}>
        <Icon size={20} />
        <Text>{label}</Text>
      </Group>
    );
  }
);

const getItemComponent = (icon: SearchAutoCompleteItem['icon']) => {
  if (typeof icon !== 'string') {
    return icon;
  }

  return (props: TablerIconsProps) => (
    <img src={icon} height={props.size} width={props.size} style={{ objectFit: 'contain' }} />
  );
};

const useConfigApps = (search: string) => {
  const { config } = useConfigContext();
  return useMemo(() => {
    if (search.trim().length === 0) return [];
    const apps = config?.apps.filter((app) =>
      app.name.toLowerCase().includes(search.toLowerCase())
    );
    return (
      apps?.map((app) => ({
        icon: app.appearance.iconUrl,
        label: app.name,
        value: app.name,
        sort: 'app',
        metaData: {
          url: app.behaviour.externalUrl,
        },
      })) ?? []
    );
  }, [search, config]);
};

type SearchAutoCompleteItem = {
  icon: ((props: TablerIconsProps) => ReactNode) | string;
  label: string;
  value: string;
} & (
  | {
      sort: 'web' | 'torrent' | 'youtube' | 'app';
      metaData: {
        url: string;
      };
    }
  | {
      sort: 'movie';
    }
);
const movieApps = ['overseerr', 'jellyseerr'] as const;
const generateEngines = (searchValue: string, webTemplate: string) =>
  searchValue.trim().length > 0
    ? ([
        {
          icon: IconWorld,
          label: `Search for ${searchValue} in the web`,
          value: `web`,
          sort: 'web',
          metaData: {
            url: webTemplate.includes('%s')
              ? webTemplate.replace('%s', searchValue)
              : webTemplate + searchValue,
          },
        },
        {
          icon: IconDownload,
          label: `Search for ${searchValue} torrents`,
          value: `torrent`,
          sort: 'torrent',
          metaData: {
            url: `https://www.torrentdownloads.me/search/?search=${searchValue}`,
          },
        },
        {
          icon: IconBrandYoutube,
          label: `Search for ${searchValue} on youtube`,
          value: 'youtube',
          sort: 'youtube',
          metaData: {
            url: `https://www.youtube.com/results?search_query=${searchValue}`,
          },
        },
        ...movieApps.map(
          (name) =>
            ({
              icon: IconMovie,
              label: `Search for ${searchValue} on ${name}`,
              value: name,
              sort: 'movie',
            }) as const
        ),
      ] as const satisfies Readonly<SearchAutoCompleteItem[]>)
    : [];