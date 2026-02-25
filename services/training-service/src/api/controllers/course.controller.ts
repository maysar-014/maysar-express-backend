import { Request, Response } from 'express';

export class CourseController {
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

  async updateCourse(req: Request, res: Response): Promise<void> {
    res.json({ success: true });
  }

  async deleteCourse(req: Request, res: Response): Promise<void> {
    res.status(204).send();
  }
}