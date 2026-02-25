export class Lesson {
  constructor(
    public readonly id: string,
    public readonly courseId: string,
    public readonly title: string,
    public readonly content: string,
    public readonly order: number
  ) {}
}