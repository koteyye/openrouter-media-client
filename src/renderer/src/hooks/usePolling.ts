import { useRef, useCallback } from 'react';
import type { VideoJobStatus } from '../../../shared/ipc-types';

type PollFn = (jobId: string) => Promise<{ success: boolean; data?: VideoJobStatus; error?: string }>;

interface UsePollingOptions {
  pollFn: PollFn;
  interval: number;
  maxAttempts: number;
  onStatus: (status: VideoJobStatus) => void;
  onCompleted: (status: VideoJobStatus) => void;
  onError: (error: string) => void;
}

export function usePolling(opts: UsePollingOptions) {
  const abortedRef = useRef(false);
  const pollingRef = useRef(false);

  const start = useCallback(async (jobId: string) => {
    let networkErrors = 0;
    abortedRef.current = false;
    pollingRef.current = true;
    let finishedTerminally = false;

    for (let attempt = 0; attempt < opts.maxAttempts && !abortedRef.current; attempt++) {
      await new Promise<void>((r) => {
        const t = setTimeout(r, opts.interval);
        if (abortedRef.current) { clearTimeout(t); r(); }
      });
      if (abortedRef.current) break;

      try {
        const result = await opts.pollFn(jobId);
        if (abortedRef.current) break;
        networkErrors = 0;

        if (!result.success) {
          opts.onError(result.error ?? 'Polling failed');
          finishedTerminally = true;
          break;
        }

        const status = result.data!;
        opts.onStatus(status);

        if (status.status === 'completed') {
          opts.onCompleted(status);
          finishedTerminally = true;
          break;
        }
        if (status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
          opts.onError(status.error ?? `Generation ${status.status}`);
          finishedTerminally = true;
          break;
        }
      } catch (err) {
        if (abortedRef.current) break;
        networkErrors++;
        if (networkErrors >= 3) {
          opts.onError((err as Error).message);
          finishedTerminally = true;
          break;
        }
      }
    }

    if (!abortedRef.current && pollingRef.current && !finishedTerminally) {
      opts.onError('Timed out waiting for generation');
    }
    pollingRef.current = false;
  }, [opts]);

  const abort = useCallback(() => {
    abortedRef.current = true;
  }, []);

  return { start, abort };
}
