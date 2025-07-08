import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trophy, 
  Target, 
  Calendar, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Settings,
  Award,
  Flame
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { useProfile } from "@/hooks/useProfile";
import { useChallengeParticipation } from "@/hooks/useChallengeParticipation";
import { ChallengeCard } from "@/components/ChallengeCard";
import { CreateChallengeDialog } from "@/components/CreateChallengeDialog";
import { EditChallengeModal } from "@/components/EditChallengeModal";
import { ProgressTracker } from "@/components/ProgressTracker";
import { ProfileManagement } from "@/components/ProfileManagement";
import { AchievementSystem } from "@/components/AchievementSystem";
import { useChallenges } from "@/hooks/useChallenges";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmailVerificationGuard } from "@/components/EmailVerificationGuard";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const { 
    profile, 
    updateProfile
  } = useProfile();
  const { 
    userChallenges, 
    participatedChallenges, 
    stats, 
    loading 
  } = useDashboard();
  const { createChallenge, updateChallenge, deleteChallenge } = useChallenges();
  const [editingChallenge, setEditingChallenge] = useState<ChallengeWithCreator | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedChallengeForProgress, setSelectedChallengeForProgress] = useState<any>(null);
  const { updateProgress } = useChallengeParticipation(selectedChallengeForProgress?.challenge_id);

  // Handle tab switching from URL params
  const [activeTab, setActiveTab] = useState("active");
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['active', 'created', 'completed', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const handleEditChallenge = (challenge: ChallengeWithCreator) => {
    setEditingChallenge(challenge);
    setEditModalOpen(true);
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (window.confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
      await deleteChallenge(challengeId);
      // Refresh dashboard data
      window.location.reload();
    }
  };

  const handleProgressUpdate = (progress: number, note?: string) => {
    return updateProgress(progress, note);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to view your dashboard</h1>
            <Link to="/auth">
              <Button variant="hero">Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <EmailVerificationGuard showWarning={true}>
        <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="text-lg">
                {profile?.display_name?.[0] || profile?.username?.[0] || user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back, {profile?.display_name || profile?.username || 'Challenger'}!
              </h1>
              <p className="text-muted-foreground">
                Ready to continue your journey?
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{stats.challengesCompleted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Flame className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                    <p className="text-2xl font-bold">{stats.currentStreak}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">{stats.activeChallenges}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Award className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Points</p>
                    <p className="text-2xl font-bold">{stats.totalPoints}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active">Active Challenges</TabsTrigger>
            <TabsTrigger value="created">My Challenges</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Active Challenges */}
          <TabsContent value="active" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Active Challenges</h2>
              <Link to="/">
                <Button variant="outline">
                  <Target className="h-4 w-4" />
                  Browse More
                </Button>
              </Link>
            </div>

            {participatedChallenges.filter(p => p.status === 'active').length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't joined any challenges yet. Start your journey today!
                  </p>
                  <Link to="/">
                    <Button variant="hero">
                      <Target className="h-4 w-4" />
                      Find Challenges
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {participatedChallenges
                  .filter(p => p.status === 'active')
                  .map((participation) => (
                    <Card key={participation.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {participation.challenge.category}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Active
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{participation.challenge.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>Progress</span>
                              <span>{participation.progress}%</span>
                            </div>
                            <Progress value={participation.progress} className="h-2" />
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{participation.challenge.duration_days} days</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Started {new Date(participation.started_at!).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <Button className="w-full" variant="outline">
                            <Play className="h-4 w-4" onClick={() => setSelectedChallengeForProgress(participation)} />
                            Track Progress
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Created Challenges */}
          <TabsContent value="created" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Challenges</h2>
              <CreateChallengeDialog onCreateChallenge={createChallenge} />
            </div>

            {userChallenges.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Challenges Created</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first challenge and inspire others to join you!
                  </p>
                  <CreateChallengeDialog 
                    onCreateChallenge={createChallenge}
                    trigger={
                      <Button variant="hero">
                        <Target className="h-4 w-4" />
                        Create Challenge
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userChallenges.map((challenge) => (
                  <ChallengeCard 
                    key={challenge.id} 
                    challenge={challenge}
                    onEdit={handleEditChallenge}
                    onDelete={handleDeleteChallenge}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Completed Challenges */}
          <TabsContent value="completed" className="space-y-6">
            <h2 className="text-2xl font-bold">Completed Challenges</h2>

            {participatedChallenges.filter(p => p.status === 'completed').length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Challenges</h3>
                  <p className="text-muted-foreground">
                    Complete your first challenge to see it here!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {participatedChallenges
                  .filter(p => p.status === 'completed')
                  .map((participation) => (
                    <Card key={participation.id} className="border-green-200 bg-green-50/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {participation.challenge.category}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{participation.challenge.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Completed {new Date(participation.completed_at!).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              <span>{participation.challenge.points_reward} pts</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Tabs defaultValue="settings" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="settings">Profile Settings</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
              </TabsList>
              
              <TabsContent value="settings">
                <ProfileManagement 
                  profile={profile}
                  onUpdateProfile={updateProfile}
                />
              </TabsContent>
              
              <TabsContent value="achievements">
                <AchievementSystem 
                  userId={user.id}
                  userStats={{
                    challengesCompleted: stats.challengesCompleted,
                    challengesCreated: userChallenges.length,
                    currentStreak: stats.currentStreak,
                    longestStreak: stats.longestStreak,
                    totalPoints: stats.totalPoints,
                    friendsHelped: 3, // Mock data
                    commentsPosted: 12 // Mock data
                  }}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Progress Tracker Modal */}
        {selectedChallengeForProgress && (
          <Dialog open={!!selectedChallengeForProgress} onOpenChange={() => setSelectedChallengeForProgress(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Progress Tracker</DialogTitle>
                <DialogDescription>
                  Track your daily progress for this challenge
                </DialogDescription>
              </DialogHeader>
              <ProgressTracker
                challengeId={selectedChallengeForProgress.challenge_id}
                participation={selectedChallengeForProgress}
                challengeTitle={selectedChallengeForProgress.challenge.title}
                duration={selectedChallengeForProgress.challenge.duration_days}
                currentProgress={selectedChallengeForProgress.progress}
                onUpdateProgress={handleProgressUpdate}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Challenge Modal */}
        <EditChallengeModal
          challenge={editingChallenge}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onUpdateChallenge={updateChallenge}
        />
      </div>
        </div>
      </EmailVerificationGuard>
    </div>
  );
}