import { TRPCError } from '@trpc/server';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { getConfig } from '~/tools/config/getConfig';
import { BackendConfigType } from '~/types/config';
import { INotebookWidget } from '~/widgets/notebook/NotebookWidgetTile';

import { createTRPCRouter, publicProcedure } from '../trpc';

export const notebookRouter = createTRPCRouter({
  update: publicProcedure
    .input(z.object({ widgetId: z.string(), content: z.string(), configName: z.string() }))
    .mutation(async ({ input }) => {
      //TODO: #1305 Remove use of DISABLE_EDIT_MODE for auth update
      if (process.env.DISABLE_EDIT_MODE?.toLowerCase() === 'true') {
        throw new TRPCError({
          code: 'METHOD_NOT_SUPPORTED',
          message: 'Edit is not allowed, because edit mode is disabled'
        });
      }

      const config = getConfig(input.configName);
      const widget = config.widgets.find((widget) => widget.id === input.widgetId) as
        | INotebookWidget
        | undefined;

      if (!widget) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Specified widget was not found',
        });
      }

      widget.properties.content = input.content;

      const newConfig: BackendConfigType = {
        ...config,
        widgets: [...config.widgets.filter((w) => w.id !== widget.id), widget],
      };

      const targetPath = path.join('data/configs', `${input.configName}.json`);
      fs.writeFileSync(targetPath, JSON.stringify(newConfig, null, 2), 'utf8');
    }),
});
