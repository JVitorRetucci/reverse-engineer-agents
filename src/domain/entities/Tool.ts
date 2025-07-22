export abstract class Tool<Params = undefined, Response = void> {
  constructor(
    public readonly name: string,
    public readonly description: string
  ){}

  public abstract execute(params: Params): Promise<Response>;
}
