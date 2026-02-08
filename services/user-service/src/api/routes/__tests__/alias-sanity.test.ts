import { UserController } from '@api/controllers/user.controller';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case';

describe('Alias Sanity Check', () => {
    it('should resolve @api and @application aliases', () => {
        expect(UserController).toBeDefined();
        expect(CreateUserUseCase).toBeDefined();
    });
});
