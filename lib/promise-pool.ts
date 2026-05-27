/** Run async tasks with a max concurrency (avoids API rate limits). */
export async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, concurrency);
  let index = 0;

  async function next(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    await worker(items[i], i);
    await next();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
}
