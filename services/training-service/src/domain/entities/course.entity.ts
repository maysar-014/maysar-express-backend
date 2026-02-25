export class Course {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly capacity: number,
    public readonly enrolled: number,
    public readonly prerequisites: string[]
  ) {}
}