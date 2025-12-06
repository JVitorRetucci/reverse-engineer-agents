export abstract class Node<T> {
  public abstract execute(state: T): T | Promise<T>;
}