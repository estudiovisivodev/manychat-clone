import { Queue, Worker } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'

/**
 * Build BullMQ connection options from the REDIS_URL env var.
 * We pass a plain options object (not an IORedis instance) to avoid
 * version-mismatch type errors between the top-level `ioredis` package
 * and BullMQ's bundled copy.
 *
 * `maxRetriesPerRequest: null` is required by BullMQ.
 */
function getConnectionOptions(): ConnectionOptions {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379'
  const parsed = new URL(url)
  const isTls = parsed.protocol === 'rediss:'
  return {
    host: parsed.hostname || 'localhost',
    port: parseInt(parsed.port || (isTls ? '6380' : '6379'), 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null,
    ...(isTls ? { tls: {} } : {}),
  }
}

// Queue is created lazily so the Redis connection is not established
// at module load time (prevents crashes when Redis is unavailable).
let _queue: Queue | null = null

export function getWebhookQueue(): Queue {
  if (!_queue) {
    _queue = new Queue('webhook-events', { connection: getConnectionOptions() })
  }
  return _queue
}

/**
 * Proxy object used by the webhook route.
 * Each call tries to add to the queue and surfaces errors to the caller
 * so the route can catch them and still return 200.
 */
export const webhookQueue = {
  add: (name: string, data: unknown, opts?: Parameters<Queue['add']>[2]) => {
    return getWebhookQueue().add(name, data, opts)
  },
}

export function startWorker() {
  const worker = new Worker(
    'webhook-events',
    async (job) => {
      const { processWebhookJob } = await import('./automation-engine')
      await processWebhookJob(job.data)
    },
    { connection: getConnectionOptions(), concurrency: 5 }
  )
  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message)
  })
  return worker
}
