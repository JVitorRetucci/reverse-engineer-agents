export class NotFoundError extends Error {
  readonly error: Error;

  constructor(err: Error, msg?: string) {
    super(msg ?? "Resource not found");
    this.error = err;
  }
}
