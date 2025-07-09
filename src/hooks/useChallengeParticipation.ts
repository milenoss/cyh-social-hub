import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChallengeParticipant, ChallengeWithCreator } from '@/lib/supabase-types';
import { useToast } from '@/hooks/use-toast';

export function useChallengeParticipation(challengeId?: string) {
  const [participation, setParticipation] = useState<ChallengeParticipant | null>(null);
  const [challenge, setChallenge] = useState<ChallengeWithCreator | null>(null);
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
      // Use the check_in_challenge function
      const { data, error } = await supabase.rpc('check_in_challenge', {
        challenge_id_param: challengeId,
        note_text: note || null
      });

      setParticipation(null);
      toast({

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
      // Use the check_in_challenge function
      const { data, error } = await supabase.rpc('check_in_challenge', {
        challenge_id_param: challengeId,
        note_text: note || null
      });

      if (error) throw error;

      if (data.success) {
        // Update local state with the returned participation data
        setParticipation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            progress: data.participation.progress,
            status: data.participation.status,
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
        // Handle already checked in case
        if (data.message === "Already checked in today") {
          toast({
            title: "Already Checked In",
            description: "You've already checked in today for this challenge.",
          });
          return false;
        }
        
        throw new Error(data.message || "Failed to update progress");
        
    } catch (error: any) {
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
      const { data, error } = await supabase.rpc('get_challenge_history', {
        challenge_id_param: challengeId
      });

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

  const getChallengeHistory = async () => {
    if (!user || !challengeId) return null;

    try {
      const { data, error } = await supabase.rpc('get_challenge_history', {
        challenge_id_param: challengeId
      });

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

  useEffect(() => {
    fetchParticipation();
  }, [user, challengeId]);

  return {
    participation,
    loading,
    challenge,
    challenge,
    joinChallenge,
    leaveChallenge,
    updateProgress,
    getChallengeHistory,
    getChallengeHistory,
    refetch: fetchParticipation
  };
}