export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      booking_activity: {
        Row: {
          author_email: string | null
          author_id: string | null
          body: string
          booking_id: string
          created_at: string
          id: string
          kind: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          body: string
          booking_id: string
          created_at?: string
          id?: string
          kind?: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_activity_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          assigned_to: string | null
          car_brand: string
          car_model: string
          car_year: string | null
          consent: boolean
          created_at: string
          customer_id: string | null
          duplicate_of: string | null
          follow_up_date: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          phone_norm: string | null
          preferred_date: string | null
          preferred_time: string | null
          problem: string | null
          ref_no: number
          registration: string | null
          service: string
          status: string
          updated_at: string
          whatsapp_opt_in: boolean
        }
        Insert: {
          assigned_to?: string | null
          car_brand: string
          car_model: string
          car_year?: string | null
          consent?: boolean
          created_at?: string
          customer_id?: string | null
          duplicate_of?: string | null
          follow_up_date?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          phone_norm?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          problem?: string | null
          ref_no?: number
          registration?: string | null
          service: string
          status?: string
          updated_at?: string
          whatsapp_opt_in?: boolean
        }
        Update: {
          assigned_to?: string | null
          car_brand?: string
          car_model?: string
          car_year?: string | null
          consent?: boolean
          created_at?: string
          customer_id?: string | null
          duplicate_of?: string | null
          follow_up_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          phone_norm?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          problem?: string | null
          ref_no?: number
          registration?: string | null
          service?: string
          status?: string
          updated_at?: string
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      car_brands: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          needs_review: boolean
          notes: string | null
          phone: string
          phone_norm: string | null
          possible_match_id: string | null
          updated_at: string
          updated_by: string | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          needs_review?: boolean
          notes?: string | null
          phone: string
          phone_norm?: string | null
          possible_match_id?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          needs_review?: boolean
          notes?: string | null
          phone?: string
          phone_norm?: string | null
          possible_match_id?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customers_possible_match_id_fkey"
            columns: ["possible_match_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          alt: string
          caption: string | null
          created_at: string
          id: string
          image_url: string
          published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          alt?: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alt?: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      parts: {
        Row: {
          archived: boolean
          brand: string | null
          category: string
          compat_make: string | null
          compat_model: string | null
          compat_years: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          min_stock: number
          name: string
          part_number: string | null
          purchase_price: number
          quantity: number
          selling_price: number
          sku: string
          supplier_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived?: boolean
          brand?: string | null
          category?: string
          compat_make?: string | null
          compat_model?: string | null
          compat_years?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          min_stock?: number
          name: string
          part_number?: string | null
          purchase_price?: number
          quantity?: number
          selling_price?: number
          sku: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived?: boolean
          brand?: string | null
          category?: string
          compat_make?: string | null
          compat_model?: string | null
          compat_years?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          min_stock?: number
          name?: string
          part_number?: string | null
          purchase_price?: number
          quantity?: number
          selling_price?: number
          sku?: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          created_at: string
          display_name: string
          id: string
          published: boolean
          rating: number | null
          review_date: string | null
          sort_order: number
          source: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          display_name: string
          id?: string
          published?: boolean
          rating?: number | null
          review_date?: string | null
          sort_order?: number
          source?: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          display_name?: string
          id?: string
          published?: boolean
          rating?: number | null
          review_date?: string | null
          sort_order?: number
          source?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          body: string
          created_at: string
          faqs: Json
          id: string
          image_alt: string | null
          image_key: string | null
          image_url: string | null
          published: boolean
          seo_description: string | null
          seo_title: string | null
          short_description: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          faqs?: Json
          id?: string
          image_alt?: string | null
          image_key?: string | null
          image_url?: string | null
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          faqs?: Json
          id?: string
          image_alt?: string | null
          image_key?: string | null
          image_url?: string | null
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string | null
          announcement: string | null
          email: string | null
          hours: string | null
          id: number
          maps_url: string | null
          phone: string | null
          review_url: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          announcement?: string | null
          email?: string | null
          hours?: string | null
          id?: number
          maps_url?: string | null
          phone?: string | null
          review_url?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          announcement?: string | null
          email?: string | null
          hours?: string | null
          id?: number
          maps_url?: string | null
          phone?: string | null
          review_url?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          balance_after: number
          booking_id: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          movement_type: string
          part_id: string
          quantity: number
          reason: string | null
          reference: string | null
          supplier_id: string | null
          unit_cost: number | null
        }
        Insert: {
          balance_after: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          movement_type: string
          part_id: string
          quantity: number
          reason?: string | null
          reference?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          balance_after?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          movement_type?: string
          part_id?: string
          quantity?: number
          reason?: string | null
          reference?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          archived: boolean
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gstin: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          archived?: boolean
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          archived?: boolean
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string
          id: string
          spent_on: string
          stage: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          spent_on?: string
          stage?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          spent_on?: string
          stage?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_reservations: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          deposit: number | null
          id: string
          notes: string | null
          reserved_on: string
          state: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          deposit?: number | null
          id?: string
          notes?: string | null
          reserved_on?: string
          state?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deposit?: number | null
          id?: string
          notes?: string | null
          reserved_on?: string
          state?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_reservations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_sales: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          sale_amount: number
          sale_date: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          sale_amount: number
          sale_date?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          sale_amount?: number
          sale_date?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          acquired_on: string | null
          asking_price: number | null
          condition: string | null
          created_at: string
          created_by: string | null
          description: string | null
          documents_expiry: string | null
          expected_price: number | null
          fuel_type: string | null
          id: string
          inspection_report: string | null
          insurance_expiry: string | null
          internal_notes: string | null
          listed_on: string | null
          make: string
          mfg_year: number | null
          model: string
          odometer_km: number | null
          owners: number | null
          photos: string[]
          previous_owner: string | null
          puc_expiry: string | null
          purchase_price: number
          reg_year: number | null
          registration: string | null
          reserved_customer_id: string | null
          reserved_on: string | null
          sale_price: number | null
          sold_customer_id: string | null
          sold_on: string | null
          status: string
          stock_id: string
          supplier_id: string | null
          transmission: string | null
          updated_at: string
          updated_by: string | null
          variant: string | null
          vin: string | null
        }
        Insert: {
          acquired_on?: string | null
          asking_price?: number | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents_expiry?: string | null
          expected_price?: number | null
          fuel_type?: string | null
          id?: string
          inspection_report?: string | null
          insurance_expiry?: string | null
          internal_notes?: string | null
          listed_on?: string | null
          make: string
          mfg_year?: number | null
          model: string
          odometer_km?: number | null
          owners?: number | null
          photos?: string[]
          previous_owner?: string | null
          puc_expiry?: string | null
          purchase_price?: number
          reg_year?: number | null
          registration?: string | null
          reserved_customer_id?: string | null
          reserved_on?: string | null
          sale_price?: number | null
          sold_customer_id?: string | null
          sold_on?: string | null
          status?: string
          stock_id: string
          supplier_id?: string | null
          transmission?: string | null
          updated_at?: string
          updated_by?: string | null
          variant?: string | null
          vin?: string | null
        }
        Update: {
          acquired_on?: string | null
          asking_price?: number | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents_expiry?: string | null
          expected_price?: number | null
          fuel_type?: string | null
          id?: string
          inspection_report?: string | null
          insurance_expiry?: string | null
          internal_notes?: string | null
          listed_on?: string | null
          make?: string
          mfg_year?: number | null
          model?: string
          odometer_km?: number | null
          owners?: number | null
          photos?: string[]
          previous_owner?: string | null
          puc_expiry?: string | null
          purchase_price?: number
          reg_year?: number | null
          registration?: string | null
          reserved_customer_id?: string | null
          reserved_on?: string | null
          sale_price?: number | null
          sold_customer_id?: string | null
          sold_on?: string | null
          status?: string
          stock_id?: string
          supplier_id?: string | null
          transmission?: string | null
          updated_at?: string
          updated_by?: string | null
          variant?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_reserved_customer_id_fkey"
            columns: ["reserved_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_sold_customer_id_fkey"
            columns: ["sold_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          attempts: number
          booking_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          error: string | null
          id: string
          kind: string
          language: string | null
          params: Json
          provider_message_id: string | null
          recipient: string
          status: string
          status_times: Json
          template_name: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          attempts?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          error?: string | null
          id?: string
          kind: string
          language?: string | null
          params?: Json
          provider_message_id?: string | null
          recipient: string
          status?: string
          status_times?: Json
          template_name?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          attempts?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          error?: string | null
          id?: string
          kind?: string
          language?: string | null
          params?: Json
          provider_message_id?: string | null
          recipient?: string
          status?: string
          status_times?: Json
          template_name?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          dashboard_url: string | null
          enabled: boolean
          id: number
          mode: string
          staff_numbers: string | null
          templates: Json
          test_recipient: string | null
          updated_at: string
        }
        Insert: {
          dashboard_url?: string | null
          enabled?: boolean
          id?: number
          mode?: string
          staff_numbers?: string | null
          templates?: Json
          test_recipient?: string | null
          updated_at?: string
        }
        Update: {
          dashboard_url?: string | null
          enabled?: boolean
          id?: number
          mode?: string
          staff_numbers?: string | null
          templates?: Json
          test_recipient?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_webhook_events: {
        Row: {
          attempts: number
          delivery_id: string
          event: string
          id: string
          next_attempt_at: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          received_at: string
        }
        Insert: {
          attempts?: number
          delivery_id: string
          event: string
          id?: string
          next_attempt_at?: string
          payload: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Update: {
          attempts?: number
          delivery_id?: string
          event?: string
          id?: string
          next_attempt_at?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
        }
        Relationships: []
      }
      workshop_stories: {
        Row: {
          created_at: string
          findings: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          issue: string | null
          published: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
          vehicle: string | null
          work_performed: string | null
        }
        Insert: {
          created_at?: string
          findings?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          issue?: string | null
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
          vehicle?: string | null
          work_performed?: string | null
        }
        Update: {
          created_at?: string
          findings?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          issue?: string | null
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
          vehicle?: string | null
          work_performed?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_reservation: { Args: { _vehicle_id: string }; Returns: undefined }
      has_perm: { Args: { _area: string; _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_stock_movement: {
        Args: {
          _booking_id?: string
          _part_id: string
          _qty: number
          _reason?: string
          _reference?: string
          _supplier_id?: string
          _type: string
          _unit_cost?: number
        }
        Returns: number
      }
      reserve_vehicle: {
        Args: {
          _customer_id: string
          _deposit?: number
          _notes?: string
          _vehicle_id: string
        }
        Returns: string
      }
      sell_vehicle: {
        Args: {
          _amount: number
          _customer_id: string
          _notes?: string
          _sale_date?: string
          _vehicle_id: string
        }
        Returns: string
      }
      set_staff_role: {
        Args: { _grant: boolean; _role: string; _user_id: string }
        Returns: undefined
      }
      staff_directory: {
        Args: never
        Returns: {
          email: string
          last_sign_in: string
          roles: string[]
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "service_advisor"
        | "inventory_manager"
        | "sales"
        | "readonly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "service_advisor",
        "inventory_manager",
        "sales",
        "readonly",
      ],
    },
  },
} as const
