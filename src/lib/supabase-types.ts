import { Database } from '@/integrations/supabase/types';

export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type ChallengeInsert = Database['public']['Tables']['challenges']['Insert'];
export type ChallengeUpdate = Database['public']['Tables']['challenges']['Update'];

export interface ChallengeParticipant extends Database['public']['Tables']['challenge_participants']['Row'] {
  last_check_in?: string | null;
  check_in_streak?: number;
  check_in_notes?: any[];
}

export type ChallengeParticipantInsert = Database['public']['Tables']['challenge_participants']['Insert'];
export type ChallengeParticipantUpdate = Database['public']['Tables']['challenge_participants']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ChallengeWithCreator extends Challenge {
  creator?: Profile;
  participant_count?: number;
  completed_count?: number;
  active_count?: number;
  average_progress?: number;
  user_participation?: ChallengeParticipant;
}

export interface ChallengeParticipationWithChallenge extends ChallengeParticipant {
  challenge: ChallengeWithCreator;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'extreme';
export type ParticipationStatus = 'active' | 'completed' | 'abandoned';

export interface ChallengeComment {
  id: string;
  challenge_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  is_pinned: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  is_liked?: boolean;
  replies?: ChallengeComment[];
  can_edit?: boolean;
  can_pin?: boolean;
}

export interface ChallengeActivity {
  id: string;
  challenge_id: string;
  user_id: string;
  activity_type: 'join' | 'progress' | 'complete' | 'comment' | 'like';
  activity_data: any;
  created_at: string;
  user: {
    id: string;
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}