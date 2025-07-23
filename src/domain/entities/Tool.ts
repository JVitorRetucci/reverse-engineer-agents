import { AutoMap } from "@automapper/classes";

export abstract class Tool<Params = undefined, Response = void> {
  @AutoMap()
  public name: string;

  @AutoMap()
  public description: string;

  public abstract execute(params: Params): Promise<Response>;

  constructor(
    name: string,
    description: string
  ){
    this.name = name;
    this.description = description;
  }
}
