export type MediaTranscodeStats = {
  TotalFileCount: number;
  TotalTranscodes: number;
  TotalHealthChecks: number;
  FailedTranscodeCount: number;
  FailedHealthCheckCount: number;
  StagedTranscodes: number;
  StagedHealthChecks: number;
}

export type MediaTranscodeWorker = {
  id: string;
  file: string;
  fps: number;
  percentage: number;
  ETA: string;
  jobType: string;
  status: string;
  step: string;
  originalSize: number;
  estimatedSize: number;
  outputSize: number;
}