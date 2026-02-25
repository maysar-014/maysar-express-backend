export abstract class BaseSaga {
  abstract execute(...args: any[]): Promise<void>;
  abstract compensate(...args: any[]): Promise<void>;
}
