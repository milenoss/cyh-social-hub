import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Trophy, 
  Target, 
  Users, 
  MessageCircle,
  Heart,
  Share2,
  TrendingUp,
  Calendar,
  CheckCircle,
  Plus,
  Flame,
  Award,
  Star
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface FeedItem {
  id: string;
  type: 'challenge_completed' | 'challenge_created' | 'streak_milestone' | 'achievement_earned' | 'progress_update' | 'comment_posted';
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  challenge?: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
  };
  achievement?: {
    id: string;
    title: string;
    icon: string;
    rarity: string;
  };
  content?: string;
  metadata?: any;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
}

// Mock feed data - in real app, this would come from the database
const mockFeedItems: FeedItem[] = [
  {
    id: '1',
    type: 'challenge_completed',
    user: {
      id: 'user1',
      username: 'fitnessfan',
      display_name: 'Sarah Johnson',
      avatar_url: null
    },
    challenge: {
      id: 'challenge1',
      title: '30-Day Morning Workout',
      category: 'Fitness',
      difficulty: 'medium'
    },
    created_at: '2024-01-20T10:00:00Z',
    likes_count: 15,
    comments_count: 3,
    is_liked: false
  },
  {
    id: '2',
    type: 'achievement_earned',
    user: {
      id: 'user2',
      username: 'challenger1',
      display_name: 'Alex Chen',
      avatar_url: null
    },
    achievement: {
      id: 'streak-master',
      title: 'Streak Master',
      icon: 'flame',
      rarity: 'rare'
    },
    created_at: '2024-01-20T09:30:00Z',
    likes_count: 8,
    comments_count: 1,
    is_liked: true
  },
  {
    id: '3',
    type: 'challenge_created',
    user: {
      id: 'user3',
      username: 'mindful_mike',
      display_name: 'Mike Wilson',
      avatar_url: null
    },
    challenge: {
      id: 'challenge2',
      title: 'Daily Meditation Practice',
      category: 'Mindfulness',
      difficulty: 'easy'
    },
    content: 'Join me in building a consistent meditation habit! Perfect for beginners.',
    created_at: '2024-01-20T08:15:00Z',
    likes_count: 12,
    comments_count: 5,
    is_liked: false
  },
  {
    id: '4',
    type: 'progress_update',
    user: {
      id: 'user4',
      username: 'growth_guru',
      display_name: 'Emma Davis',
      avatar_url: null
    },
    challenge: {
      id: 'challenge3',
      title: 'Learn Spanish in 60 Days',
      category: 'Learning',
      difficulty: 'hard'
    },
    content: 'Day 15 update: Finally starting to think in Spanish! The daily practice is really paying off. 🇪🇸',
    metadata: { progress: 25, day: 15 },
    created_at: '2024-01-19T19:45:00Z',
    likes_count: 6,
    comments_count: 2,
    is_liked: false
  },
  {
    id: '5',
    type: 'streak_milestone',
    user: {
      id: 'user5',
      username: 'streak_king',
      display_name: 'David Brown',
      avatar_url: null
    },
    metadata: { streak_days: 30 },
    created_at: '2024-01-19T16:20:00Z',
    likes_count: 20,
    comments_count: 7,
    is_liked: true
  }
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'challenge_completed':
      return <Trophy className="h-5 w-5 text-yellow-600" />;
    case 'challenge_created':
      return <Plus className="h-5 w-5 text-blue-600" />;
    case 'streak_milestone':
      return <Flame className="h-5 w-5 text-orange-600" />;
    case 'achievement_earned':
      return <Award className="h-5 w-5 text-purple-600" />;
    case 'progress_update':
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    case 'comment_posted':
      return <MessageCircle className="h-5 w-5 text-blue-500" />;
    default:
      return <Activity className="h-5 w-5 text-muted-foreground" />;
  }
};

const getActivityTitle = (item: FeedItem) => {
  switch (item.type) {
    case 'challenge_completed':
      return `completed the challenge "${item.challenge?.title}"`;
    case 'challenge_created':
      return `created a new challenge "${item.challenge?.title}"`;
    case 'streak_milestone':
      return `reached a ${item.metadata?.streak_days}-day streak!`;
    case 'achievement_earned':
      return `earned the "${item.achievement?.title}" achievement`;
    case 'progress_update':
      return `shared progress on "${item.challenge?.title}"`;
    case 'comment_posted':
      return `commented on a challenge`;
    default:
      return 'had some activity';
  }
};

const difficultyColors: Record<string, string> = {
  easy: "bg-difficulty-easy",
  medium: "bg-difficulty-medium", 
  hard: "bg-difficulty-hard",
  extreme: "bg-difficulty-extreme"
};

export function ChallengeFeed() {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>(mockFeedItems);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);

  const handleLike = (itemId: string) => {
    setFeedItems(prev => prev.map(item => 
      item.id === itemId 
        ? {
            ...item,
            likes_count: item.is_liked ? item.likes_count - 1 : item.likes_count + 1,
            is_liked: !item.is_liked
          }
        : item
    ));
  };

  const handleShare = (item: FeedItem) => {
    // TODO: Implement sharing functionality
    navigator.clipboard.writeText(`Check out this activity: ${getActivityTitle(item)}`);
  };

  const getFilteredItems = () => {
    if (activeTab === "all") return feedItems;
    return feedItems.filter(item => item.type === activeTab);
  };

  const FeedItemCard = ({ item }: { item: FeedItem }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={item.user.avatar_url} />
              <AvatarFallback>
                {item.user.display_name[0] || item.user.username[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getActivityIcon(item.type)}
                <p className="text-sm">
                  <span className="font-medium">{item.user.display_name}</span>
                  {' '}
                  <span className="text-muted-foreground">{getActivityTitle(item)}</span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Content */}
          {item.content && (
            <p className="text-sm leading-relaxed pl-13">{item.content}</p>
          )}

          {/* Challenge/Achievement Details */}
          {item.challenge && (
            <div className="pl-13">
              <Card className="bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.challenge.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {item.challenge.category}
                        </Badge>
                        <Badge 
                          className={`${difficultyColors[item.challenge.difficulty]} text-white text-xs`}
                        >
                          {item.challenge.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Target className="h-4 w-4" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {item.achievement && (
            <div className="pl-13">
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Award className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.achievement.title}</p>
                      <Badge className="bg-purple-100 text-purple-800 text-xs mt-1">
                        {item.achievement.rarity}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Progress Update */}
          {item.type === 'progress_update' && item.metadata && (
            <div className="pl-13">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Day {item.metadata.day}</span>
                <span>•</span>
                <span>{item.metadata.progress}% complete</span>
              </div>
            </div>
          )}

          {/* Streak Milestone */}
          {item.type === 'streak_milestone' && item.metadata && (
            <div className="pl-13">
              <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                <CardContent className="p-3 text-center">
                  <Flame className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="font-bold text-lg text-orange-600">
                    {item.metadata.streak_days} Day Streak!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Consistency is key to success
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pl-13 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(item.id)}
              className={`h-8 px-2 ${item.is_liked ? 'text-red-600' : ''}`}
            >
              <Heart className={`h-4 w-4 mr-1 ${item.is_liked ? 'fill-current' : ''}`} />
              {item.likes_count}
            </Button>
            
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <MessageCircle className="h-4 w-4 mr-1" />
              {item.comments_count}
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleShare(item)}
              className="h-8 px-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
          <CardDescription>
            Stay updated with the latest community activity and achievements
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="challenge_completed">Completed</TabsTrigger>
          <TabsTrigger value="challenge_created">Created</TabsTrigger>
          <TabsTrigger value="achievement_earned">Achievements</TabsTrigger>
          <TabsTrigger value="streak_milestone">Streaks</TabsTrigger>
          <TabsTrigger value="progress_update">Updates</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Feed Items */}
          {getFilteredItems().length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                <p className="text-muted-foreground">
                  Be the first to share your progress and inspire others!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {getFilteredItems().map((item) => (
                <FeedItemCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Load More */}
          {getFilteredItems().length > 0 && (
            <div className="text-center">
              <Button variant="outline" disabled={loading}>
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-lg font-bold">
              {feedItems.filter(item => item.type === 'challenge_completed').length}
            </p>
            <p className="text-xs text-muted-foreground">Challenges Completed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Plus className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-lg font-bold">
              {feedItems.filter(item => item.type === 'challenge_created').length}
            </p>
            <p className="text-xs text-muted-foreground">New Challenges</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-lg font-bold">
              {feedItems.filter(item => item.type === 'achievement_earned').length}
            </p>
            <p className="text-xs text-muted-foreground">Achievements Earned</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <p className="text-lg font-bold">
              {feedItems.filter(item => item.type === 'streak_milestone').length}
            </p>
            <p className="text-xs text-muted-foreground">Streak Milestones</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}