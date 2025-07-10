import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChallengeWithCreator, Challenge, ChallengeInsert, ChallengeUpdate } from '@/lib/supabase-types';
import { useToast } from '@/hooks/use-toast';

interface ChallengeStats {
  participant_count: number;
  completed_count: number;
  active_count: number;
  average_progress: number;
}

export function useChallenges() {
  const [challenges, setChallenges] = useState<ChallengeWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      
      // Try to get challenges with real-time stats
      let data, error;
      
      try {
        // First try to get challenges with real participant stats
        const result = await supabase.rpc('get_challenges_with_stats');
        data = result.data;
        error = result.error;
      } catch (rpcError) {
        console.warn('RPC function not available, falling back to basic query');
        
        // Fallback to basic query
        const result = await supabase
          .from('challenges')
          .select(`
            *,
            creator:profiles!challenges_created_by_fkey(
              id,
              username,
              display_name,
              avatar_url
            ),
            challenge_participants(count)
          `)
          .eq('is_public', true)
          .order('created_at', { ascending: false });
          
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Transform the data to include participant count
      const transformedData = data?.map(challenge => {
        // Check if we have the new stats format or the old format
        if (challenge.stats) {
          // New format with detailed stats
          const stats = challenge.stats as ChallengeStats;
          return {
            ...challenge,
            participant_count: stats.participant_count || 0,
            completed_count: stats.completed_count || 0,
            active_count: stats.active_count || 0,
            average_progress: stats.average_progress || 0
          };
        } else {
          // Old format with just participant count
          return {
            ...challenge,
            participant_count: challenge.challenge_participants?.[0]?.count || 0,
            completed_count: 0,
            active_count: 0,
            average_progress: 0
          };
        }
      }) || [];

      setChallenges(transformedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch challenges",
        variant: "destructive",
      });
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChallenge = async (challengeData: Omit<ChallengeInsert, 'created_by'>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a challenge",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          ...challengeData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Challenge created successfully!",
      });

      fetchChallenges(); // Refresh the list
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create challenge",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateChallenge = async (id: string, updates: ChallengeUpdate) => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Challenge updated successfully!",
      });

      fetchChallenges(); // Refresh the list
      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update challenge",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteChallenge = async (id: string) => {
    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Challenge deleted successfully!",
      });

      fetchChallenges(); // Refresh the list
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete challenge",
        variant: "destructive",
      });
      return false;
    }
  };

  const joinChallenge = async (challengeId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to join challenges",
        variant: "default",
      });
      
      // Redirect to auth page
      window.location.href = '/auth';
      return null;
    }

    try {
      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          status: 'active',
          progress: 0
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully joined the challenge!",
      });

      fetchChallenges(); // Refresh to update participant counts
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

  useEffect(() => {
    // Initial fetch
    fetchChallenges();
    
    // Set up real-time subscription for challenge changes
    const challengesSubscription = supabase
      .channel('challenges-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenges'
        },
        (payload) => {
          console.log('Challenge change received:', payload);
          fetchChallenges(); // Refresh challenges when changes occur
        }
      )
      .subscribe();
      
    // Set up real-time subscription for participant changes
    const participantsSubscription = supabase
      .channel('participants-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_participants'
        },
        (payload) => {
          console.log('Participant change received:', payload);
          fetchChallenges(); // Refresh challenges when participant changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(challengesSubscription);
      supabase.removeChannel(participantsSubscription);
    };
  }, []);

  return {
    challenges,
    loading,
    createChallenge,
    updateChallenge,
    deleteChallenge,
    joinChallenge,
    refetch: fetchChallenges
  };
}