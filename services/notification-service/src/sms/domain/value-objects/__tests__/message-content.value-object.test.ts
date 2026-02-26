import { MessageContent } from '../message-content.value-object';

describe('MessageContent Value Object', () => {
    describe('create', () => {
        it('should create valid GSM-7 content', () => {
            const content = MessageContent.create('Hello World');
            expect(content.getValue()).toBe('Hello World');
            expect(content.getEncoding()).toBe('GSM-7');
            expect(content.getSegmentCount()).toBe(1);
        });

        it('should create valid UCS-2 content', () => {
            const content = MessageContent.create('Hello 🌍');
            expect(content.getValue()).toBe('Hello 🌍');
            expect(content.getEncoding()).toBe('UCS-2');
        });

        it('should sanitize input', () => {
            const content = MessageContent.create('  Hello   World  ');
            expect(content.getValue()).toBe('Hello World');
        });

        it('should throw for empty content', () => {
            expect(() => MessageContent.create('')).toThrow('Message content cannot be empty');
        });

        it('should throw for too long content', () => {
            const longText = 'a'.repeat(2000);
            expect(() => MessageContent.create(longText)).toThrow('Message too long');
        });
    });

    describe('segments', () => {
        it('should calculate segments for GSM-7', () => {
            const single = MessageContent.create('a'.repeat(160));
            expect(single.getSegmentCount()).toBe(1);

            const multi = MessageContent.create('a'.repeat(161));
            expect(multi.getSegmentCount()).toBe(2);
        });

        it('should calculate segments for UCS-2', () => {
            // Extended char that forces UCS-2 but fits in 1 char length in JS string
            const emoji = '👋';
            const single = MessageContent.create(emoji.repeat(35)); // 70 chars max for single? verify logic
            // Logic says <= 70 return 1. 2 chars per emoji usually? 
            // In JS '👋'.length is 2. So 35 * 2 = 70.
            expect(single.getSegmentCount()).toBe(1);

            const multi = MessageContent.create(emoji.repeat(36)); // 72 chars
            expect(multi.getSegmentCount()).toBe(2);
        });
    });

    describe('effective length', () => {
        it('should count extended GSM-7 chars as 2', () => {
            const content = MessageContent.create('Hello |'); // | is extended
            // Length: 5 + 1 + 1 = 7. Effective: 5 + 1 + 2 = 8.
            expect(content.getLength()).toBe(7);
            expect(content.getEffectiveLength()).toBe(8);
        });
    });
});
