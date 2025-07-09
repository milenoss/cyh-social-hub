import { Database } from '@/integrations/supabase/types';

export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type ChallengeInsert = Database['public']['Tables']['challenges']['Insert'];
export type ChallengeUpdate = Database['public']['Tables']['challenges']['Update'];
  last_check_in?: string | null;
export interface ChallengeParticipant extends Database['public']['Tables']['challenge_participants']['Row'] {
  last_check_in?: string | null;
  check_in_streak?: number;
  check_in_notes?: any[];
}
export interface ChallengeParticipant extends Database['public']['Tables']['challenge_participants']['Row'] {
  last_check_in?: string | null;
}
export type ChallengeParticipantInsert = Database['public']['Tables']['challenge_participants']['Insert'];
export type ChallengeParticipantUpdate = Database['public']['Tables']['challenge_participants']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ChallengeWithCreator extends Challenge {
  creator?: Profile;
  participant_count?: number;
  user_participation?: ChallengeParticipant;
}

export interface ChallengeParticipationWithChallenge extends ChallengeParticipant {
  challenge: ChallengeWithCreator;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'extreme';
export type ParticipationStatus = 'active' | 'completed' | 'abandoned';