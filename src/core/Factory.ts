import { IUsecase } from "./Usecase";

type TFactory<T> = () => T;

export type TUsecaseFactory<T extends IUsecase> = TFactory<T>;
