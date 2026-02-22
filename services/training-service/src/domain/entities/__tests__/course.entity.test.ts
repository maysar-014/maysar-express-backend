import { Course } from '../course.entity';

describe('Course', () => {
    it('should create course', () => {
        const course = Course.create({ id: 'c1', title: 'Test Course', instructorId: 'i1' });
        expect(course.getId()).toBe('c1');
    });

    it('should enroll student', () => {
        const course = Course.create({ id: 'c1', title: 'Test', instructorId: 'i1' });
        course.enrollStudent('s1');
        expect(course.getEnrollmentCount()).toBe(1);
    });
});
