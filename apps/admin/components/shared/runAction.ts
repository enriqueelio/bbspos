export function runAction(
  fn: () => Promise<void>,
  onError: (msg: string) => void,
) {
  fn().catch((e) =>
    onError(e instanceof Error ? e.message : "Ocurrió un error."),
  );
}