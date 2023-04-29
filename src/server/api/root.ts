import { createTRPCRouter } from '~/server/api/trpc';
import { configRouter } from '~/server/api/routers/config';
import { dockerRouter } from './routers/docker';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  config: configRouter,
  docker: dockerRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
