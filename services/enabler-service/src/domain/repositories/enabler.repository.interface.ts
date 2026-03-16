import { EnablerEntity } from '../entities/enabler.entity';
import { Enabler_Status } from '../types/enabler.types';

export interface IEnablerRepository {
    findById(id: string): Promise<EnablerEntity | null>;
    findByUserId(userId: string): Promise<EnablerEntity | null>;
    findByCode(code: string): Promise<EnablerEntity | null>;
    findByStatus(status: Enabler_Status): Promise<EnablerEntity[]>;
    save(enabler: EnablerEntity): Promise<void>;
    update(enabler: EnablerEntity): Promise<void>;
}
