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
      achievements: {
        Row: {
          description: string | null
          earned_at: string | null
          icon: string | null
          id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      areas_catalog: {
        Row: {
          area: number
          area_name: string
          expected_questions: number
          section: string
          subarea: number
          subarea_name: string
        }
        Insert: {
          area: number
          area_name: string
          expected_questions: number
          section: string
          subarea: number
          subarea_name: string
        }
        Update: {
          area?: number
          area_name?: string
          expected_questions?: number
          section?: string
          subarea?: number
          subarea_name?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          id: string
          sent_at: string | null
          status: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          id?: string
          sent_at?: string | null
          status?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          id?: string
          sent_at?: string | null
          status?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          area: number
          back: string
          created_at: string | null
          front: string
          id: string
          is_active: boolean | null
          order_index: number | null
          study_guide_id: string | null
          subarea: number
        }
        Insert: {
          area: number
          back: string
          created_at?: string | null
          front: string
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          study_guide_id?: string | null
          subarea: number
        }
        Update: {
          area?: number
          back?: string
          created_at?: string | null
          front?: string
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          study_guide_id?: string | null
          subarea?: number
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_study_guide_id_fkey"
            columns: ["study_guide_id"]
            isOneToOne: false
            referencedRelation: "study_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_concepts: {
        Row: {
          concept: string
          definition_md: string | null
          guide_id: string
          id: string
          importance: string | null
          related_question_ids: string[] | null
        }
        Insert: {
          concept: string
          definition_md?: string | null
          guide_id: string
          id?: string
          importance?: string | null
          related_question_ids?: string[] | null
        }
        Update: {
          concept?: string
          definition_md?: string | null
          guide_id?: string
          id?: string
          importance?: string | null
          related_question_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_concepts_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_sections: {
        Row: {
          body_md: string | null
          created_at: string | null
          guide_id: string
          id: string
          image_caption: string | null
          image_url: string | null
          metadata: Json | null
          order_in_guide: number
          section_type: string
          title: string | null
        }
        Insert: {
          body_md?: string | null
          created_at?: string | null
          guide_id: string
          id?: string
          image_caption?: string | null
          image_url?: string | null
          metadata?: Json | null
          order_in_guide: number
          section_type: string
          title?: string | null
        }
        Update: {
          body_md?: string | null
          created_at?: string | null
          guide_id?: string
          id?: string
          image_caption?: string | null
          image_url?: string | null
          metadata?: Json | null
          order_in_guide?: number
          section_type?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_sections_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          area_name: string
          area_num: number
          cover_image_url: string | null
          created_at: string | null
          difficulty: string | null
          estimated_minutes: number | null
          id: string
          order_in_area: number | null
          published: boolean | null
          section: string
          short_description: string | null
          slug: string
          subarea_name: string
          subarea_num: number
          title: string
          updated_at: string | null
          weight_in_exam: number | null
        }
        Insert: {
          area_name: string
          area_num: number
          cover_image_url?: string | null
          created_at?: string | null
          difficulty?: string | null
          estimated_minutes?: number | null
          id?: string
          order_in_area?: number | null
          published?: boolean | null
          section: string
          short_description?: string | null
          slug: string
          subarea_name: string
          subarea_num: number
          title: string
          updated_at?: string | null
          weight_in_exam?: number | null
        }
        Update: {
          area_name?: string
          area_num?: number
          cover_image_url?: string | null
          created_at?: string | null
          difficulty?: string | null
          estimated_minutes?: number | null
          id?: string
          order_in_area?: number | null
          published?: boolean | null
          section?: string
          short_description?: string | null
          slug?: string
          subarea_name?: string
          subarea_num?: number
          title?: string
          updated_at?: string | null
          weight_in_exam?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_link: string | null
          body: string | null
          created_at: string | null
          icon: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_link?: string | null
          body?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_link?: string | null
          body?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          max_students: number | null
          name: string
          plan: string | null
          plan_expires_at: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_students?: number | null
          name: string
          plan?: string | null
          plan_expires_at?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          max_students?: number | null
          name?: string
          plan?: string | null
          plan_expires_at?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          diagnostic_score: Json | null
          email: string
          exam_date: string | null
          full_name: string | null
          goal_level: string | null
          id: string
          last_activity_date: string | null
          level: number | null
          notification_prefs: Json | null
          onboarding_completed: boolean | null
          org_role: string | null
          organization_id: string | null
          plan: string | null
          plan_expires_at: string | null
          role: string
          streak_current: number | null
          streak_freeze_count: number | null
          streak_max: number | null
          university: string | null
          updated_at: string | null
          xp_total: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          diagnostic_score?: Json | null
          email: string
          exam_date?: string | null
          full_name?: string | null
          goal_level?: string | null
          id: string
          last_activity_date?: string | null
          level?: number | null
          notification_prefs?: Json | null
          onboarding_completed?: boolean | null
          org_role?: string | null
          organization_id?: string | null
          plan?: string | null
          plan_expires_at?: string | null
          role?: string
          streak_current?: number | null
          streak_freeze_count?: number | null
          streak_max?: number | null
          university?: string | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          diagnostic_score?: Json | null
          email?: string
          exam_date?: string | null
          full_name?: string | null
          goal_level?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          notification_prefs?: Json | null
          onboarding_completed?: boolean | null
          org_role?: string | null
          organization_id?: string | null
          plan?: string | null
          plan_expires_at?: string | null
          role?: string
          streak_current?: number | null
          streak_freeze_count?: number | null
          streak_max?: number | null
          university?: string | null
          updated_at?: string | null
          xp_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      question_feedback: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_feedback_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          question_id: string
          reason: string
          reported_by: string
          reviewed_at: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          question_id: string
          reason: string
          reported_by: string
          reviewed_at?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          question_id?: string
          reason?: string
          reported_by?: string
          reviewed_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          area: number
          area_name: string
          correct_answer: string
          created_at: string | null
          created_by: string | null
          diagram: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_deleted: boolean | null
          is_pilot: boolean | null
          option_a: string
          option_a_diagram: string | null
          option_a_image: string | null
          option_b: string
          option_b_diagram: string | null
          option_b_image: string | null
          option_c: string
          option_c_diagram: string | null
          option_c_image: string | null
          question_text: string
          section: string
          stimulus_id: string | null
          subarea: number
          subarea_name: string
          tags: string[] | null
          times_correct: number | null
          times_seen: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          area: number
          area_name: string
          correct_answer: string
          created_at?: string | null
          created_by?: string | null
          diagram?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_pilot?: boolean | null
          option_a: string
          option_a_diagram?: string | null
          option_a_image?: string | null
          option_b: string
          option_b_diagram?: string | null
          option_b_image?: string | null
          option_c: string
          option_c_diagram?: string | null
          option_c_image?: string | null
          question_text: string
          section: string
          stimulus_id?: string | null
          subarea: number
          subarea_name: string
          tags?: string[] | null
          times_correct?: number | null
          times_seen?: number | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          area?: number
          area_name?: string
          correct_answer?: string
          created_at?: string | null
          created_by?: string | null
          diagram?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          is_pilot?: boolean | null
          option_a?: string
          option_a_diagram?: string | null
          option_a_image?: string | null
          option_b?: string
          option_b_diagram?: string | null
          option_b_image?: string | null
          option_c?: string
          option_c_diagram?: string | null
          option_c_image?: string | null
          question_text?: string
          section?: string
          stimulus_id?: string | null
          subarea?: number
          subarea_name?: string
          tags?: string[] | null
          times_correct?: number | null
          times_seen?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_stimulus_id_fkey"
            columns: ["stimulus_id"]
            isOneToOne: false
            referencedRelation: "stimuli"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answered_at: string | null
          id: string
          is_correct: boolean | null
          is_marked: boolean | null
          order_in_quiz: number
          question_id: string
          session_id: string
          time_spent_seconds: number | null
          user_answer: string | null
        }
        Insert: {
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_marked?: boolean | null
          order_in_quiz: number
          question_id: string
          session_id: string
          time_spent_seconds?: number | null
          user_answer?: string | null
        }
        Update: {
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          is_marked?: boolean | null
          order_in_quiz?: number
          question_id?: string
          session_id?: string
          time_spent_seconds?: number | null
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          areas: number[] | null
          correct_answers: number | null
          estimated_level: string | null
          finished_at: string | null
          id: string
          last_question_index: number | null
          mode: string
          question_ids: string[] | null
          score_percent: number | null
          session_number: number | null
          simulacro_group_id: string | null
          skipped: number | null
          started_at: string | null
          status: string | null
          subareas: number[] | null
          time_limit_seconds: number | null
          time_taken_seconds: number | null
          total_questions: number
          user_id: string
          wrong_answers: number | null
          xp_earned: number | null
        }
        Insert: {
          areas?: number[] | null
          correct_answers?: number | null
          estimated_level?: string | null
          finished_at?: string | null
          id?: string
          last_question_index?: number | null
          mode: string
          question_ids?: string[] | null
          score_percent?: number | null
          session_number?: number | null
          simulacro_group_id?: string | null
          skipped?: number | null
          started_at?: string | null
          status?: string | null
          subareas?: number[] | null
          time_limit_seconds?: number | null
          time_taken_seconds?: number | null
          total_questions: number
          user_id: string
          wrong_answers?: number | null
          xp_earned?: number | null
        }
        Update: {
          areas?: number[] | null
          correct_answers?: number | null
          estimated_level?: string | null
          finished_at?: string | null
          id?: string
          last_question_index?: number | null
          mode?: string
          question_ids?: string[] | null
          score_percent?: number | null
          session_number?: number | null
          simulacro_group_id?: string | null
          skipped?: number | null
          started_at?: string | null
          status?: string | null
          subareas?: number[] | null
          time_limit_seconds?: number | null
          time_taken_seconds?: number | null
          total_questions?: number
          user_id?: string
          wrong_answers?: number | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_concepts: {
        Row: {
          area: number
          created_at: string
          exam_id: string
          guide_slug: string | null
          id: string
          is_active: boolean
          label: string
          section: string
          sort_order: number
          subarea: number
        }
        Insert: {
          area: number
          created_at?: string
          exam_id?: string
          guide_slug?: string | null
          id?: string
          is_active?: boolean
          label: string
          section: string
          sort_order?: number
          subarea: number
        }
        Update: {
          area?: number
          created_at?: string
          exam_id?: string
          guide_slug?: string | null
          id?: string
          is_active?: boolean
          label?: string
          section?: string
          sort_order?: number
          subarea?: number
        }
        Relationships: []
      }
      user_concept_mastery: {
        Row: {
          concept_id: string
          exam_id: string
          mastered_at: string
          user_id: string
        }
        Insert: {
          concept_id: string
          exam_id?: string
          mastered_at?: string
          user_id: string
        }
        Update: {
          concept_id?: string
          exam_id?: string
          mastered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_concept_mastery_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "syllabus_concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      stimuli: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          subarea_context: string
          text_type: string
          title: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          subarea_context: string
          text_type: string
          title?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          subarea_context?: string
          text_type?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stimuli_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          daily_challenge_completed: boolean | null
          date: string
          id: string
          questions_answered: number | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          daily_challenge_completed?: boolean | null
          date: string
          id?: string
          questions_answered?: number | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          daily_challenge_completed?: boolean | null
          date?: string
          id?: string
          questions_answered?: number | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_guides: {
        Row: {
          area: number
          ceneval_tips: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_deleted: boolean | null
          is_published: boolean | null
          order_index: number | null
          reading_time_minutes: number | null
          section: string
          subarea: number
          summary: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          area: number
          ceneval_tips?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          reading_time_minutes?: number | null
          section: string
          subarea: number
          summary?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          area?: number
          ceneval_tips?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_deleted?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          reading_time_minutes?: number | null
          section?: string
          subarea?: number
          summary?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_guides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_flashcard_progress: {
        Row: {
          ease_factor: number | null
          flashcard_id: string
          id: string
          last_seen: string | null
          next_review: string | null
          times_correct: number | null
          times_seen: number | null
          user_id: string
        }
        Insert: {
          ease_factor?: number | null
          flashcard_id: string
          id?: string
          last_seen?: string | null
          next_review?: string | null
          times_correct?: number | null
          times_seen?: number | null
          user_id: string
        }
        Update: {
          ease_factor?: number | null
          flashcard_id?: string
          id?: string
          last_seen?: string | null
          next_review?: string | null
          times_correct?: number | null
          times_seen?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_flashcard_progress_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_flashcard_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_guide_progress: {
        Row: {
          completed_at: string | null
          guide_id: string
          last_section_id: string | null
          percent_read: number | null
          started_at: string | null
          status: string | null
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          guide_id: string
          last_section_id?: string | null
          percent_read?: number | null
          started_at?: string | null
          status?: string | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          guide_id?: string
          last_section_id?: string | null
          percent_read?: number | null
          started_at?: string | null
          status?: string | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_guide_progress_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          study_guide_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          study_guide_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          study_guide_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_study_guide_id_fkey"
            columns: ["study_guide_id"]
            isOneToOne: false
            referencedRelation: "study_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          accuracy_percent: number | null
          area: number
          id: string
          last_practiced: string | null
          mastery_level: string | null
          questions_attempted: number | null
          questions_correct: number | null
          subarea: number
          user_id: string
        }
        Insert: {
          accuracy_percent?: number | null
          area: number
          id?: string
          last_practiced?: string | null
          mastery_level?: string | null
          questions_attempted?: number | null
          questions_correct?: number | null
          subarea: number
          user_id: string
        }
        Update: {
          accuracy_percent?: number | null
          area?: number
          id?: string
          last_practiced?: string | null
          mastery_level?: string | null
          questions_attempted?: number | null
          questions_correct?: number | null
          subarea?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: { Args: never; Returns: string }
      get_my_rank: {
        Args: { p_sort_by?: string; p_user_id: string }
        Returns: {
          rank: number
          total_players: number
        }[]
      }
      get_top_players: {
        Args: { p_limit?: number; p_sort_by?: string }
        Returns: {
          avatar_url: string
          full_name: string
          level: number
          rank: number
          streak_current: number
          streak_max: number
          user_id: string
          xp_total: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      question_feedback_counts: {
        Args: never
        Returns: {
          area: number
          confusa: number
          desactualizada: number
          mal_redactada: number
          muy_facil: number
          question_id: string
          question_text: string
          respuestas_obvias: number
          total: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
