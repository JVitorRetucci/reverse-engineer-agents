import { CriticalError } from "./CriticalError";
import { NotFoundError } from "./NotFoundError";
import { ValidationError } from "./ValidationError";

export type ApplicationError = 
  CriticalError | 
  NotFoundError | 
  ValidationError;
