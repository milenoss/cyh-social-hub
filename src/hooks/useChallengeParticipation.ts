import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChallengeParticipant, ChallengeWithCreator } from '@/lib/supabase-types';
import { useToast } from '@/hooks/use-toast';

export function useChallengeParticipation(challengeId?: string) {
  const [participation, setParticipation] = useState<ChallengeParticipant | null>(null);
  const [challenge, setChallenge] = useState<ChallengeWithCreator | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchParticipation = async () => {
    if (!user || !challengeId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setParticipation(data || null);
      
      // Also fetch the challenge details if we have participation
      if (data) {
        fetchChallengeDetails();
      }
    } catch (error: any) {
      // Only log errors that are not "no rows found" (PGRST116)
      if (error.code !== 'PGRST116') {
        console.error('Error fetching participation:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchChallengeDetails = async () => {
    if (!challengeId) return;
    
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          creator:profiles!challenges_created_by_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('id', challengeId)
        .single();

      if (error) throw error;
      setChallenge(data);
    } catch (error) {
      console.error('Error fetching challenge details:', error);
    }
  };

  const joinChallenge = async () => {
    if (!user || !challengeId) return false;

    const now = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          status: 'active',
          progress: 0, 
          started_at: now,
          last_check_in: null
        })
        .select()
        .single();

      if (error) throw error;

      setParticipation(data);
      toast({
        title: "Success",
        description: "Successfully joined the challenge!",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join challenge",
        variant: "destructive",
      });
      return false;
    }
  };

  const leaveChallenge = async () => {
    if (!user || !challengeId || !participation) return false;

    try {
      const { error } = await supabase
        .from('challenge_participants')
        .delete()
        .eq('id', participation.id);

      if (error) throw error;

      setParticipation(null);
      toast({
        title: "Success",
        description: "Left the challenge successfully",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to leave challenge",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateProgress = async (progress: number, note?: string) => {
    if (!user || !challengeId || !participation) return false;

    const now = new Date().toISOString();
    try {
      const updates: any = { 
        progress,
        last_check_in: now
      };
      
      if (progress >= 100) {
        updates.status = 'completed';
        updates.completed_at = now;
      }

      const { data, error } = await supabase
        .from('challenge_participants')
        .update(updates)
        .eq('id', participation.id)
        .select()
        .single();

      if (error) throw error;

      setParticipation(data);

      // Update user profile stats if completed
      if (updates.status === 'completed') {
        const pointsReward = challenge?.points_reward || 100;
        await supabase.rpc('update_user_stats_on_completion', {
          challenge_points: challenge.points_reward || 100
        });
      }
      
      if (progress >= 100) {
        toast({
          title: "🎉 Challenge Completed!",
          description: "Congratulations on completing this challenge!",
        });
      } else {
        toast({
          title: "Progress Updated",
          description: `Progress updated to ${progress}%`,
        });
      }

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update progress",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchParticipation();
  }, [user, challengeId]);

  return {
    participation,
    loading,
    challenge,
    joinChallenge,
    leaveChallenge,
    updateProgress,
    refetch: fetchParticipation
  };
}