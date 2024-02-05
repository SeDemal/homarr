import axios from "axios";
import { z } from "zod";
import { checkIntegrationsType } from "~/tools/client/app-properties";
import { getConfig } from "~/tools/config/getConfig";
import { MediaTranscodeStats, MediaTranscodeWorker } from "~/widgets/media-transcode/media-transcode-types";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const mediaTranscodeRouter = createTRPCRouter({
  status: publicProcedure
    .input(
      z.object({
        configName: z.string(),
      })
    )
    .query(async ({ input }) => {
      const config = getConfig(input.configName);

      const app = config.apps.find((app) =>
        checkIntegrationsType(app.integration, ['tdarr'])
      )!;

      const appUrl = new URL("api/v2/cruddb", app.url);
      const body = {
        data: {
          collection: 'StatisticsJSONDB',
          mode: 'getById',
          docID: 'statistics',
        },
      }

      const response = await axios.post(appUrl.toString(), body)
        .then((res) => {
          return {
            TotalFileCount: res.data.totalFileCount,
            TotalTranscodes: res.data.totalTranscodeCount,
            TotalHealthChecks: res.data.totalHealthCheckCount,
            FailedTranscodeCount: res.data.table3Count,
            FailedHealthCheckCount: res.data.table6Count,
            StagedTranscodes: res.data.table1Count,
            StagedHealthChecks: res.data.table4Count,
          } as MediaTranscodeStats
        })
        .catch((err) => err)

      return response;
    }),

    workers: publicProcedure
    .input(
      z.object({
        configName: z.string(),
      })
    )
    .query(async ({ input }) => {
      const config = getConfig(input.configName);

      const app = config.apps.find((app) =>
        checkIntegrationsType(app.integration, ['tdarr'])
      )!;

      const appUrl = new URL("api/v2/get-nodes", app.url);

      const response = await axios.get(appUrl.toString())
        .then((res) => {
          const nodes = new Map<string, any>();
          for (var node in res.data) {
            nodes.set(node, res.data[node]);
          }
          const allWorkers: MediaTranscodeWorker[] = [];
          nodes.forEach((node) => {
            const workers = new Map<string, any>();
            for (var worker in node.workers) {
              workers.set(worker, node.workers[worker]);
            }
            workers.forEach((worker) => {
              console.log(worker)
              allWorkers.push({
                id: worker._id,
                file: worker.file.split('\\').pop().split('/').pop(),
                fps: worker.fps,
                percentage: worker.percentage,
                ETA: worker.ETA,
                jobType: worker.job.type,
                status: worker.status,
                step: worker.lastPluginDetails?.number ?? "",
                originalSize: worker.originalfileSizeInGbytes,
                estimatedSize: worker.estSize,
                outputSize: worker.outputFileSizeInGbytes,
              } as MediaTranscodeWorker)
            })
          })
          return allWorkers;
        })
        .catch((err) => err);
      return response;
    })
})