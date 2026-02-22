import { NotificationTemplate } from '../notification-template.entity';

describe('NotificationTemplate', () => {
    it('should create template', () => {
        const template = NotificationTemplate.create({
            id: 't1',
            name: 'Welcome',
            type: 'email',
            subject: 'Welcome!',
            body: 'Hello {{name}}'
        });

        expect(template.getId()).toBe('t1');
        expect(template.getName()).toBe('Welcome');
    });

    it('should render template with variables', () => {
        const template = NotificationTemplate.create({
            id: 't1',
            name: 'Welcome',
            type: 'email',
            subject: 'Welcome {{name}}!',
            body: 'Hello {{name}}'
        });

        const rendered = template.render({ name: 'John' });

        expect(rendered.subject).toContain('John');
        expect(rendered.body).toContain('John');
    });
});
