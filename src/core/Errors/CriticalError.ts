export class CriticalError extends Error {
  readonly error: Error;

  constructor(err: Error, msg?: string) {
    super(msg ?? "A critical error happened");
    this.error = err;
  }
}
