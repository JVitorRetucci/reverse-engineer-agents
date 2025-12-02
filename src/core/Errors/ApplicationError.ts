import { CriticalError } from "./CriticalError.js";
import { NotFoundError } from "./NotFoundError.js";
import { ValidationError } from "./ValidationError.js";

export type ApplicationError = 
  CriticalError | 
  NotFoundError | 
  ValidationError;
