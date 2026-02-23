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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      azienda: {
        Row: {
          created_at: string | null
          descrizione: string | null
          email: string
          id: string
          logo_url: string | null
          nome: string
          sito_web: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descrizione?: string | null
          email: string
          id: string
          logo_url?: string | null
          nome: string
          sito_web?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descrizione?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          nome?: string
          sito_web?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      azienda_settore: {
        Row: {
          azienda_id: string
          id: string
          settore_id: string
        }
        Insert: {
          azienda_id: string
          id?: string
          settore_id: string
        }
        Update: {
          azienda_id?: string
          id?: string
          settore_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "azienda_settore_azienda_id_fkey"
            columns: ["azienda_id"]
            isOneToOne: false
            referencedRelation: "azienda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azienda_settore_settore_id_fkey"
            columns: ["settore_id"]
            isOneToOne: false
            referencedRelation: "settore"
            referencedColumns: ["id"]
          },
        ]
      }
      bando: {
        Row: {
          creatore_azienda_id: string | null
          creatore_studente_id: string | null
          creatore_tipo: Database["public"]["Enums"]["creator_type"]
          data_chiusura: string | null
          data_creazione: string | null
          descrizione: string
          foto_url: string | null
          id: string
          importo: number | null
          stato: Database["public"]["Enums"]["bando_status"] | null
          titolo: string
          updated_at: string | null
        }
        Insert: {
          creatore_azienda_id?: string | null
          creatore_studente_id?: string | null
          creatore_tipo: Database["public"]["Enums"]["creator_type"]
          data_chiusura?: string | null
          data_creazione?: string | null
          descrizione: string
          foto_url?: string | null
          id?: string
          importo?: number | null
          stato?: Database["public"]["Enums"]["bando_status"] | null
          titolo: string
          updated_at?: string | null
        }
        Update: {
          creatore_azienda_id?: string | null
          creatore_studente_id?: string | null
          creatore_tipo?: Database["public"]["Enums"]["creator_type"]
          data_chiusura?: string | null
          data_creazione?: string | null
          descrizione?: string
          foto_url?: string | null
          id?: string
          importo?: number | null
          stato?: Database["public"]["Enums"]["bando_status"] | null
          titolo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bando_creatore_azienda_id_fkey"
            columns: ["creatore_azienda_id"]
            isOneToOne: false
            referencedRelation: "azienda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bando_creatore_studente_id_fkey"
            columns: ["creatore_studente_id"]
            isOneToOne: false
            referencedRelation: "studente"
            referencedColumns: ["id"]
          },
        ]
      }
      bando_interesse: {
        Row: {
          bando_id: string
          id: string
          interesse_id: string
        }
        Insert: {
          bando_id: string
          id?: string
          interesse_id: string
        }
        Update: {
          bando_id?: string
          id?: string
          interesse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bando_interesse_bando_id_fkey"
            columns: ["bando_id"]
            isOneToOne: false
            referencedRelation: "bando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bando_interesse_interesse_id_fkey"
            columns: ["interesse_id"]
            isOneToOne: false
            referencedRelation: "interesse"
            referencedColumns: ["id"]
          },
        ]
      }
      bando_settore: {
        Row: {
          bando_id: string
          id: string
          settore_id: string
        }
        Insert: {
          bando_id: string
          id?: string
          settore_id: string
        }
        Update: {
          bando_id?: string
          id?: string
          settore_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bando_settore_bando_id_fkey"
            columns: ["bando_id"]
            isOneToOne: false
            referencedRelation: "bando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bando_settore_settore_id_fkey"
            columns: ["settore_id"]
            isOneToOne: false
            referencedRelation: "settore"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria: {
        Row: {
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      contatto: {
        Row: {
          created_at: string | null
          id: string
          studente_id: string
          tipo: Database["public"]["Enums"]["contact_type"]
          valore: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          studente_id: string
          tipo: Database["public"]["Enums"]["contact_type"]
          valore: string
        }
        Update: {
          created_at?: string | null
          id?: string
          studente_id?: string
          tipo?: Database["public"]["Enums"]["contact_type"]
          valore?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatto_studente_id_fkey"
            columns: ["studente_id"]
            isOneToOne: false
            referencedRelation: "studente"
            referencedColumns: ["id"]
          },
        ]
      }
      corso_di_studi: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["corso_tipo"]
          universita_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["corso_tipo"]
          universita_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["corso_tipo"]
          universita_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corso_di_studi_universita_id_fkey"
            columns: ["universita_id"]
            isOneToOne: false
            referencedRelation: "universita"
            referencedColumns: ["id"]
          },
        ]
      }
      corso_settore: {
        Row: {
          corso_id: string
          id: string
          settore_id: string
        }
        Insert: {
          corso_id: string
          id?: string
          settore_id: string
        }
        Update: {
          corso_id?: string
          id?: string
          settore_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "corso_settore_corso_id_fkey"
            columns: ["corso_id"]
            isOneToOne: false
            referencedRelation: "corso_di_studi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corso_settore_settore_id_fkey"
            columns: ["settore_id"]
            isOneToOne: false
            referencedRelation: "settore"
            referencedColumns: ["id"]
          },
        ]
      }
      cv: {
        Row: {
          data_caricamento: string | null
          file_url: string
          id: string
          nome_file: string | null
          studente_id: string
        }
        Insert: {
          data_caricamento?: string | null
          file_url: string
          id?: string
          nome_file?: string | null
          studente_id: string
        }
        Update: {
          data_caricamento?: string | null
          file_url?: string
          id?: string
          nome_file?: string | null
          studente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_studente_id_fkey"
            columns: ["studente_id"]
            isOneToOne: true
            referencedRelation: "studente"
            referencedColumns: ["id"]
          },
        ]
      }
      interesse: {
        Row: {
          categoria_id: string
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          categoria_id: string
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          categoria_id?: string
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "interesse_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria"
            referencedColumns: ["id"]
          },
        ]
      }
      notifica: {
        Row: {
          bando_id: string | null
          data: string | null
          destinatario_azienda_id: string | null
          destinatario_studente_id: string | null
          destinatario_tipo: Database["public"]["Enums"]["creator_type"]
          id: string
          letto: boolean | null
          link: string | null
          messaggio: string
          tipo: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          bando_id?: string | null
          data?: string | null
          destinatario_azienda_id?: string | null
          destinatario_studente_id?: string | null
          destinatario_tipo: Database["public"]["Enums"]["creator_type"]
          id?: string
          letto?: boolean | null
          link?: string | null
          messaggio: string
          tipo: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          bando_id?: string | null
          data?: string | null
          destinatario_azienda_id?: string | null
          destinatario_studente_id?: string | null
          destinatario_tipo?: Database["public"]["Enums"]["creator_type"]
          id?: string
          letto?: boolean | null
          link?: string | null
          messaggio?: string
          tipo?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifica_bando_id_fkey"
            columns: ["bando_id"]
            isOneToOne: false
            referencedRelation: "bando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifica_destinatario_azienda_id_fkey"
            columns: ["destinatario_azienda_id"]
            isOneToOne: false
            referencedRelation: "azienda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifica_destinatario_studente_id_fkey"
            columns: ["destinatario_studente_id"]
            isOneToOne: false
            referencedRelation: "studente"
            referencedColumns: ["id"]
          },
        ]
      }
      partecipazione: {
        Row: {
          bando_id: string
          data_candidatura: string | null
          id: string
          messaggio: string | null
          stato: Database["public"]["Enums"]["partecipazione_status"] | null
          studente_id: string
          updated_at: string | null
        }
        Insert: {
          bando_id: string
          data_candidatura?: string | null
          id?: string
          messaggio?: string | null
          stato?: Database["public"]["Enums"]["partecipazione_status"] | null
          studente_id: string
          updated_at?: string | null
        }
        Update: {
          bando_id?: string
          data_candidatura?: string | null
          id?: string
          messaggio?: string | null
          stato?: Database["public"]["Enums"]["partecipazione_status"] | null
          studente_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partecipazione_bando_id_fkey"
            columns: ["bando_id"]
            isOneToOne: false
            referencedRelation: "bando"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partecipazione_studente_id_fkey"
            columns: ["studente_id"]
            isOneToOne: false
            referencedRelation: "studente"
            referencedColumns: ["id"]
          },
        ]
      }
      settore: {
        Row: {
          created_at: string | null
          descrizione: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          descrizione?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          descrizione?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      studente: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cognome: string
          created_at: string | null
          data_nascita: string | null
          email: string
          id: string
          nome: string
          sesso: Database["public"]["Enums"]["sesso_type"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cognome: string
          created_at?: string | null
          data_nascita?: string | null
          email: string
          id: string
          nome: string
          sesso?: Database["public"]["Enums"]["sesso_type"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cognome?: string
          created_at?: string | null
          data_nascita?: string | null
          email?: string
          id?: string
          nome?: string
          sesso?: Database["public"]["Enums"]["sesso_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      studente_corso: {
        Row: {
          anno_fine: number | null
          anno_inizio: number
          completato: boolean | null
          corso_id: string
          created_at: string | null
          id: string
          studente_id: string
          voto: number | null
        }
        Insert: {
          anno_fine?: number | null
          anno_inizio: number
          completato?: boolean | null
          corso_id: string
          created_at?: string | null
          id?: string
          studente_id: string
          voto?: number | null
        }
        Update: {
          anno_fine?: number | null
          anno_inizio?: number
          completato?: boolean | null
          corso_id?: string
          created_at?: string | null
          id?: string
          studente_id?: string
          voto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "studente_corso_corso_id_fkey"
            columns: ["corso_id"]
            isOneToOne: false
            referencedRelation: "corso_di_studi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studente_corso_studente_id_fkey"
            columns: ["studente_id"]
            isOneToOne: false
            referencedRelation: "studente"
            referencedColumns: ["id"]
          },
        ]
      }
      studente_interesse: {
        Row: {
          created_at: string | null
          id: string
          interesse_id: string
          studente_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interesse_id: string
          studente_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interesse_id?: string
          studente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studente_interesse_interesse_id_fkey"
            columns: ["interesse_id"]
            isOneToOne: false
            referencedRelation: "interesse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studente_interesse_studente_id_fkey"
            columns: ["studente_id"]
            isOneToOne: false
            referencedRelation: "studente"
            referencedColumns: ["id"]
          },
        ]
      }
      universita: {
        Row: {
          citta: string | null
          created_at: string | null
          dominio_email: string
          id: string
          nome: string
        }
        Insert: {
          citta?: string | null
          created_at?: string | null
          dominio_email: string
          id?: string
          nome: string
        }
        Update: {
          citta?: string | null
          created_at?: string | null
          dominio_email?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      bando_status: "aperto" | "chiuso" | "in_corso" | "completato"
      contact_type:
        | "email"
        | "telefono"
        | "linkedin"
        | "telegram"
        | "github"
        | "portfolio"
        | "altro"
      corso_tipo:
        | "triennale"
        | "magistrale"
        | "ciclo_unico"
        | "dottorato"
        | "master"
      creator_type: "studente" | "azienda"
      notification_type:
        | "candidatura_ricevuta"
        | "candidatura_accettata"
        | "candidatura_rifiutata"
        | "nuovo_membro"
        | "bando_aggiornato"
        | "benvenuto"
      partecipazione_status: "pending" | "accepted" | "rejected"
      sesso_type: "M" | "F" | "altro" | "non_specificato"
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
      bando_status: ["aperto", "chiuso", "in_corso", "completato"],
      contact_type: [
        "email",
        "telefono",
        "linkedin",
        "telegram",
        "github",
        "portfolio",
        "altro",
      ],
      corso_tipo: [
        "triennale",
        "magistrale",
        "ciclo_unico",
        "dottorato",
        "master",
      ],
      creator_type: ["studente", "azienda"],
      notification_type: [
        "candidatura_ricevuta",
        "candidatura_accettata",
        "candidatura_rifiutata",
        "nuovo_membro",
        "bando_aggiornato",
        "benvenuto",
      ],
      partecipazione_status: ["pending", "accepted", "rejected"],
      sesso_type: ["M", "F", "altro", "non_specificato"],
    },
  },
} as const
