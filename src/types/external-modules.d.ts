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
  export class Registry {
    constructor();
    metrics(): Promise<string>;
    registerMetric(metric: any): void;
    clear(): void;
    getSingleMetric(name: string): any;
    removeSingleMetric(name: string): void;
    getMetricsAsJSON(): any;
    static merge(registers: Registry[]): Registry;
    contentType: string;
  }

  export const register: Registry;

  export function collectDefaultMetrics(config?: any): any;

  export class Counter {
    constructor(config: any);
    inc(labels: any, value?: number): void;
    inc(value?: number): void;
  }

  export class Gauge {
    constructor(config: any);
    set(labels: any, value: number): void;
    set(value: number): void;
    inc(labels: any, value?: number): void;
    inc(value?: number): void;
    dec(labels: any, value?: number): void;
    dec(value?: number): void;
  }

  export class Histogram {
    constructor(config: any);
    observe(labels: any, value: number): void;
    observe(value: number): void;
    startTimer(labels?: any): (labels?: any) => void;
  }

  export class Summary {
    constructor(config: any);
    observe(labels: any, value: number): void;
    observe(value: number): void;
    startTimer(labels?: any): (labels?: any) => void;
  }
}
