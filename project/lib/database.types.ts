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
      posts: {
        Row: {
          id: string
          title: string
          body: string
          user_id: string
          created_at: string
          is_anonymous: boolean
        }
        Insert: {
          id?: string
          title: string
          body: string
          user_id: string
          created_at?: string
          is_anonymous?: boolean
        }
        Update: {
          id?: string
          title?: string
          body?: string
          user_id?: string
          created_at?: string
          is_anonymous?: boolean
        }
      }
    }
  }
}