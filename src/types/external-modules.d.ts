// Type declarations for missing modules
declare module 'express-validator' {
  export function body(...args: any[]): any;
  export function param(...args: any[]): any;
  export function query(...args: any[]): any;
  export function validationResult(req: any): any;
}

declare module 'express-winston' {
  export function logger(options: any): any;
  export function errorLogger(options: any): any;
}

declare module 'prom-client' {
  export class Counter {
    constructor(config: any);
    inc(value?: number): void;
  }
  export class Histogram {
    constructor(config: any);
    observe(value: number): void;
  }
  export class Gauge {
    constructor(config: any);
    set(value: number): void;
  }
  export function register(): any;
}
