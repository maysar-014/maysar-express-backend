import { NotificationTemplate } from '../notification-template.entity';

describe('NotificationTemplate', () => {
    it('should create template', () => {
        const template = NotificationTemplate.create({
            id: 't1',
            name: 'Welcome',
            type: 'email',
            channel: 'email',
            subject: 'Welcome!',
            bodyTemplate: 'Hello {{name}}',
            createdBy: 'system'
        });

        expect(template.id).toBe('t1');
        expect(template.name).toBe('Welcome');
    });

    it('should render template with variables', () => {
        const template = NotificationTemplate.create({
            id: 't1',
            name: 'Welcome',
            type: 'email',
            channel: 'email',
            subject: 'Welcome {{name}}!',
            bodyTemplate: 'Hello {{name}}',
            createdBy: 'system'
        });

        const rendered = template.render({ name: 'John' });

        expect(rendered.subject).toContain('John');
        expect(rendered.body).toContain('John');
    });
});
