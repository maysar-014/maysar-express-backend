export interface CourseProps {
  id: string;
  title: string;
  instructorId?: string;
  capacity?: number;
  enrolled?: number;
  prerequisites?: string[];
}

export class Course {
  public readonly id: string;
  public readonly title: string;
  public readonly instructorId?: string;
  public readonly capacity: number;
  public readonly prerequisites: string[];

  private enrollmentCount: number;

  constructor(id: string, title: string, capacity: number, enrolled: number, prerequisites: string[]);
  constructor(props: CourseProps);
  constructor(
    idOrProps: string | CourseProps,
    title?: string,
    capacity = 0,
    enrolled = 0,
    prerequisites: string[] = []
  ) {
    if (typeof idOrProps === 'object') {
      this.id = idOrProps.id;
      this.title = idOrProps.title;
      this.instructorId = idOrProps.instructorId;
      this.capacity = idOrProps.capacity ?? 0;
      this.enrollmentCount = idOrProps.enrolled ?? 0;
      this.prerequisites = [...(idOrProps.prerequisites ?? [])];
      return;
    }

    this.id = idOrProps;
    this.title = title ?? '';
    this.capacity = capacity;
    this.enrollmentCount = enrolled;
    this.prerequisites = [...prerequisites];
  }

  static create(props: CourseProps): Course {
    return new Course(props);
  }

  getId(): string {
    return this.id;
  }

  enrollStudent(_studentId: string): void {
    if (this.capacity > 0 && this.enrollmentCount >= this.capacity) {
      return;
    }

    this.enrollmentCount += 1;
  }

  getEnrollmentCount(): number {
    return this.enrollmentCount;
  }
}
