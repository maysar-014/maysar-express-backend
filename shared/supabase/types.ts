export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'ADMIN' | 'SELLER' | 'COURIER' | 'SUPPLIER' | 'ENABLER' | 'CUSTOMER'
          status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
          profile: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'ADMIN' | 'SELLER' | 'COURIER' | 'SUPPLIER' | 'ENABLER' | 'CUSTOMER'
          status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
          profile?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'ADMIN' | 'SELLER' | 'COURIER' | 'SUPPLIER' | 'ENABLER' | 'CUSTOMER'
          status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
          profile?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          avatar_url: string | null
          address: Json | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          address?: Json | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          address?: Json | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          seller_id: string
          name: string
          slug: string
          description: string | null
          short_description: string | null
          category_id: string | null
          brand: string | null
          sku: string | null
          status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'OUT_OF_STOCK'
          images: Json
          specifications: Json
          seo_data: Json
          tags: string[] | null
          weight: number | null
          dimensions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          name: string
          slug: string
          description?: string | null
          short_description?: string | null
          category_id?: string | null
          brand?: string | null
          sku?: string | null
          status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'OUT_OF_STOCK'
          images?: Json
          specifications?: Json
          seo_data?: Json
          tags?: string[] | null
          weight?: number | null
          dimensions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          name?: string
          slug?: string
          description?: string | null
          short_description?: string | null
          category_id?: string | null
          brand?: string | null
          sku?: string | null
          status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'OUT_OF_STOCK'
          images?: Json
          specifications?: Json
          seo_data?: Json
          tags?: string[] | null
          weight?: number | null
          dimensions?: Json
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          buyer_id: string
          seller_id: string
          status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'
          total_amount: number
          subtotal: number
          tax_amount: number
          shipping_amount: number
          discount_amount: number
          currency: string
          payment_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
          shipping_address: Json
          billing_address: Json | null
          notes: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          buyer_id: string
          seller_id: string
          status?: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'
          total_amount: number
          subtotal: number
          tax_amount?: number
          shipping_amount?: number
          discount_amount?: number
          currency?: string
          payment_status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
          shipping_address: Json
          billing_address?: Json | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          buyer_id?: string
          seller_id?: string
          status?: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'
          total_amount?: number
          subtotal?: number
          tax_amount?: number
          shipping_amount?: number
          discount_amount?: number
          currency?: string
          payment_status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
          shipping_address?: Json
          billing_address?: Json | null
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          recipient_id: string
          recipient_type: string
          type: string
          title: string
          message: string
          channel: string
          status: string
          data: Json
          sent_at: string | null
          read_at: string | null
          clicked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipient_id: string
          recipient_type: string
          type: string
          title: string
          message: string
          channel: string
          status?: string
          data?: Json
          sent_at?: string | null
          read_at?: string | null
          clicked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          recipient_type?: string
          type?: string
          title?: string
          message?: string
          channel?: string
          status?: string
          data?: Json
          sent_at?: string | null
          read_at?: string | null
          clicked_at?: string | null
          created_at?: string
        }
      }
      seller_analytics: {
        Row: {
          id: string
          seller_id: string
          date: string
          total_orders: number
          total_revenue: number
          total_customers: number
          average_order_value: number
          conversion_rate: number
          return_rate: number
          customer_satisfaction: number
          page_views: number
          unique_visitors: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          date: string
          total_orders?: number
          total_revenue?: number
          total_customers?: number
          average_order_value?: number
          conversion_rate?: number
          return_rate?: number
          customer_satisfaction?: number
          page_views?: number
          unique_visitors?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          date?: string
          total_orders?: number
          total_revenue?: number
          total_customers?: number
          average_order_value?: number
          conversion_rate?: number
          return_rate?: number
          customer_satisfaction?: number
          page_views?: number
          unique_visitors?: number
          created_at?: string
          updated_at?: string
        }
      }
      courier_analytics: {
        Row: {
          id: string
          courier_id: string
          date: string
          deliveries_completed: number
          total_earnings: number
          average_delivery_time: number
          customer_rating: number
          distance_traveled: number
          fuel_cost: number
          efficiency_score: number
          on_time_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          courier_id: string
          date: string
          deliveries_completed?: number
          total_earnings?: number
          average_delivery_time?: number
          customer_rating?: number
          distance_traveled?: number
          fuel_cost?: number
          efficiency_score?: number
          on_time_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          courier_id?: string
          date?: string
          deliveries_completed?: number
          total_earnings?: number
          average_delivery_time?: number
          customer_rating?: number
          distance_traveled?: number
          fuel_cost?: number
          efficiency_score?: number
          on_time_rate?: number
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          enabler_id: string | null
          seller_id: string | null
          task_type: string
          title: string
          description: string | null
          priority: string
          status: string
          territory: string | null
          estimated_duration: number | null
          actual_duration: number | null
          completion_notes: string | null
          evidence: Json
          assigned_at: string | null
          started_at: string | null
          completed_at: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enabler_id?: string | null
          seller_id?: string | null
          task_type: string
          title: string
          description?: string | null
          priority?: string
          status?: string
          territory?: string | null
          estimated_duration?: number | null
          actual_duration?: number | null
          completion_notes?: string | null
          evidence?: Json
          assigned_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enabler_id?: string | null
          seller_id?: string | null
          task_type?: string
          title?: string
          description?: string | null
          priority?: string
          status?: string
          territory?: string | null
          estimated_duration?: number | null
          actual_duration?: number | null
          completion_notes?: string | null
          evidence?: Json
          assigned_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'ADMIN' | 'SELLER' | 'COURIER' | 'SUPPLIER' | 'ENABLER' | 'CUSTOMER'
      user_status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
      order_status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'
      payment_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
      product_status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'OUT_OF_STOCK'
      kyc_status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
      delivery_status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}