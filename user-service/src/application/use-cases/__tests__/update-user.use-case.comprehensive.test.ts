import { UpdateUserUseCase } from '../update-user.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('UpdateUserUseCase - Comprehensive', () => {
  let sut: UpdateUserUseCase;
  let mockRepo: any;
  let mockPublisher: any;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      getUserPreferences: jest.fn().mockResolvedValue({}),
      updateUserPreferences: jest.fn()
    };
    mockPublisher = { publish: jest.fn() };
    sut = new UpdateUserUseCase(mockRepo, mockPublisher);
  });

  test('updates firstName', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'Old', lastName: 'B', role: UserRole.BUYER });
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.update.mockResolvedValue(user);

    const out = await sut.execute({ userId: 'u1', updates: { firstName: 'New' }, updatedBy: 'u1' });
    
    expect(out.success).toBe(true);
    expect(out.changes).toContain('firstName');
  });

  test('updates lastName', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'Old', role: UserRole.BUYER });
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.update.mockResolvedValue(user);

    const out = await sut.execute({ userId: 'u1', updates: { lastName: 'New' }, updatedBy: 'u1' });
    
    expect(out.success).toBe(true);
    expect(out.changes).toContain('lastName');
  });

  test('updates dateOfBirth', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.update.mockResolvedValue(user);

    const newDob = new Date('1990-01-01');
    const out = await sut.execute({ userId: 'u1', updates: { dateOfBirth: newDob }, updatedBy: 'u1' });
    
    expect(out.success).toBe(true);
    expect(out.changes).toContain('dateOfBirth');
  });

  test('updates language preference', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.update.mockResolvedValue(user);
    mockRepo.updateUserPreferences.mockResolvedValue({});

    const out = await sut.execute({ userId: 'u1', updates: { language: 'sw' }, updatedBy: 'u1' });
    
    expect(out.success).toBe(true);
    expect(out.changes).toContain('preferences');
  });

  test('updates timezone preference', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.update.mockResolvedValue(user);
    mockRepo.updateUserPreferences.mockResolvedValue({});

    const out = await sut.execute({ userId: 'u1', updates: { timezone: 'Africa/Dar_es_Salaam' }, updatedBy: 'u1' });
    
    expect(out.success).toBe(true);
    expect(out.changes).toContain('preferences');
  });

  test('updates notificationsEnabled preference', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.update.mockResolvedValue(user);
    mockRepo.updateUserPreferences.mockResolvedValue({});

    const out = await sut.execute({ userId: 'u1', updates: { notificationsEnabled: false }, updatedBy: 'u1' });
    
    expect(out.success).toBe(true);
    expect(out.changes).toContain('preferences');
  });

  test('allows self-update', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.update.mockResolvedValue(user);

    const out = await sut.execute({ userId: 'u1', updates: { firstName: 'New' }, updatedBy: 'u1' });
    
    expect(out.success).toBe(true);
  });

  test('publishes event on changes', async () => {
    const user = User.create({ id: 'u1', email: Email.create('a@gmail.com'), phoneNumber: PhoneNumber.create('+255712345678'), firstName: 'A', lastName: 'B', role: UserRole.BUYER });
    mockRepo.findById.mockResolvedValue(user);
    mockRepo.update.mockResolvedValue(user);

    await sut.execute({ userId: 'u1', updates: { firstName: 'New' }, updatedBy: 'u1' });
    
    expect(mockPublisher.publish).toHaveBeenCalled();
  });

  test('handles errors gracefully', async () => {
    mockRepo.findById.mockRejectedValue(new Error('DB error'));

    const out = await sut.execute({ userId: 'u1', updates: { firstName: 'New' }, updatedBy: 'u1' });
    
    expect(out.success).toBe(false);
  });
});
