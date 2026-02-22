import { Lesson } from '../lesson.entity';

describe('Lesson', () => {
    it('should create lesson', () => {
        const lesson = Lesson.create({ id: 'l1', title: 'Intro', courseId: 'c1', content: 'Content' });
        expect(lesson.getId()).toBe('l1');
    });

    it('should mark as completed', () => {
        const lesson = Lesson.create({ id: 'l1', title: 'Intro', courseId: 'c1', content: 'Content' });
        lesson.markCompleted('s1');
        expect(lesson.isCompletedBy('s1')).toBe(true);
    });
});
