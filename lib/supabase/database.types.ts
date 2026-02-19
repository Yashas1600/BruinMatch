export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Gender = 'men' | 'women'
export type GenderPreference = 'men' | 'women' | 'everyone'
export type SwipeDecision = 'like' | 'pass'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          age: number
          gender: Gender
          frat: string
          height_cm: number
          interested_in: GenderPreference
          one_liner: string
          photos: Json
          is_finalized: boolean
          dating_pool: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          age: number
          gender: Gender
          frat: string
          height_cm: number
          interested_in: GenderPreference
          one_liner: string
          dating_pool: string
          photos?: Json
          is_finalized?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          age?: number
          gender?: Gender
          frat?: string
          height_cm?: number
          interested_in?: GenderPreference
          one_liner?: string
          photos?: Json
          is_finalized?: boolean
          dating_pool?: string
          created_at?: string
          updated_at?: string
        }
      }
      preferences: {
        Row: {
          user_id: string
          frat_whitelist: string[] | null
          age_min: number
          age_max: number
          height_min: number
          height_max: number
          interested_in: GenderPreference
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          frat_whitelist?: string[] | null
          age_min: number
          age_max: number
          height_min: number
          height_max: number
          interested_in: GenderPreference
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          frat_whitelist?: string[] | null
          age_min?: number
          age_max?: number
          height_min?: number
          height_max?: number
          interested_in?: GenderPreference
          created_at?: string
          updated_at?: string
        }
      }
      pool_config: {
        Row: {
          pool_code: string
          status: string
          updated_at: string
        }
        Insert: {
          pool_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          pool_code?: string
          status?: string
          updated_at?: string
        }
      }
      swipes: {
        Row: {
          id: string
          swiper: string
          swipee: string
          decision: SwipeDecision
          created_at: string
        }
        Insert: {
          id?: string
          swiper: string
          swipee: string
          decision: SwipeDecision
          created_at?: string
        }
        Update: {
          id?: string
          swiper?: string
          swipee?: string
          decision?: SwipeDecision
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          user_a: string
          user_b: string
          created_at: string
        }
        Insert: {
          id?: string
          user_a: string
          user_b: string
          created_at?: string
        }
        Update: {
          id?: string
          user_a?: string
          user_b?: string
          created_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          match_id: string
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          sender: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          sender?: string
          body?: string
          created_at?: string
        }
      }
      date_confirmations: {
        Row: {
          id: string
          match_id: string
          confirmer: string
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          confirmer: string
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          confirmer?: string
          created_at?: string
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
      gender_preference: GenderPreference
      swipe_decision: SwipeDecision
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Preference = Database['public']['Tables']['preferences']['Row']
export type PreferenceInsert = Database['public']['Tables']['preferences']['Insert']
export type PreferenceUpdate = Database['public']['Tables']['preferences']['Update']

export type Swipe = Database['public']['Tables']['swipes']['Row']
export type SwipeInsert = Database['public']['Tables']['swipes']['Insert']

export type Match = Database['public']['Tables']['matches']['Row']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']

export type Chat = Database['public']['Tables']['chats']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']

export type DateConfirmation = Database['public']['Tables']['date_confirmations']['Row']
export type DateConfirmationInsert = Database['public']['Tables']['date_confirmations']['Insert']
