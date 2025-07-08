import { Database } from '@/integrations/supabase/types';

export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type ChallengeInsert = Database['public']['Tables']['challenges']['Insert'];
export type ChallengeUpdate = Database['public']['Tables']['challenges']['Update'];

export type ChallengeParticipant = Database['public']['Tables']['challenge_participants']['Row'];
export type ChallengeParticipantInsert = Database['public']['Tables']['challenge_participants']['Insert'];
export type ChallengeParticipantUpdate = Database['public']['Tables']['challenge_participants']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface ChallengeWithCreator extends Challenge {
  creator?: Profile;
  participant_count?: number;
  user_participation?: ChallengeParticipant;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'extreme';
export type ParticipationStatus = 'active' | 'completed' | 'abandoned';