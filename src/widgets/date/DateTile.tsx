import { Stack, Text, Title } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { IconClock } from '@tabler/icons';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useWidgetItemContext } from '~/new-components/dashboard/items/context';
import {
  createWidgetComponent,
  defineWidget,
  widgetOption,
} from '~/new-components/dashboard/items/widget/definition';
import { useSetSafeInterval } from '../../hooks/useSetSafeInterval';

const definition = defineWidget({
  sort: 'date',
  icon: IconClock,
  options: {
    display24HourFormat: widgetOption.switch(z.boolean(), {
      defaultValue: false,
    }),
  },
  gridstack: {
    minWidth: 1,
    minHeight: 1,
    maxWidth: 12,
    maxHeight: 12,
  },
});

const DateWidget = createWidgetComponent(definition, ({ options }) => {
  const { item: widget } = useWidgetItemContext();

  const date = useDateState();
  const { width, height, ref } = useElementSize();

  if (!widget) return null;

  const formatString = options.display24HourFormat ? 'HH:mm' : 'h:mm A';

  return (
    <Stack ref={ref} spacing="xs" justify="space-around" align="center" style={{ height: '100%' }}>
      <Title>{dayjs(date).format(formatString)}</Title>
      {width > 200 && <Text size="lg">{dayjs(date).format('dddd, MMMM D')}</Text>}
    </Stack>
  );
});

/**
 * State which updates when the minute is changing
 * @returns current date updated every new minute
 */
const useDateState = () => {
  const [date, setDate] = useState(new Date());
  const setSafeInterval = useSetSafeInterval();
  const timeoutRef = useRef<NodeJS.Timeout>(); // reference for initial timeout until first minute change
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDate(new Date());
      // Starts intervall which update the date every minute
      setSafeInterval(() => {
        setDate(new Date());
      }, 1000 * 60);
    }, getMsUntilNextMinute());

    return () => timeoutRef.current && clearTimeout(timeoutRef.current);
  }, []);

  return date;
};

// calculates the amount of milliseconds until next minute starts.
const getMsUntilNextMinute = () => {
  const now = new Date();
  const nextMinute = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes() + 1
  );
  return nextMinute.getTime() - now.getTime();
};

export default DateWidget;
