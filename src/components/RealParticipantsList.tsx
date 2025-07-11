import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Play, 
  RefreshCw,
  Trophy,
  Medal,
  Award
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Participant {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  progress: number;
  status: 'active' | 'completed' | 'abandoned';
  joined_at: string;
  last_check_in: string | null;
  check_in_streak: number;
}

interface RealParticipantsListProps {
  challengeId: string;
  currentUserId?: string;
  showAsLeaderboard?: boolean;
  limit?: number;
}

export function RealParticipantsList({ 
  challengeId, 
  currentUserId,
  showAsLeaderboard = false,
  limit = 20
}: RealParticipantsListProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    active: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchParticipants();
    
    // Set up real-time subscription for participant changes
    const participantsSubscription = supabase
      .channel('challenge-participants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_participants',
          filter: `challenge_id=eq.${challengeId}`
        },
        (payload) => {
          console.log('Participant change received:', payload);
          fetchParticipants(); // Refresh participants when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsSubscription);
    };
  }, [challengeId]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First try to get participants with the RPC function
      try {
        const { data, error } = await supabase.rpc('get_real_challenge_participants', {
          challenge_id_param: challengeId
        });

        if (error) throw error;
        
        if (data && data.success) {
          setParticipants(data.participants || []);
          setStats({
            total: data.total_count || 0,
            completed: data.completed_count || 0,
            active: data.active_count || 0
          });
          return;
        }
      } catch (rpcError) {
        console.warn('RPC function not available, falling back to direct query:', rpcError);
      }
      
      // Fallback to direct query if RPC fails
      const { data, error } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          profiles:user_id(
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('challenge_id', challengeId);
        
      if (error) throw error;
      
      if (data) {
        // Transform the data to match the expected format
        const transformedData = data.map(participant => ({
          id: participant.id,
          user_id: participant.user_id,
          username: participant.profiles?.username || `user_${participant.user_id.substring(0, 8)}`,
          display_name: participant.profiles?.display_name || participant.profiles?.username || 'Anonymous User',
          avatar_url: participant.profiles?.avatar_url,
          progress: participant.progress || 0,
          status: participant.status,
          joined_at: participant.started_at || participant.created_at,
          last_check_in: participant.last_check_in,
          check_in_streak: participant.check_in_streak || 0
        }));
        
        setParticipants(transformedData);
        setStats({
          total: transformedData.length,
          completed: transformedData.filter(p => p.status === 'completed').length,
          active: transformedData.filter(p => p.status === 'active').length
        });
      }
    } catch (err: any) {
      console.error('Error fetching participants:', err);
      setError('Failed to load participants. Please try again later.');
      
      // Fallback to mock data for development
      const mockParticipants = [
        { id: '1', user_id: '1', username: 'challenger1', display_name: 'Alex Chen', avatar_url: null, progress: 85, status: 'active', joined_at: '2024-01-15', last_check_in: new Date().toISOString(), check_in_streak: 5 },
        { id: '2', user_id: '2', username: 'fitnessfan', display_name: 'Sarah Johnson', avatar_url: null, progress: 92, status: 'active', joined_at: '2024-01-14', last_check_in: new Date().toISOString(), check_in_streak: 7 },
        { id: '3', user_id: '3', username: 'mindful_mike', display_name: 'Mike Wilson', avatar_url: null, progress: 100, status: 'completed', joined_at: '2024-01-10', last_check_in: new Date().toISOString(), check_in_streak: 10 },
        { id: '4', user_id: '4', username: 'growth_guru', display_name: 'Emma Davis', avatar_url: null, progress: 67, status: 'active', joined_at: '2024-01-16', last_check_in: new Date().toISOString(), check_in_streak: 3 },
      ];
      
      if (import.meta.env.DEV) {
        setParticipants(mockParticipants);
        setStats({
          total: mockParticipants.length,
          completed: mockParticipants.filter(p => p.status === 'completed').length,
          active: mockParticipants.filter(p => p.status === 'active').length
        });
        setError(null); // Clear error in dev mode when using mock data
      }
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-muted rounded"></div>
                    <div className="h-3 w-16 bg-muted rounded"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-muted rounded"></div>
                  <div className="h-2 w-20 bg-muted rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 text-red-800">
        <p className="font-medium">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchParticipants} 
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg">
        <p className="text-muted-foreground mb-2">No participants yet</p>
        <p className="text-sm text-muted-foreground">Be the first to join this challenge!</p>
      </div>
    );
  }

  // Sort participants by progress for leaderboard
  const sortedParticipants = [...participants].sort((a, b) => {
    // Completed participants first
    if (a.status === 'completed' && b.status !== 'completed') return -1;
    if (a.status !== 'completed' && b.status === 'completed') return 1;
    
    // Then by progress
    return b.progress - a.progress;
  });

  // Limit the number of participants shown
  const displayParticipants = sortedParticipants.slice(0, limit);

  return (
    <div className="space-y-3">
      {!showAsLeaderboard && (
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-3 md:mb-4">
          <Card>
            <CardContent className="p-2 md:p-3 text-center">
              <p className="text-base md:text-lg font-bold">{stats.total}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 md:p-3 text-center">
              <p className="text-base md:text-lg font-bold text-green-600">{stats.completed}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 md:p-3 text-center">
              <p className="text-base md:text-lg font-bold text-blue-600">{stats.active}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
        </div>
      )}

      {displayParticipants.map((participant, index) => (
        <Card 
          key={participant.id} 
          className={participant.user_id === currentUserId ? "border-primary/50 bg-primary/5" : ""}
        >
          <CardContent className="p-2 md:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                {showAsLeaderboard && (
                  <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-full">
                    {getRankIcon(index + 1)}
                  </div>
                )}
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarImage src={participant.avatar_url || ""} />
                  <AvatarFallback>
                    {participant.display_name?.[0] || participant.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm md:text-base">{participant.display_name || participant.username}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">@{participant.username}</p>
                  {participant.user_id === currentUserId && (
                    <Badge variant="secondary" className="text-[10px] md:text-xs mt-1">You</Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
                  <Badge 
                    variant={participant.status === 'completed' ? 'default' : 'secondary'}
                    className="text-[10px] md:text-xs"
                  >
                    {participant.status === 'completed' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Active
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <Progress value={participant.progress} className="w-16 md:w-20 h-1.5 md:h-2" />
                  <span className="text-xs md:text-sm font-medium">{participant.progress}%</span>
                </div>
                {participant.check_in_streak > 0 && (
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
                    {participant.check_in_streak} day streak
                  </p>
                )}
                {participant.last_check_in && (
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
                    Last active: {format(new Date(participant.last_check_in), 'MMM d')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {participants.length > limit && (
        <div className="text-center pt-2">
          <Button variant="outline" size="sm">
            View All {participants.length} Participants
          </Button>
        </div>
      )}
    </div>
  );
}