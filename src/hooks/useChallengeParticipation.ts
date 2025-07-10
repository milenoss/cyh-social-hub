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
    if (!user || !challengeId) return false;

    try {
      const { error } = await supabase
        .from('challenge_participants')
        .delete()
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id);

      if (error) throw error;

      setParticipation(null);
      toast({
        title: "Success",
        description: "Successfully left the challenge!",
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
    if (!user || !challengeId) return false;

    try {
      // First check if the RPC function exists, if not use direct table update
      let data, error;
      
      try {
        // Try to use the RPC function first
        const rpcResult = await supabase.rpc('check_in_challenge', {
          challenge_id_param: challengeId,
          note_text: note || null
        });
        data = rpcResult.data;
        error = rpcResult.error;
      } catch (rpcError: any) {
        // If RPC function doesn't exist, fall back to manual implementation
        if (rpcError.message?.includes('Could not find the function')) {
          console.warn('RPC function not found, using fallback implementation');
          
          // Check if user already checked in today
          const today = new Date().toISOString().split('T')[0];
          const { data: existingParticipation } = await supabase
            .from('challenge_participants')
            .select('last_check_in, check_in_streak, progress, status')
            .eq('challenge_id', challengeId)
            .eq('user_id', user.id)
            .single();
          
          if (existingParticipation?.last_check_in) {
            const lastCheckIn = new Date(existingParticipation.last_check_in).toISOString().split('T')[0];
            if (lastCheckIn === today) {
              data = {
                success: false,
                message: "Already checked in today"
              };
              error = null;
            }
          }
          
          if (!data) {
            // Calculate new progress and streak
            const newProgress = Math.min((existingParticipation?.progress || 0) + (100 / 30), 100); // Assuming 30-day challenge
            const newStreak = (existingParticipation?.check_in_streak || 0) + 1;
            const newStatus = newProgress >= 100 ? 'completed' : 'active';
            
            // Update the participation record
            const { data: updatedData, error: updateError } = await supabase
              .from('challenge_participants')
              .update({
                progress: newProgress,
                status: newStatus,
                last_check_in: new Date().toISOString(),
                check_in_streak: newStreak,
                check_in_notes: note ? 
                  supabase.rpc('array_append', { 
                    arr: existingParticipation?.check_in_notes || [], 
                    elem: { date: today, note } 
                  }) : 
                  existingParticipation?.check_in_notes || []
              })
              .eq('challenge_id', challengeId)
              .eq('user_id', user.id)
              .select()
              .single();
            
            if (updateError) throw updateError;
            
            data = {
              success: true,
              participation: {
                progress: newProgress,
                status: newStatus,
                last_check_in: new Date().toISOString(),
                check_in_streak: newStreak
              }
            };
            error = null;
          }
        } else {
          throw rpcError;
        }
      }

      if (error) throw error;

      if (data.success) {
        // Update local state with the returned participation data
        setParticipation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            progress: data.participation.progress,
            status: data.participation.status,
            last_check_in: data.participation.last_check_in,
            check_in_streak: data.participation.check_in_streak
          };
        });

        // Show appropriate toast message
        if (data.participation.progress >= 100) {
          toast({
            title: "🎉 Challenge Completed!",
            description: "Congratulations on completing this challenge!",
          });
        } else {
          toast({
            title: "Check-in Successful",
            description: `Progress updated to ${data.participation.progress}%`,
          });
        }

        return true;
      } else {
        // Handle already checked in case
        if (data.message === "Already checked in today") {
          toast({
            title: "Already Checked In",
            description: "You've already checked in today for this challenge.",
          });
          return false;
        }
        
        throw new Error(data.message || "Failed to update progress");
      }
    } catch (error: any) {
      console.error('Progress update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update progress",
        variant: "destructive",
      });
      return false;
    }
  };

  const getChallengeHistory = async () => {
    if (!user || !challengeId) return null;

    try {
      // Try RPC function first, fall back to direct query if not available
      let data, error;
      
      try {
        const rpcResult = await supabase.rpc('get_challenge_history', {
          challenge_id_param: challengeId
        });
        data = rpcResult.data;
        error = rpcResult.error;
      } catch (rpcError: any) {
        if (rpcError.message?.includes('Could not find the function')) {
          console.warn('get_challenge_history RPC function not found, using fallback');
          
          // Fallback: get participation data directly
          const { data: participationData, error: participationError } = await supabase
            .from('challenge_participants')
            .select('*')
            .eq('challenge_id', challengeId)
            .eq('user_id', user.id)
            .single();
          
          if (participationError) throw participationError;
          
          data = {
            success: true,
            participation: participationData,
            history: participationData?.check_in_notes || []
          };
          error = null;
        } else {
          throw rpcError;
        }
      }

      if (error) throw error;

      if (data.success) {
        return data;
      } else {
        throw new Error(data.message || "Failed to get challenge history");
      }
    } catch (error: any) {
      console.error('Error getting challenge history:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get challenge history",
        variant: "destructive",
      });
      return null;
    }
  };

  // Set up real-time subscription for participation changes
  useEffect(() => {
    if (!challengeId || !user) return;
    
    const participationSubscription = supabase
      .channel(`participation-${challengeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_participants',
          filter: `challenge_id=eq.${challengeId}` 
        },
        (payload) => {
          console.log('Participation change received:', payload);
          // Only update if it's for the current user
          if (payload.new && payload.new.user_id === user.id) {
            fetchParticipation();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participationSubscription);
    };
  }, [challengeId, user]);

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
    getChallengeHistory,
    refetch: fetchParticipation
  };
}