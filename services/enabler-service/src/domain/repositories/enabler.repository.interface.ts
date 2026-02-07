import { EnablerEntity } from '../entities/enabler.entity';
import { Enabler_Status } from '@prisma/client';

export interface IEnablerRepository {
    findById(id: string): Promise<EnablerEntity | null>;
    findByUserId(userId: string): Promise<EnablerEntity | null>;
    findByStatus(status: Enabler_Status): Promise<EnablerEntity[]>;
    save(enabler: EnablerEntity): Promise<void>;
    update(enabler: EnablerEntity): Promise<void>;
}
