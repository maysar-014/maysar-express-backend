export interface LessonProps {
  id: string;
  courseId: string;
  title: string;
  content: string;
  order?: number;
}

export class Lesson {
  public readonly id: string;
  public readonly courseId: string;
  public readonly title: string;
  public readonly content: string;
  public readonly order: number;

  private readonly completedBy = new Set<string>();

  constructor(id: string, courseId: string, title: string, content: string, order: number);
  constructor(props: LessonProps);
  constructor(
    idOrProps: string | LessonProps,
    courseId?: string,
    title?: string,
    content?: string,
    order = 0
  ) {
    if (typeof idOrProps === 'object') {
      this.id = idOrProps.id;
      this.courseId = idOrProps.courseId;
      this.title = idOrProps.title;
      this.content = idOrProps.content;
      this.order = idOrProps.order ?? 0;
      return;
    }

    this.id = idOrProps;
    this.courseId = courseId ?? '';
    this.title = title ?? '';
    this.content = content ?? '';
    this.order = order;
  }

  static create(props: LessonProps): Lesson {
    return new Lesson(props);
  }

  getId(): string {
    return this.id;
  }

  markCompleted(studentId: string): void {
    this.completedBy.add(studentId);
  }

  isCompletedBy(studentId: string): boolean {
    return this.completedBy.has(studentId);
  }
}
