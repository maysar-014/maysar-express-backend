export class InventoryLevel {
  constructor(
    public readonly current: number,
    public readonly minimum: number,
    public readonly maximum?: number
  ) {}
}

export class ReorderPoint {
  constructor(
    public readonly value: number,
    public readonly threshold: number
  ) {}
}

export class SafetyStock {
  constructor(
    public readonly current: number,
    public readonly minimum: number
  ) {}
}

export class InventoryTurnover {
  constructor(
    public readonly ratio: number,
    public readonly targetRatio: number
  ) {}
}
