import { AutoMap } from "@automapper/classes";
import { Tool } from "./Tool";

export class Agent {
  @AutoMap()
  public id: string;

  @AutoMap()
  public profileDescription?: string;

  @AutoMap()
  public taskDescription?: string;

  @AutoMap()
  public context?: string;

  @AutoMap()
  public fewShot?: string;

  @AutoMap(() => Array<Tool>)
  public tools: Tool[];

  constructor(
    id: string,
    tools: Tool[] = [],
    profileDescription?: string,
    taskDescription?: string,
    context?: string,
    fewShot?: string
  ) {
    this.id = id;
    this.tools = tools;
    this.profileDescription = profileDescription;
    this.taskDescription = taskDescription;
    this.context = context;
    this.fewShot = fewShot;
  }
}
