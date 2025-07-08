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

interface LeaderboardUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  rank: number;
  score: number;
  change: number; // Position change from last period
  badge?: string;
}

interface LeaderboardsProps {
  challengeId?: string; // If provided, show challenge-specific leaderboard
}

// Mock leaderboard data - in real app, this would come from the database
const mockGlobalLeaderboard: LeaderboardUser[] = [
  { id: '1', username: 'challenger_supreme', display_name: 'Alex Chen', rank: 1, score: 2850, change: 0, badge: 'legend' },
  { id: '2', username: 'fitness_warrior', display_name: 'Sarah Johnson', rank: 2, score: 2720, change: 1, badge: 'master' },
  { id: '3', username: 'mindful_master', display_name: 'Mike Wilson', rank: 3, score: 2650, change: -1, badge: 'expert' },
  { id: '4', username: 'growth_guru', display_name: 'Emma Davis', rank: 4, score: 2480, change: 2 },
  { id: '5', username: 'streak_king', display_name: 'David Brown', rank: 5, score: 2350, change: -1 },
  { id: '6', username: 'challenge_ace', display_name: 'Lisa Wang', rank: 6, score: 2280, change: 3 },
  { id: '7', username: 'motivation_max', display_name: 'Tom Garcia', rank: 7, score: 2150, change: -2 },
  { id: '8', username: 'progress_pro', display_name: 'Anna Miller', rank: 8, score: 2050, change: 1 },
  { id: '9', username: 'habit_hero', display_name: 'Chris Lee', rank: 9, score: 1980, change: -1 },
  { id: '10', username: 'daily_driver', display_name: 'Maya Patel', rank: 10, score: 1920, change: 0 },
];

const mockStreakLeaderboard: LeaderboardUser[] = [
  { id: '1', username: 'streak_legend', display_name: 'Alex Chen', rank: 1, score: 45, change: 0 },
  { id: '2', username: 'consistency_king', display_name: 'Sarah Johnson', rank: 2, score: 38, change: 1 },
  { id: '3', username: 'daily_champion', display_name: 'Mike Wilson', rank: 3, score: 35, change: -1 },
  { id: '4', username: 'habit_master', display_name: 'Emma Davis', rank: 4, score: 32, change: 0 },
  { id: '5', username: 'routine_ruler', display_name: 'David Brown', rank: 5, score: 28, change: 2 },
];

const mockChallengeLeaderboard: LeaderboardUser[] = [
  { id: '1', username: 'challenge_crusher', display_name: 'Alex Chen', rank: 1, score: 15, change: 0 },
  { id: '2', username: 'goal_getter', display_name: 'Sarah Johnson', rank: 2, score: 12, change: 1 },
  { id: '3', username: 'achievement_ace', display_name: 'Mike Wilson', rank: 3, score: 10, change: -1 },
  { id: '4', username: 'victory_veteran', display_name: 'Emma Davis', rank: 4, score: 8, change: 0 },
  { id: '5', username: 'success_seeker', display_name: 'David Brown', rank: 5, score: 7, change: 1 },
];

const badgeColors = {
  legend: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
  master: "bg-gradient-to-r from-purple-400 to-purple-600 text-white",
  expert: "bg-gradient-to-r from-blue-400 to-blue-600 text-white"
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

  const getLeaderboardData = () => {
    switch (activeTab) {
      case "global":
        return mockGlobalLeaderboard;
      case "streaks":
        return mockStreakLeaderboard;
      case "challenges":
        return mockChallengeLeaderboard;
      default:
        return mockGlobalLeaderboard;
    }
  };

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

  const leaderboardData = getLeaderboardData();
  const userRank = leaderboardData.find(u => u.id === user?.id);

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
                    #{userRank.rank} • {userRank.score} {getScoreLabel().toLowerCase()}
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
          <div className="space-y-0">
            {leaderboardData.map((user, index) => (
              <div
                key={user.id}
                className={`flex items-center gap-4 p-4 border-b last:border-b-0 transition-colors hover:bg-muted/50 ${
                  user.id === user?.id ? 'bg-primary/5' : ''
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-12">
                  {getRankIcon(user.rank)}
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.display_name[0] || user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.display_name}</p>
                      {user.badge && (
                        <Badge className={`text-xs ${badgeColors[user.badge as keyof typeof badgeColors]}`}>
                          {user.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="text-lg font-bold">{user.score.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{getScoreLabel()}</p>
                </div>

                {/* Change Indicator */}
                <div className="flex items-center gap-1 w-16 justify-end">
                  {getChangeIndicator(user.change)}
                  {user.change !== 0 && (
                    <span className={`text-xs ${user.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(user.change)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performers Spotlight */}
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
            {leaderboardData.slice(0, 3).map((user, index) => (
              <Card key={user.id} className={`text-center ${index === 0 ? 'border-yellow-200 bg-yellow-50/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="mb-3">
                    {getRankIcon(user.rank)}
                  </div>
                  <Avatar className="h-16 w-16 mx-auto mb-3">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {user.display_name[0] || user.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold">{user.display_name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">@{user.username}</p>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{user.score.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{getScoreLabel()}</p>
                  </div>
                  {user.badge && (
                    <Badge className={`mt-2 ${badgeColors[user.badge as keyof typeof badgeColors]}`}>
                      {user.badge}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competition Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{leaderboardData.length}</p>
            <p className="text-sm text-muted-foreground">Active Competitors</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {leaderboardData.reduce((sum, user) => sum + user.score, 0).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Total {getScoreLabel()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {Math.round(leaderboardData.reduce((sum, user) => sum + user.score, 0) / leaderboardData.length)}
            </p>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}