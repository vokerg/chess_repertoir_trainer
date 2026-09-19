export async function settlesWithin(
  promise: Promise<unknown>,
  timeoutMs: number,
): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });

  const settled = await Promise.race([
    promise.then(() => true, () => true),
    timeout,
  ]);
  if (timer) clearTimeout(timer);
  return settled;
}
