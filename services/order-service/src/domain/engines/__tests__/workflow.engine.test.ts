import { WorkflowEngine, WorkflowInput } from '../workflow.engine';

describe('WorkflowEngine', () => {
    let engine: WorkflowEngine;

    beforeEach(() => {
        engine = new WorkflowEngine();
    });

    const validInput: WorkflowInput = {
        processId: 'proc-123',
        processType: 'order',
        currentState: 'draft',
        event: 'submit',
        triggeredBy: 'user-1',
        context: {
            orderId: 'order-1',
            data: {},
            priority: 'normal',
            timestamp: new Date()
        }
    };

    describe('processWorkflowRequest', () => {
        it('should process valid request successfully', async () => {
            const result = await engine.processWorkflowRequest(validInput);

            expect(result.success).toBe(true);
            expect(result.processId).toBe(validInput.processId);
            expect(result.currentState).toBe('validated');
            expect(result.nextState).toBe('confirmed');
            expect(result.actions).toHaveLength(1);
            expect(result.actions[0].type).toBe('api_call');
            expect(result.notifications).toHaveLength(1);
        });

        it('should return failure if input validation fails', async () => {
            const invalidInput = { ...validInput, processId: '' };
            const result = await engine.processWorkflowRequest(invalidInput);

            expect(result.success).toBe(false);
            expect(result.warnings).toContainEqual(expect.stringContaining('Process ID required'));
        });

        it('should handle multiple validation errors', async () => {
            const invalidInput = { ...validInput, processId: '', processType: '' as any };
            const result = await engine.processWorkflowRequest(invalidInput);

            expect(result.success).toBe(false);
            expect(result.warnings[0]).toContain('Process ID required');
            expect(result.warnings[0]).toContain('Process type required');
        });

        it('should generate notifications with correct priority', async () => {
            const input = {
                ...validInput,
                context: { ...validInput.context, priority: 'high' as const }
            };
            const result = await engine.processWorkflowRequest(input);
            expect(result.notifications[0].priority).toBe('high');
        });
    });
});
