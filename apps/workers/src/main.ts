/**
 * Locore Workers エントリポイント。
 *
 * ARCHITECTURE.md §3.2 / §5 のジョブを BullMQ で処理する。
 * 現在は接続スタブのみ。各ジョブのプロセッサは後続スプリントで追加する。
 */
import IORedis from 'ioredis';
import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

/** 想定キュー一覧。実装は後続。 */
export const queues = {
  algoliaIndex: new Queue('algolia-index', { connection }),
  webPush: new Queue('web-push', { connection }),
  payouts: new Queue('payouts', { connection }),
  fxRates: new Queue('fx-rates', { connection }),
  kycCleanup: new Queue('kyc-cleanup', { connection }),
} as const;

async function main() {
  console.log('[workers] booted; queues:', Object.keys(queues).join(', '));

  // TODO: Worker をここで起動する
  // const worker = new Worker('algolia-index', async (job) => { ... }, { connection });
}

main().catch((err) => {
  console.error('[workers] failed to boot', err);
  process.exit(1);
});
