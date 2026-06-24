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
      appointments: {
        Row: {
          assignee: string | null
          circle_id: string
          created_at: string
          created_by: string
          duration_minutes: number | null
          google_calendar_event_id: string | null
          id: string
          starts_at: string
          title: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          assignee?: string | null
          circle_id: string
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          google_calendar_event_id?: string | null
          id?: string
          starts_at: string
          title: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          assignee?: string | null
          circle_id?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          google_calendar_event_id?: string | null
          id?: string
          starts_at?: string
          title?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "appointments_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "care_circle"
            referencedColumns: ["id"]
          },
        ]
      }
      care_circle: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      care_circle_member: {
        Row: {
          circle_id: string
          joined_at: string
          role: Database["public"]["Enums"]["circle_member_role"]
          user_id: string
        }
        Insert: {
          circle_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["circle_member_role"]
          user_id: string
        }
        Update: {
          circle_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["circle_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_circle_member_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "care_circle"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_invites: {
        Row: {
          circle_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          circle_id: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          circle_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circle_invites_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "care_circle"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string | null
          circle_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          parent_appointment_id: string | null
          progress_note: string | null
          recurrence: string | null
          title: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          assignee?: string | null
          circle_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          parent_appointment_id?: string | null
          progress_note?: string | null
          recurrence?: string | null
          title: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          assignee?: string | null
          circle_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          parent_appointment_id?: string | null
          progress_note?: string | null
          recurrence?: string | null
          title?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "tasks_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "care_circle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_appointment_id_fkey"
            columns: ["parent_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          created_at: string
          display_name: string
          google_calendar_connected: boolean
          google_calendar_sync_preference: Database["public"]["Enums"]["calendar_sync_preference"]
          id: string
          last_digest_shown_at: string | null
          push_token: string | null
          push_token_updated_at: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string
          google_calendar_connected?: boolean
          google_calendar_sync_preference?: Database["public"]["Enums"]["calendar_sync_preference"]
          id: string
          last_digest_shown_at?: string | null
          push_token?: string | null
          push_token_updated_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          google_calendar_connected?: boolean
          google_calendar_sync_preference?: Database["public"]["Enums"]["calendar_sync_preference"]
          id?: string
          last_digest_shown_at?: string | null
          push_token?: string | null
          push_token_updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_care_circle: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "care_circle"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_circle_admin: { Args: { p_circle_id: string }; Returns: boolean }
      is_circle_member: { Args: { p_circle_id: string }; Returns: boolean }
      shares_circle_with: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      calendar_sync_preference: "sync_mine" | "sync_all" | "no_sync"
      circle_member_role: "admin" | "member"
      visibility: "private" | "shared"
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
      calendar_sync_preference: ["sync_mine", "sync_all", "no_sync"],
      circle_member_role: ["admin", "member"],
      visibility: ["private", "shared"],
    },
  },
} as const
