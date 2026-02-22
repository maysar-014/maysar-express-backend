import { SupabaseClient } from '@supabase/supabase-js';
import { ICODDisputeRepository, CODDispute } from '../../application/use-cases/resolve-cod-dispute.use-case';
import { SupabaseClientManager } from './supabase.client';

export class SupabaseCODDisputeRepository implements ICODDisputeRepository {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = SupabaseClientManager.getInstance().getClient()!;
    }

    async findById(id: string): Promise<CODDispute | null> {
        try {
            const { data, error } = await this.supabase
                .from('order_cod_disputes')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            return data as CODDispute;
        } catch (error) {
            console.error('Error finding COD dispute:', error);
            return null;
        }
    }

    async save(dispute: CODDispute): Promise<void> {
        const { error } = await this.supabase
            .from('order_cod_disputes')
            .insert(dispute);

        if (error) throw new Error(`Failed to save COD dispute: ${error.message}`);
    }

    async update(dispute: CODDispute): Promise<void> {
        const { error } = await this.supabase
            .from('order_cod_disputes')
            .update(dispute)
            .eq('id', dispute.id);

        if (error) throw new Error(`Failed to update COD dispute: ${error.message}`);
    }
}
