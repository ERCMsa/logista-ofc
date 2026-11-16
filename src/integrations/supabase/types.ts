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
      appointments: {
        Row: {
          created_at: string
          date: string
          destination: string | null
          driver: string | null
          driver_phone: string | null
          from_id: string | null
          from_name: string | null
          from_phone: string | null
          from_type: string | null
          id: string
          mission_type: string | null
          notes: string | null
          project: string | null
          status: string
          supplier: string | null
          time: string | null
          to_id: string | null
          to_name: string | null
          to_phone: string | null
          to_type: string | null
          truck: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          destination?: string | null
          driver?: string | null
          driver_phone?: string | null
          from_id?: string | null
          from_name?: string | null
          from_phone?: string | null
          from_type?: string | null
          id?: string
          mission_type?: string | null
          notes?: string | null
          project?: string | null
          status?: string
          supplier?: string | null
          time?: string | null
          to_id?: string | null
          to_name?: string | null
          to_phone?: string | null
          to_type?: string | null
          truck?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          destination?: string | null
          driver?: string | null
          driver_phone?: string | null
          from_id?: string | null
          from_name?: string | null
          from_phone?: string | null
          from_type?: string | null
          id?: string
          mission_type?: string | null
          notes?: string | null
          project?: string | null
          status?: string
          supplier?: string | null
          time?: string | null
          to_id?: string | null
          to_name?: string | null
          to_phone?: string | null
          to_type?: string | null
          truck?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          license: string | null
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          license?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          license?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      logistics_operations: {
        Row: {
          client: string | null
          created_at: string
          date: string
          destination: string | null
          destination_type: string | null
          direction: string
          driver: string | null
          driver_phone: string | null
          id: string
          items: Json
          material: string | null
          notes: string | null
          project: string | null
          project_id: string | null
          purchase_order: string | null
          quantity: number | null
          status: string
          supplier: string | null
          supplier_id: string | null
          truck: string | null
          truck_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          client?: string | null
          created_at?: string
          date?: string
          destination?: string | null
          destination_type?: string | null
          direction: string
          driver?: string | null
          driver_phone?: string | null
          id?: string
          items?: Json
          material?: string | null
          notes?: string | null
          project?: string | null
          project_id?: string | null
          purchase_order?: string | null
          quantity?: number | null
          status?: string
          supplier?: string | null
          supplier_id?: string | null
          truck?: string | null
          truck_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          client?: string | null
          created_at?: string
          date?: string
          destination?: string | null
          destination_type?: string | null
          direction?: string
          driver?: string | null
          driver_phone?: string | null
          id?: string
          items?: Json
          material?: string | null
          notes?: string | null
          project?: string | null
          project_id?: string | null
          purchase_order?: string | null
          quantity?: number | null
          status?: string
          supplier?: string | null
          supplier_id?: string | null
          truck?: string | null
          truck_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number | null
          stock: number | null
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number | null
          stock?: number | null
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number | null
          stock?: number | null
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_units: {
        Row: {
          created_at: string
          id: string
          location: string | null
          location_url: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          location_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          location_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          project_id: string
          size_bytes: number | null
          storage_path: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          project_id: string
          size_bytes?: number | null
          storage_path: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          size_bytes?: number | null
          storage_path?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          assigned_trucks: string[] | null
          client: string
          code: string
          created_at: string
          deadline: string | null
          id: string
          location: string
          location_url: string | null
          name: string
          progress: number
          status: string
          tonnage: string | null
          updated_at: string
        }
        Insert: {
          assigned_trucks?: string[] | null
          client: string
          code: string
          created_at?: string
          deadline?: string | null
          id?: string
          location: string
          location_url?: string | null
          name: string
          progress?: number
          status?: string
          tonnage?: string | null
          updated_at?: string
        }
        Update: {
          assigned_trucks?: string[] | null
          client?: string
          code?: string
          created_at?: string
          deadline?: string | null
          id?: string
          location?: string
          location_url?: string | null
          name?: string
          progress?: number
          status?: string
          tonnage?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          country: string | null
          created_at: string
          id: string
          image_url: string | null
          location_url: string | null
          materials: string | null
          name: string
          phone: string | null
          rating: number | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          location_url?: string | null
          materials?: string | null
          name: string
          phone?: string | null
          rating?: number | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          location_url?: string | null
          materials?: string | null
          name?: string
          phone?: string | null
          rating?: number | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      trucks: {
        Row: {
          capacity: string | null
          code: string | null
          created_at: string
          destination: string | null
          driver: string
          fuel_pct: number
          id: string
          load_pct: number
          maintenance: string
          matricule: string | null
          model: string | null
          phone: string | null
          plate: string | null
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          capacity?: string | null
          code?: string | null
          created_at?: string
          destination?: string | null
          driver: string
          fuel_pct?: number
          id?: string
          load_pct?: number
          maintenance?: string
          matricule?: string | null
          model?: string | null
          phone?: string | null
          plate?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: string | null
          code?: string | null
          created_at?: string
          destination?: string | null
          driver?: string
          fuel_pct?: number
          id?: string
          load_pct?: number
          maintenance?: string
          matricule?: string | null
          model?: string | null
          phone?: string | null
          plate?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager"
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
      app_role: ["admin", "user", "manager"],
    },
  },
} as const
