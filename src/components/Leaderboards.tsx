import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Crown, 
  Medal, 
  Target, 
  Flame, 
  TrendingUp,
  Calendar,
  Users,
  Award,
  Star,
  Zap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LeaderboardUser {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  rank: number;
  score: number;
  challenges_completed?: number;
  total_points?: number;
  change: number; // Position change from last period
  badge?: string;
}

interface LeaderboardsProps {
  challengeId?: string; // If provided, show challenge-specific leaderboard
}


const badgeColors = {
  legend: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
  master: "bg-gradient-to-r from-purple-400 to-purple-600 text-white",
  expert: "bg-gradient-to-r from-blue-400 to-blue-600 text-white",
  gold: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
  silver: "bg-gradient-to-r from-gray-300 to-gray-500 text-white",
  bronze: "bg-gradient-to-r from-amber-500 to-amber-700 text-white"
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
  }
};

const getChangeIndicator = (change: number) => {
  if (change > 0) {
    return <TrendingUp className="h-4 w-4 text-green-600" />;
  } else if (change < 0) {
    return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
  }
  return <div className="w-4 h-4" />; // Placeholder for no change
};

export function Leaderboards({ challengeId }: LeaderboardsProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("global");
  const [timeframe, setTimeframe] = useState("all-time");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [challengeTitle, setChallengeTitle] = useState("");
  const { toast } = useToast();

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      let data;
      
      if (challengeId) {
        // Fetch challenge-specific leaderboard
        const { data: response, error } = await supabase.rpc('get_challenge_leaderboard', {
          challenge_id_param: challengeId,
          limit_count: 10,
          offset_count: 0
        });
        
        if (error) throw error;
        
        if (response && response.success) {
          data = response;
          setChallengeTitle(response.challenge_title || "Challenge Leaderboard");
        } else {
          throw new Error(response.message || "Failed to fetch leaderboard");
        }
      } else {
        // Fetch global or streak leaderboard based on active tab
        if (activeTab === "streaks") {
          const { data: response, error } = await supabase.rpc('get_streak_leaderboard', {
            limit_count: 10,
            offset_count: 0
          });
          
          if (error) throw error;
          
          if (response && response.success) {
            data = response;
          } else {
            throw new Error(response.message || "Failed to fetch streak leaderboard");
          }
        } else {
          // Global leaderboard
          const { data: response, error } = await supabase.rpc('get_global_leaderboard', {
            timeframe: timeframe,
            limit_count: 10,
            offset_count: 0
          });
          
          if (error) throw error;
          
          if (response && response.success) {
            data = response;
          } else {
            throw new Error(response.message || "Failed to fetch global leaderboard");
          }
        }
      }
      
      if (data) {
        setLeaderboardData(data.leaderboard || []);
        setUserRank(data.user_rank || null);
        setTotalCount(data.total || 0);
      }
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch leaderboard data",
        variant: "destructive",
      });
      setLeaderboardData([]);
      setUserRank(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [challengeId, activeTab, timeframe]);

  const getScoreLabel = () => {
    switch (activeTab) {
      case "global":
        return "Points";
      case "streaks":
        return "Days";
      case "challenges":
        return "Completed";
      default:
        return "Score";
    }
  };

  const getLeaderboardTitle = () => {
    if (challengeId) return "Challenge Leaderboard";
    switch (activeTab) {
      case "global":
        return "Global Leaderboard";
      case "streaks":
        return "Streak Leaders";
      case "challenges":
        return "Challenge Champions";
      default:
        return "Leaderboard";
    }
  };

  const getLeaderboardDescription = () => {
    if (challengeId) return "Top performers in this challenge";
    switch (activeTab) {
      case "global":
        return "Top performers across all challenges";
      case "streaks":
        return "Longest current streaks";
      case "challenges":
        return "Most challenges completed";
      default:
        return "Rankings and achievements";
    }
  };

  // Get score value based on the active tab
  const getScoreValue = (user: LeaderboardUser) => {
    if (challengeId) {
      return user.score; // Progress for challenge leaderboard
    }
    
    switch (activeTab) {
      case "global":
        return user.total_points || user.score;
      case "streaks":
        return user.current_streak || user.score;
      case "challenges":
        return user.challenges_completed || user.score;
      default:
        return user.score;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {getLeaderboardTitle()}
              </CardTitle>
              <CardDescription>
                {getLeaderboardDescription()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={timeframe === "all-time" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe("all-time")}
              >
                All Time
              </Button>
              <Button
                variant={timeframe === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe("monthly")}
              >
                This Month
              </Button>
              <Button
                variant={timeframe === "weekly" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe("weekly")}
              >
                This Week
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* User's Current Position */}
      {userRank && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {getRankIcon(userRank.rank)}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userRank.avatar_url} />
                  <AvatarFallback>
                    {userRank.display_name[0] || userRank.username[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Your Position</p>
                  <p className="text-sm text-muted-foreground">
                    #{userRank.rank} • {getScoreValue(userRank)} {getScoreLabel().toLowerCase()}
                  </p>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {getChangeIndicator(userRank.change)}
                {userRank.change !== 0 && (
                  <span className={`text-sm ${userRank.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(userRank.change)} {userRank.change > 0 ? 'up' : 'down'}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Tabs */}
      {!challengeId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Global
            </TabsTrigger>
            <TabsTrigger value="streaks" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Streaks
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Challenges
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Leaderboard List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-0">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                  <div className="flex items-center justify-center w-12">
                    <div className="h-6 w-6 rounded-full bg-muted animate-pulse"></div>
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded-md"></div>
                      <div className="h-3 w-24 bg-muted animate-pulse rounded-md"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-6 w-16 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-3 w-12 bg-muted animate-pulse rounded-md mt-1"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="p-8 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground">
                {challengeId 
                  ? "No participants in this challenge yet." 
                  : activeTab === "streaks" 
                    ? "No active streaks found."
                    : "No leaderboard data available."}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {leaderboardData.map((leaderboardUser) => (
                <div
                  key={leaderboardUser.id}
                  className={`flex items-center gap-4 p-4 border-b last:border-b-0 transition-colors hover:bg-muted/50 ${
                    leaderboardUser.user_id === user?.id ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12">
                    {getRankIcon(leaderboardUser.rank)}
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={leaderboardUser.avatar_url} />
                      <AvatarFallback>
                        {leaderboardUser.display_name[0] || leaderboardUser.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{leaderboardUser.display_name}</p>
                        {leaderboardUser.badge && (
                          <Badge className={`text-xs ${badgeColors[leaderboardUser.badge as keyof typeof badgeColors]}`}>
                            {leaderboardUser.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{leaderboardUser.username}</p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className="text-lg font-bold">{getScoreValue(leaderboardUser).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{getScoreLabel()}</p>
                  </div>

                  {/* Change Indicator */}
                  <div className="flex items-center gap-1 w-16 justify-end">
                    {getChangeIndicator(leaderboardUser.change)}
                    {leaderboardUser.change !== 0 && (
                      <span className={`text-xs ${leaderboardUser.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(leaderboardUser.change)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performers Spotlight */}
      {!loading && leaderboardData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Top Performers
            </CardTitle>
            <CardDescription>
              Celebrating our community champions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {leaderboardData.slice(0, 3).map((leaderboardUser, index) => (
                <Card key={leaderboardUser.id} className={`text-center ${index === 0 ? 'border-yellow-200 bg-yellow-50/50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      {getRankIcon(leaderboardUser.rank)}
                    </div>
                    <Avatar className="h-16 w-16 mx-auto mb-3">
                      <AvatarImage src={leaderboardUser.avatar_url} />
                      <AvatarFallback className="text-lg">
                        {leaderboardUser.display_name[0] || leaderboardUser.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{leaderboardUser.display_name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">@{leaderboardUser.username}</p>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">{getScoreValue(leaderboardUser).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{getScoreLabel()}</p>
                    </div>
                    {leaderboardUser.badge && (
                      <Badge className={`mt-2 ${badgeColors[leaderboardUser.badge as keyof typeof badgeColors]}`}>
                        {leaderboardUser.badge}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competition Stats */}
      {!loading && leaderboardData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-sm text-muted-foreground">Active Competitors</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {leaderboardData.reduce((sum, user) => sum + getScoreValue(user), 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total {getScoreLabel()}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">
                {leaderboardData.length > 0 
                  ? Math.round(leaderboardData.reduce((sum, user) => sum + getScoreValue(user), 0) / leaderboardData.length)
                  : 0}
              </p>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}