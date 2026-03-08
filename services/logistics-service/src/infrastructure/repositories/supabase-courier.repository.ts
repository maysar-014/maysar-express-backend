// @ts-nocheck
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientManager } from '../supabase.client';

export class SupabaseCourierRepository {
  private client: SupabaseClient<any>;

  constructor() {
    this.client = SupabaseClientManager.getInstance().getClient()!;
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from('couriers')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  }

  async findByStatus(status: string) {
    const { data, error } = await this.client
      .from('couriers')
      .select('*')
      .eq('status', status);
    
    return { data, error };
  }

  async create(courier: any) {
    const { data, error } = await this.client
      .from('couriers')
      .insert(courier)
      .select()
      .single();
    
    return { data, error };
  }

  async updateLocation(id: string, latitude: number, longitude: number, accuracy: number) {
    const { data, error } = await this.client
      .from('couriers')
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        location_accuracy: accuracy,
        location_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }
}
