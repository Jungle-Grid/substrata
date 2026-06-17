export type AwaitedReturn<T extends (...args: any[]) => unknown> = Awaited<
  ReturnType<T>
>;
