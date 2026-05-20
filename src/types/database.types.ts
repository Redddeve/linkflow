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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          entity_id: string
          entity_type: string
          id: string
          occurred_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          created_by_id: string
          id: string
          publish_date: string | null
          site_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          created_by_id: string
          id?: string
          publish_date?: string | null
          site_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          created_by_id?: string
          id?: string
          publish_date?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          created_by_id: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by_id: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          created_by_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          created_by_id: string
          id: string
          read_by: string[]
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          created_by_id: string
          id?: string
          read_by?: string[]
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          created_by_id?: string
          id?: string
          read_by?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          chat_id: string
          user_id: string
        }
        Insert: {
          chat_id: string
          user_id: string
        }
        Update: {
          chat_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          category: Database["public"]["Enums"]["chat_category"]
          created_at: string
          created_by_id: string
          id: string
          status: Database["public"]["Enums"]["chat_status"]
          title: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["chat_category"]
          created_at?: string
          created_by_id: string
          id?: string
          status?: Database["public"]["Enums"]["chat_status"]
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["chat_category"]
          created_at?: string
          created_by_id?: string
          id?: string
          status?: Database["public"]["Enums"]["chat_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          created_by_id: string
          id: string
          order_id: string
          text: string
        }
        Insert: {
          created_at?: string
          created_by_id: string
          id?: string
          order_id: string
          text: string
        }
        Update: {
          created_at?: string
          created_by_id?: string
          id?: string
          order_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          accrued_at: string
          amount_cents: number
          created_at: string
          id: string
          last_retry_at: string | null
          order_id: string
          paid_at: string | null
          payout_reference: string | null
          retry_count: number
          site_id: string
          sourcer_id: string
          status: Database["public"]["Enums"]["commission_status"]
        }
        Insert: {
          accrued_at?: string
          amount_cents: number
          created_at?: string
          id?: string
          last_retry_at?: string | null
          order_id: string
          paid_at?: string | null
          payout_reference?: string | null
          retry_count?: number
          site_id: string
          sourcer_id: string
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Update: {
          accrued_at?: string
          amount_cents?: number
          created_at?: string
          id?: string
          last_retry_at?: string | null
          order_id?: string
          paid_at?: string | null
          payout_reference?: string | null
          retry_count?: number
          site_id?: string
          sourcer_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_sourcer_id_fkey"
            columns: ["sourcer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          billing_month: string
          client_id: string
          created_at: string
          id: string
          last_overdue_notified_at: string | null
          marked_as_paid_at: string | null
          marked_as_paid_by_id: string | null
          sent_at: string | null
          sent_by_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_price_cents: number
        }
        Insert: {
          billing_month: string
          client_id: string
          created_at?: string
          id?: string
          last_overdue_notified_at?: string | null
          marked_as_paid_at?: string | null
          marked_as_paid_by_id?: string | null
          sent_at?: string | null
          sent_by_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_price_cents?: number
        }
        Update: {
          billing_month?: string
          client_id?: string
          created_at?: string
          id?: string
          last_overdue_notified_at?: string | null
          marked_as_paid_at?: string | null
          marked_as_paid_by_id?: string | null
          sent_at?: string | null
          sent_by_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_marked_as_paid_by_id_fkey"
            columns: ["marked_as_paid_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sent_by_id_fkey"
            columns: ["sent_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          event_type: string
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          event_type: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          event_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          recipient_id: string
          type: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          recipient_id: string
          type: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          recipient_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          approved_at: string | null
          billing_month: string | null
          canceled_at: string | null
          cancellation_reason: string | null
          chat_id: string | null
          content_body: string | null
          copywriter_id: string | null
          created_at: string
          created_by_id: string
          id: string
          invoice_id: string | null
          manager_id: string | null
          price_cents: number
          publish_date: string
          published_at: string | null
          published_by_id: string | null
          published_url: string | null
          sent_at: string | null
          site_category_id: string | null
          site_contact_info: string | null
          site_countries: Database["public"]["Enums"]["country"][]
          site_description: string | null
          site_domain: string
          site_dr: number | null
          site_id: string
          site_keywords_relevance: string | null
          site_languages: Database["public"]["Enums"]["language"][]
          site_link_type: Database["public"]["Enums"]["link_type"]
          site_organic_keywords_count: number
          site_organic_traffic_count: number
          site_requirements: string | null
          site_top_countries: string | null
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          approved_at?: string | null
          billing_month?: string | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          chat_id?: string | null
          content_body?: string | null
          copywriter_id?: string | null
          created_at?: string
          created_by_id: string
          id?: string
          invoice_id?: string | null
          manager_id?: string | null
          price_cents: number
          publish_date: string
          published_at?: string | null
          published_by_id?: string | null
          published_url?: string | null
          sent_at?: string | null
          site_category_id?: string | null
          site_contact_info?: string | null
          site_countries?: Database["public"]["Enums"]["country"][]
          site_description?: string | null
          site_domain: string
          site_dr?: number | null
          site_id: string
          site_keywords_relevance?: string | null
          site_languages?: Database["public"]["Enums"]["language"][]
          site_link_type?: Database["public"]["Enums"]["link_type"]
          site_organic_keywords_count?: number
          site_organic_traffic_count?: number
          site_requirements?: string | null
          site_top_countries?: string | null
          status?: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          approved_at?: string | null
          billing_month?: string | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          chat_id?: string | null
          content_body?: string | null
          copywriter_id?: string | null
          created_at?: string
          created_by_id?: string
          id?: string
          invoice_id?: string | null
          manager_id?: string | null
          price_cents?: number
          publish_date?: string
          published_at?: string | null
          published_by_id?: string | null
          published_url?: string | null
          sent_at?: string | null
          site_category_id?: string | null
          site_contact_info?: string | null
          site_countries?: Database["public"]["Enums"]["country"][]
          site_description?: string | null
          site_domain?: string
          site_dr?: number | null
          site_id?: string
          site_keywords_relevance?: string | null
          site_languages?: Database["public"]["Enums"]["language"][]
          site_link_type?: Database["public"]["Enums"]["link_type"]
          site_organic_keywords_count?: number
          site_organic_traffic_count?: number
          site_requirements?: string | null
          site_top_countries?: string | null
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_copywriter_id_fkey"
            columns: ["copywriter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_published_by_id_fkey"
            columns: ["published_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          category_id: string | null
          contact_info: string | null
          countries: Database["public"]["Enums"]["country"][]
          created_at: string
          created_by_id: string
          description: string | null
          domain: string
          dr: number | null
          id: string
          keywords_relevance: string | null
          languages: Database["public"]["Enums"]["language"][]
          link_type: Database["public"]["Enums"]["link_type"]
          needs_changes_at: string | null
          needs_changes_by_id: string | null
          organic_keywords_count: number
          organic_traffic_count: number
          price_cents: number
          requirements: string | null
          sourcer_id: string | null
          sourcer_notes: string | null
          sourcer_payout_cents: number
          status: Database["public"]["Enums"]["site_status"]
          top_countries: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          category_id?: string | null
          contact_info?: string | null
          countries?: Database["public"]["Enums"]["country"][]
          created_at?: string
          created_by_id: string
          description?: string | null
          domain: string
          dr?: number | null
          id?: string
          keywords_relevance?: string | null
          languages?: Database["public"]["Enums"]["language"][]
          link_type?: Database["public"]["Enums"]["link_type"]
          needs_changes_at?: string | null
          needs_changes_by_id?: string | null
          organic_keywords_count?: number
          organic_traffic_count?: number
          price_cents?: number
          requirements?: string | null
          sourcer_id?: string | null
          sourcer_notes?: string | null
          sourcer_payout_cents?: number
          status?: Database["public"]["Enums"]["site_status"]
          top_countries?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          category_id?: string | null
          contact_info?: string | null
          countries?: Database["public"]["Enums"]["country"][]
          created_at?: string
          created_by_id?: string
          description?: string | null
          domain?: string
          dr?: number | null
          id?: string
          keywords_relevance?: string | null
          languages?: Database["public"]["Enums"]["language"][]
          link_type?: Database["public"]["Enums"]["link_type"]
          needs_changes_at?: string | null
          needs_changes_by_id?: string | null
          organic_keywords_count?: number
          organic_traffic_count?: number
          price_cents?: number
          requirements?: string | null
          sourcer_id?: string | null
          sourcer_notes?: string | null
          sourcer_payout_cents?: number
          status?: Database["public"]["Enums"]["site_status"]
          top_countries?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_approved_by_id_fkey"
            columns: ["approved_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_needs_changes_by_id_fkey"
            columns: ["needs_changes_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_sourcer_id_fkey"
            columns: ["sourcer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar: string | null
          created_by_id: string | null
          disabled_reason: string | null
          email: string
          first_name: string
          id: string
          invited_at: string | null
          last_name: string
          manager_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          status: Database["public"]["Enums"]["user_status"]
        }
        Insert: {
          avatar?: string | null
          created_by_id?: string | null
          disabled_reason?: string | null
          email: string
          first_name?: string
          id: string
          invited_at?: string | null
          last_name?: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["user_status"]
        }
        Update: {
          avatar?: string | null
          created_by_id?: string | null
          disabled_reason?: string | null
          email?: string
          first_name?: string
          id?: string
          invited_at?: string | null
          last_name?: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["user_status"]
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accrue_commission_for_order: {
        Args: { p_order_id: string }
        Returns: string
      }
      check_user_email_exists: {
        Args: { lookup_email: string }
        Returns: boolean
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      disable_sourcer: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      generate_invoices_for_month: {
        Args: { p_billing_month: string }
        Returns: Json
      }
      insert_audit_log: {
        Args: {
          p_action: string
          p_actor_id: string
          p_after?: Json
          p_before?: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: string
      }
      insert_notification: {
        Args: {
          p_channel?: Database["public"]["Enums"]["notification_channel"]
          p_payload: Json
          p_recipient_id: string
          p_type: string
        }
        Returns: string
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_chat_participant: { Args: { p_chat_id: string }; Returns: boolean }
      mark_messages_read: { Args: { p_chat_id: string }; Returns: undefined }
      promote_commissions_candidates: {
        Args: { p_window_days: number }
        Returns: {
          commission_id: string
          order_id: string
          published_url: string
          retry_count: number
          site_domain: string
          sourcer_id: string
        }[]
      }
      reassign_order_billing_months: {
        Args: { p_changes: Json }
        Returns: Json
      }
      upsert_sales_chat: { Args: { p_user_id: string }; Returns: string }
      upsert_support_chat: { Args: { p_user_id: string }; Returns: string }
    }
    Enums: {
      chat_category: "Standard" | "Support" | "Sales"
      chat_status: "Active" | "Archived"
      commission_status: "ACCRUED" | "PAYABLE" | "PAID" | "REVERSED"
      country:
        | "Ukraine"
        | "Germany"
        | "USA"
        | "United Kingdom"
        | "Canada"
        | "Australia"
        | "France"
        | "Japan"
        | "Brazil"
        | "India"
        | "Mexico"
      invoice_status: "Draft" | "Sent" | "Paid"
      language: "English" | "German" | "Spanish" | "Portuguese" | "French"
      link_type: "dofollow" | "nofollow" | "sponsored" | "ugc"
      notification_channel: "IN_APP" | "EMAIL" | "BOTH"
      order_status:
        | "New"
        | "In Progress"
        | "Content Sent"
        | "Needs changes"
        | "Content Approved"
        | "Published"
        | "Completed"
        | "Canceled"
      site_status: "Pending" | "Active" | "Needs changes" | "Archived"
      user_role: "Client" | "Sourcer" | "Copywriter" | "Manager" | "Admin"
      user_status: "PENDING" | "ACTIVE" | "DISABLED"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      chat_category: ["Standard", "Support", "Sales"],
      chat_status: ["Active", "Archived"],
      commission_status: ["ACCRUED", "PAYABLE", "PAID", "REVERSED"],
      country: [
        "Ukraine",
        "Germany",
        "USA",
        "United Kingdom",
        "Canada",
        "Australia",
        "France",
        "Japan",
        "Brazil",
        "India",
        "Mexico",
      ],
      invoice_status: ["Draft", "Sent", "Paid"],
      language: ["English", "German", "Spanish", "Portuguese", "French"],
      link_type: ["dofollow", "nofollow", "sponsored", "ugc"],
      notification_channel: ["IN_APP", "EMAIL", "BOTH"],
      order_status: [
        "New",
        "In Progress",
        "Content Sent",
        "Needs changes",
        "Content Approved",
        "Published",
        "Completed",
        "Canceled",
      ],
      site_status: ["Pending", "Active", "Needs changes", "Archived"],
      user_role: ["Client", "Sourcer", "Copywriter", "Manager", "Admin"],
      user_status: ["PENDING", "ACTIVE", "DISABLED"],
    },
  },
} as const
