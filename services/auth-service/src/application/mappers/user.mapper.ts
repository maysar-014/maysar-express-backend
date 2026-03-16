import { User } from '../../domain/entities/user.entity';

export class UserMapper {
    public static toDomain(raw: any): User {
        return User.create({
            id: raw.id,
            publicCode: raw.publicCode ?? undefined,
            email: raw.email,
            role: raw.role,
            status: raw.status || raw.accountStatus, // Map from possible field names
            profile: raw.profile,
            kycStatus: raw.kycStatus
        });
    }

    public static toPersistence(user: User): any {
        return {
            id: user.id,
            publicCode: user.publicCode,
            email: user.email,
            role: user.role,
            accountStatus: user.status,
            profile: user.profile
        };
    }
}
