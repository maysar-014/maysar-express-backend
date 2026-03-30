import { Request, Response } from 'express';

type CourseExecutor = {
  execute: (...args: unknown[]) => Promise<unknown> | unknown;
};

export class CourseController {
  constructor(
    private readonly createCourseUseCase?: CourseExecutor,
    private readonly enrollUserUseCase?: CourseExecutor
  ) {}

  async getCourses(req: Request, res: Response): Promise<void> {
    res.json({ courses: [] });
  }

  async getCourse(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    res.json({ course: { id } });
  }

  async createCourse(req: Request, res: Response): Promise<void> {
    res.status(201).json({ success: true });
  }

  async create(req: Request, res: Response): Promise<void> {
    if (this.createCourseUseCase) {
      const result = await this.createCourseUseCase.execute(req.body);
      res.status(201).json(result ?? { success: true });
      return;
    }

    await this.createCourse(req, res);
  }

  async updateCourse(req: Request, res: Response): Promise<void> {
    res.json({ success: true });
  }

  async enroll(req: Request, res: Response): Promise<void> {
    if (this.enrollUserUseCase) {
      const result = await this.enrollUserUseCase.execute(req.params.id, req.body?.studentId);
      res.status(200).json(result ?? { success: true });
      return;
    }

    res.status(200).json({ success: true });
  }

  async deleteCourse(req: Request, res: Response): Promise<void> {
    res.status(204).send();
  }
}
