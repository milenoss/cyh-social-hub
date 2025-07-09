import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { ChallengeWithCreator, Profile, ChallengeParticipant, ChallengeParticipationWithChallenge } from '@/lib/supabase-types';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  challengesCompleted: number;
  activeChallenges: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
}

export function useDashboard() {
  const { profile } = useProfile();
  const [userChallenges, setUserChallenges] = useState<ChallengeWithCreator[]>([]);
  const [participatedChallenges, setParticipatedChallenges] = useState<ChallengeParticipationWithChallenge[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    challengesCompleted: 0,
    activeChallenges: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalPoints: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUserChallenges = async () => {
    if (!user) return;

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
          ),
          challenge_participants(count)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include participant count
      const transformedData = data?.map(challenge => ({
        ...challenge,
        participant_count: challenge.challenge_participants?.[0]?.count || 0
      })) || [];

      setUserChallenges(transformedData);
    } catch (error: any) {
      console.error('Error fetching user challenges:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your challenges",
        variant: "destructive",
      });
    }
  };

  const fetchParticipatedChallenges = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          challenge:challenges(
            *,
            creator:profiles!challenges_created_by_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParticipatedChallenges(data || []);
    } catch (error: any) {
      console.error('Error fetching participated challenges:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your participated challenges",
        variant: "destructive",
      });
    }
  };

  const calculateStats = () => {
    if (!profile || !participatedChallenges) return;

    const completed = participatedChallenges.filter(p => p.status === 'completed').length;
    const active = participatedChallenges.filter(p => p.status === 'active').length;
    
    setStats({
      challengesCompleted: completed,
      activeChallenges: active,
      currentStreak: profile.current_streak || 0,
      longestStreak: profile.longest_streak || 0,
      totalPoints: profile.total_points || 0
    });
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchUserChallenges(),
        fetchParticipatedChallenges()
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    calculateStats();
  }, [profile, participatedChallenges]);

  return {
    profile,
    userChallenges,
    participatedChallenges,
    stats,
    loading,
    refetch: fetchDashboardData
  };
}