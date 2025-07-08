import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Target, 
  Flame, 
  Award, 
  Calendar, 
  Users, 
  Star,
  Crown,
  Zap,
  Heart,
  BookOpen,
  Rocket,
  Shield,
  Gift
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'progress' | 'social' | 'creation' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  requirements: {
    type: string;
    target: number;
    current?: number;
  };
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
}

interface AchievementSystemProps {
  userId: string;
  userStats: {
    challengesCompleted: number;
    challengesCreated: number;
    currentStreak: number;
    longestStreak: number;
    totalPoints: number;
    friendsHelped: number;
    commentsPosted: number;
  };
}

const rarityColors = {
  common: "bg-gray-100 border-gray-300 text-gray-800",
  rare: "bg-blue-100 border-blue-300 text-blue-800",
  epic: "bg-purple-100 border-purple-300 text-purple-800",
  legendary: "bg-yellow-100 border-yellow-300 text-yellow-800"
};

const rarityGlow = {
  common: "",
  rare: "shadow-blue-200",
  epic: "shadow-purple-200",
  legendary: "shadow-yellow-200"
};

export function AchievementSystem({ userId, userStats }: AchievementSystemProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    // Initialize achievements with user progress
    const allAchievements: Achievement[] = [
      // Progress Achievements
      {
        id: 'first-challenge',
        title: 'First Steps',
        description: 'Complete your first challenge',
        icon: <Target className="h-6 w-6" />,
        category: 'progress',
        rarity: 'common',
        points: 50,
        requirements: { type: 'challenges_completed', target: 1, current: userStats.challengesCompleted },
        unlocked: userStats.challengesCompleted >= 1,
        unlockedAt: userStats.challengesCompleted >= 1 ? '2024-01-15T10:00:00Z' : undefined,
        progress: Math.min((userStats.challengesCompleted / 1) * 100, 100)
      },
      {
        id: 'challenge-veteran',
        title: 'Challenge Veteran',
        description: 'Complete 5 challenges',
        icon: <Trophy className="h-6 w-6" />,
        category: 'progress',
        rarity: 'rare',
        points: 200,
        requirements: { type: 'challenges_completed', target: 5, current: userStats.challengesCompleted },
        unlocked: userStats.challengesCompleted >= 5,
        progress: Math.min((userStats.challengesCompleted / 5) * 100, 100)
      },
      {
        id: 'challenge-master',
        title: 'Challenge Master',
        description: 'Complete 25 challenges',
        icon: <Crown className="h-6 w-6" />,
        category: 'progress',
        rarity: 'epic',
        points: 500,
        requirements: { type: 'challenges_completed', target: 25, current: userStats.challengesCompleted },
        unlocked: userStats.challengesCompleted >= 25,
        progress: Math.min((userStats.challengesCompleted / 25) * 100, 100)
      },
      {
        id: 'streak-starter',
        title: 'Streak Starter',
        description: 'Maintain a 7-day streak',
        icon: <Flame className="h-6 w-6" />,
        category: 'progress',
        rarity: 'common',
        points: 100,
        requirements: { type: 'longest_streak', target: 7, current: userStats.longestStreak },
        unlocked: userStats.longestStreak >= 7,
        unlockedAt: userStats.longestStreak >= 7 ? '2024-01-20T10:00:00Z' : undefined,
        progress: Math.min((userStats.longestStreak / 7) * 100, 100)
      },
      {
        id: 'streak-legend',
        title: 'Streak Legend',
        description: 'Maintain a 30-day streak',
        icon: <Zap className="h-6 w-6" />,
        category: 'progress',
        rarity: 'legendary',
        points: 1000,
        requirements: { type: 'longest_streak', target: 30, current: userStats.longestStreak },
        unlocked: userStats.longestStreak >= 30,
        progress: Math.min((userStats.longestStreak / 30) * 100, 100)
      },

      // Creation Achievements
      {
        id: 'challenge-creator',
        title: 'Challenge Creator',
        description: 'Create your first challenge',
        icon: <Star className="h-6 w-6" />,
        category: 'creation',
        rarity: 'common',
        points: 100,
        requirements: { type: 'challenges_created', target: 1, current: userStats.challengesCreated },
        unlocked: userStats.challengesCreated >= 1,
        progress: Math.min((userStats.challengesCreated / 1) * 100, 100)
      },
      {
        id: 'inspiration-source',
        title: 'Inspiration Source',
        description: 'Create 5 challenges',
        icon: <Rocket className="h-6 w-6" />,
        category: 'creation',
        rarity: 'rare',
        points: 300,
        requirements: { type: 'challenges_created', target: 5, current: userStats.challengesCreated },
        unlocked: userStats.challengesCreated >= 5,
        progress: Math.min((userStats.challengesCreated / 5) * 100, 100)
      },

      // Social Achievements
      {
        id: 'helpful-friend',
        title: 'Helpful Friend',
        description: 'Help 10 people complete challenges',
        icon: <Heart className="h-6 w-6" />,
        category: 'social',
        rarity: 'rare',
        points: 250,
        requirements: { type: 'friends_helped', target: 10, current: userStats.friendsHelped },
        unlocked: userStats.friendsHelped >= 10,
        progress: Math.min((userStats.friendsHelped / 10) * 100, 100)
      },
      {
        id: 'community-voice',
        title: 'Community Voice',
        description: 'Post 50 comments',
        icon: <BookOpen className="h-6 w-6" />,
        category: 'social',
        rarity: 'common',
        points: 150,
        requirements: { type: 'comments_posted', target: 50, current: userStats.commentsPosted },
        unlocked: userStats.commentsPosted >= 50,
        progress: Math.min((userStats.commentsPosted / 50) * 100, 100)
      },

      // Special Achievements
      {
        id: 'early-adopter',
        title: 'Early Adopter',
        description: 'One of the first 1000 users',
        icon: <Shield className="h-6 w-6" />,
        category: 'special',
        rarity: 'legendary',
        points: 500,
        requirements: { type: 'special', target: 1, current: 1 },
        unlocked: true,
        unlockedAt: '2024-01-10T10:00:00Z',
        progress: 100
      },
      {
        id: 'point-collector',
        title: 'Point Collector',
        description: 'Earn 1000 points',
        icon: <Gift className="h-6 w-6" />,
        category: 'progress',
        rarity: 'epic',
        points: 0, // No points for this one since it's about collecting points
        requirements: { type: 'total_points', target: 1000, current: userStats.totalPoints },
        unlocked: userStats.totalPoints >= 1000,
        progress: Math.min((userStats.totalPoints / 1000) * 100, 100)
      }
    ];

    setAchievements(allAchievements);
  }, [userStats]);

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);
  const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);

  const getFilteredAchievements = () => {
    if (activeTab === "all") return achievements;
    if (activeTab === "unlocked") return unlockedAchievements;
    if (activeTab === "locked") return lockedAchievements;
    return achievements.filter(a => a.category === activeTab);
  };

  const AchievementCard = ({ achievement }: { achievement: Achievement }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Card 
          className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
            achievement.unlocked 
              ? `${rarityGlow[achievement.rarity]} shadow-lg` 
              : 'opacity-60 grayscale'
          }`}
        >
          <CardContent className="p-4 text-center">
            <div className={`mx-auto mb-3 p-3 rounded-full w-fit ${
              achievement.unlocked 
                ? rarityColors[achievement.rarity]
                : 'bg-gray-100 text-gray-400'
            }`}>
              {achievement.icon}
            </div>
            <h3 className="font-semibold text-sm mb-1">{achievement.title}</h3>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {achievement.description}
            </p>
            
            {achievement.unlocked ? (
              <div className="space-y-2">
                <Badge className={rarityColors[achievement.rarity]}>
                  {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                </Badge>
                {achievement.points > 0 && (
                  <p className="text-xs font-medium text-primary">
                    +{achievement.points} points
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Progress value={achievement.progress || 0} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {achievement.requirements.current || 0} / {achievement.requirements.target}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="text-center space-y-4">
            <div className={`mx-auto p-4 rounded-full w-fit ${
              achievement.unlocked 
                ? rarityColors[achievement.rarity]
                : 'bg-gray-100 text-gray-400'
            }`}>
              {achievement.icon}
            </div>
            <div>
              <DialogTitle className="text-xl">{achievement.title}</DialogTitle>
              <Badge className={`${rarityColors[achievement.rarity]} mt-2`}>
                {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <DialogDescription className="text-center">
            {achievement.description}
          </DialogDescription>
          
          {achievement.unlocked ? (
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Trophy className="h-5 w-5" />
                <span className="font-medium">Achievement Unlocked!</span>
              </div>
              {achievement.unlockedAt && (
                <p className="text-sm text-muted-foreground">
                  Earned on {new Date(achievement.unlockedAt).toLocaleDateString()}
                </p>
              )}
              {achievement.points > 0 && (
                <p className="text-sm font-medium text-primary">
                  Earned {achievement.points} points
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Progress</p>
                <Progress value={achievement.progress || 0} className="h-3" />
                <p className="text-sm text-muted-foreground mt-1">
                  {achievement.requirements.current || 0} / {achievement.requirements.target}
                </p>
              </div>
              {achievement.points > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Will earn {achievement.points} points when unlocked
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Achievement Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievement Progress
          </CardTitle>
          <CardDescription>
            Your journey and milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{unlockedAchievements.length}</p>
              <p className="text-sm text-muted-foreground">Unlocked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">{achievements.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{totalPoints}</p>
              <p className="text-sm text-muted-foreground">Points Earned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {Math.round((unlockedAchievements.length / achievements.length) * 100)}%
              </p>
              <p className="text-sm text-muted-foreground">Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
          <TabsTrigger value="locked">Locked</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="creation">Creation</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {getFilteredAchievements().map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Achievements */}
      {unlockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unlockedAchievements
                .filter(a => a.unlockedAt)
                .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
                .slice(0, 3)
                .map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className={`p-2 rounded-full ${rarityColors[achievement.rarity]}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {achievement.unlockedAt && new Date(achievement.unlockedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {achievement.points > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        +{achievement.points}
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}