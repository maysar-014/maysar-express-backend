import { PrismaClient } from '@prisma/client';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/entities/user.entity';
import { UserMapper } from '../../application/mappers/user.mapper';

export class PrismaUserRepository implements IUserRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(user: User): Promise<void> {
        const data = UserMapper.toPersistence(user);
        await this.prisma.user.upsert({
            where: { id: user.id },
            update: data,
            create: data
        });
    }

    async findById(id: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({ where: { id } });
        return user ? UserMapper.toDomain(user) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        return user ? UserMapper.toDomain(user) : null;
    }
}
