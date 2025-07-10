import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChallengeComments } from "./ChallengeComments";
import { RealParticipantsList } from "./RealParticipantsList";
import { InviteFriendsDialog } from "./InviteFriendsDialog";
import { useChallengeParticipation } from "@/hooks/useChallengeParticipation";
import { 
  Users, 
  Clock, 
  Target,
  Calendar,
  Award,
  TrendingUp, 
  MessageCircle,
  Share2, 
  Flag, 
  Copy,
  Check,
  CheckCircle,
  Play, 
  Pause,
  RefreshCw
} from "lucide-react";
import { ChallengeWithCreator } from "@/lib/supabase-types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface ChallengeDetailsModalProps {
  challenge: ChallengeWithCreator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin?: (challengeId: string) => void;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-difficulty-easy",
  medium: "bg-difficulty-medium", 
  hard: "bg-difficulty-hard",
  extreme: "bg-difficulty-extreme"
};

const difficultyLabels: Record<string, string> = {

export function ChallengeDetailsModal({ challenge, open, onOpenChange, onJoin }: ChallengeDetailsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { participation, joinChallenge, leaveChallenge, loading: participationLoading } = useChallengeParticipation(challenge?.id);
  const [activeTab, setActiveTab] = useState("overview"); 
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [participantStats, setParticipantStats] = useState({
    completedCount: 0,
    activeCount: 0,
    averageProgress: 0
  });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!challenge) return null;

  const isOwner = user?.id === challenge.created_by;
  const hasJoined = !!participation;

  const fetchParticipants = async () => {
    if (!challenge?.id) return;
    
    setLoadingParticipants(true);
    try {
      const { data, error } = await supabase.rpc('get_real_challenge_participants', {
        challenge_id_param: challenge.id
      });

      if (error) throw error;

      if (data && data.success) {
        setParticipants(data.participants || []);
        
        // Calculate stats
        const completed = data.participants.filter((p: any) => p.status === 'completed').length;
        const active = data.participants.filter((p: any) => p.status === 'active').length;
        const avgProgress = data.participants.length > 0 
          ? data.participants.reduce((acc: number, p: any) => acc + p.progress, 0) / data.participants.length 
          : 0;
        
        setParticipantStats({
          completedCount: completed,
          activeCount: active,
          averageProgress: Math.round(avgProgress)
        });
      } else {
        console.error('Error in response:', data.message);
      }
    } catch (error: any) {
      console.error('Error fetching participants:', error);
      toast({
        title: "Error",
        description: "Failed to load participants",
        variant: "destructive",
      });
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    if (open && challenge?.id && activeTab === "participants") {
      fetchParticipants();
    }
  }, [open, challenge?.id, activeTab]);

  const handleJoin = () => {
    if (!user) {
      // Redirect to auth page
      window.location.href = '/auth';
      return;
    }
    setJoinDialogOpen(true);
  };

  const confirmJoin = async () => {
    if (!user || !challenge) return;

    setJoining(true);
    const success = await joinChallenge();
    setJoining(false);
    
    if (success) {
      setJoinDialogOpen(false);
      toast({
        title: "Challenge Started!",
        description: "You've successfully joined the challenge. Check in daily to track your progress.",
      });
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard?tab=active';
      }, 1500);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/challenge/${challenge.id}`;
    
    // Try to use the Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: challenge.title,
        text: `Check out this challenge: ${challenge.title}`,
        url: shareUrl,
      }).catch(err => {
        // Silently fallback to copy to clipboard if sharing fails
        // This handles permission denied errors and other sharing issues
        copyToClipboard(shareUrl);
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setLinkCopied(true);
      toast({
        title: "Link Copied",
        description: "Challenge link copied to clipboard",
      });
      
      setTimeout(() => setLinkCopied(false), 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    });
  };

  const handleReport = () => {
    setReportDialogOpen(true);
  };

  const submitReport = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to report challenges",
        variant: "destructive",
      });
      return;
    }
    
    if (!reportReason.trim()) {
      toast({
        title: "Report reason required",
        description: "Please provide a reason for your report",
        variant: "destructive",
      });
      return;
    }
    
    setReportSubmitting(true);
    
    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate a successful report
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Report Submitted",
        description: "Thank you for your report. We'll review it shortly.",
      });
      
      setReportDialogOpen(false);
      setReportReason("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReportSubmitting(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">
                  {challenge.category}
                </Badge>
                <Badge 
                  className={`${difficultyColors[challenge.difficulty]} text-white text-xs`}
                >
                  {difficultyLabels[challenge.difficulty]}
                </Badge>
              </div>
              <DialogTitle className="text-2xl">{challenge.title}</DialogTitle>
              {challenge.creator && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={challenge.creator.avatar_url || ""} />
                    <AvatarFallback className="text-xs">
                      {challenge.creator.display_name?.[0] || challenge.creator.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span>Created by {challenge.creator.display_name || challenge.creator.username}</span>
                  <span>•</span>
                  <span>{format(new Date(challenge.created_at), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShare}
              >
                {linkCopied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Share2 className="h-4 w-4 mr-2" />
                )}
                Share
              </Button>
              {hasJoined && (
                <InviteFriendsDialog 
                  challengeId={challenge.id}
                  challengeTitle={challenge.title}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Invite Friends
                    </Button>
                  }
                />
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReport}
              >
                <Flag className="h-4 w-4" />
                Report
              </Button>
              <FeedbackForm 
                challengeId={challenge.id}
                challengeTitle={challenge.title}
                trigger={
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Feedback
                  </Button>
                }
              />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{challenge.participant_count || 0}</p>
                <p className="text-xs text-muted-foreground">Participants</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{challenge.duration_days}</p>
                <p className="text-xs text-muted-foreground">Days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{challenge.points_reward}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{participantStats.completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          {!isOwner && (
            <div className="flex justify-center">
              <div className="flex gap-4">
                {hasJoined ? (
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = '/dashboard?tab=active';
                    }}
                    disabled={participationLoading}
                    className="min-w-[200px]"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    {participationLoading ? "Loading..." : "View Progress"}
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    variant="hero" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleJoin();
                    }}
                    disabled={participationLoading}
                    className="min-w-[200px]"
                  >
                    <Target className="h-5 w-5 mr-2" />
                    {participationLoading ? "Loading..." : "Start Challenge"}
                  </Button>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {challenge.description}
                </p>
              </div>

              {challenge.tags && challenge.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {challenge.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-3">Challenge Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">{challenge.duration_days} days</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Difficulty</p>
                    <Badge className={`${difficultyColors[challenge.difficulty]} text-white text-xs`}>
                      {difficultyLabels[challenge.difficulty]}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Category</p>
                    <p className="text-sm text-muted-foreground">{challenge.category}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Points Reward</p>
                    <p className="text-sm text-muted-foreground">{challenge.points_reward} points</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="participants" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Participants</h3>
                <div className="flex gap-2">
                  {hasJoined && (
                    <Badge variant="default" className="text-xs">
                      You're participating
                    </Badge>
                  )}
                </div>
              </div>

              {loadingParticipants ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
                            <div>
                              <div className="h-4 w-32 bg-muted animate-pulse rounded-md"></div>
                              <div className="h-3 w-24 bg-muted animate-pulse rounded-md mt-1"></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="h-5 w-20 bg-muted animate-pulse rounded-md mb-1"></div>
                            <div className="h-2 w-20 bg-muted animate-pulse rounded-md"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : participants.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Participants Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Be the first to join this challenge!
                    </p>
                    {!hasJoined && !isOwner && (
                      <Button 
                        variant="hero" 
                        onClick={handleJoin}
                        disabled={participationLoading}
                      >
                        <Target className="h-4 w-4 mr-2" />
                        {participationLoading ? "Loading..." : "Start Challenge"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <Card key={participant.id} className={participant.user_id === user?.id ? "border-primary/50 bg-primary/5" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={participant.user?.avatar_url || ""} />
                              <AvatarFallback>
                                {participant.user?.display_name?.[0] || participant.user?.username?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{participant.user?.display_name || participant.user?.username}</p>
                              <p className="text-sm text-muted-foreground">@{participant.user?.username}</p>
                              {participant.user_id === user?.id && (
                                <Badge variant="secondary" className="text-xs mt-1">You</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={participant.status === 'completed' ? 'default' : 'secondary'}
                                className="text-xs"
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
                            <div className="flex items-center gap-2">
                              <Progress value={participant.progress} className="w-20 h-2" />
                              <span className="text-sm font-medium">{participant.progress}%</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
                      <CardTitle className="text-base">Average Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Active Participants</span>
                          <span>{challenge.average_progress || 0}%</span>
                        </div>
                        <Progress value={challenge.average_progress || 0} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Leaderboard</h3>
                <RealParticipantsList 
                  challengeId={challenge.id} 
                  currentUserId={user?.id} 
                  showAsLeaderboard={true} 
                  limit={10}
                />
              </div>
            </TabsContent>

            <TabsContent value="discussion" className="space-y-4">
              <ChallengeComments 
                challengeId={challenge.id}
                challengeOwnerId={challenge.created_by}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
      
      {/* Join Challenge Modal */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
                        <span>Started: {participation.started_at ? format(parseISO(participation.started_at), 'MMM d, yyyy') : 'N/A'}</span>
            <DialogDescription>
              Are you ready to begin this challenge?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">{challenge.title}</h3>
              <p className="text-sm text-muted-foreground">{challenge.description}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
                          <span>{challenge.participant_count ? Math.round((participantStats.completedCount / challenge.participant_count) * 100) : 0}%</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
                        <Progress value={challenge.participant_count ? (participantStats.completedCount / challenge.participant_count) * 100 : 0} />
              </div>
              <div className="flex items-center gap-1">
                <Badge className={`${difficultyColors[challenge.difficulty]} text-white`}>
                  {difficultyLabels[challenge.difficulty]}
                </Badge>
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">What to expect:</p>
              <ul className="text-sm space-y-1 list-disc pl-5">
                <li>Daily check-ins to track your progress</li>
                <li>Complete the challenge in {challenge.duration_days} days</li>
                          <span>{participantStats.averageProgress}%</span>
              </ul>
                        <Progress value={participantStats.averageProgress} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmJoin} disabled={joining} variant="hero">
              {joining ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  {loadingParticipants ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 bg-muted animate-pulse rounded-full"></div>
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-muted animate-pulse rounded-md"></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 bg-muted animate-pulse rounded-md"></div>
                          <div className="h-4 w-12 bg-muted animate-pulse rounded-md"></div>
                        </div>
                      </div>
                    ))
                  ) : participants.length === 0 ? (
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground">No participants yet</p>
                    </div>
                  ) : (
                    participants
                    .sort((a, b) => b.progress - a.progress)
                    .slice(0, 5)
                    .map((participant, index) => (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Start Challenge
                </>
              )}
                          <AvatarImage src={participant.user?.avatar_url || ""} />
          </DialogFooter>
                            {participant.user?.display_name?.[0] || participant.user?.username?.[0] || 'U'}
      </Dialog>
      
      {/* Report Dialog */}
                          <p className="font-medium text-sm">{participant.user?.display_name || participant.user?.username}</p>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Challenge</DialogTitle>
            <DialogDescription>
              Please let us know why you're reporting this challenge
            </DialogDescription>
                    ))
                  )}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-medium">Challenge: {challenge.title}</h3>
              <textarea
                className="w-full min-h-[100px] p-3 border rounded-md bg-background"
                placeholder="Please describe why you're reporting this challenge..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />
            </div>
            
            <Alert>
              <AlertDescription>
                Reports are anonymous and help us maintain community standards. We'll review this challenge based on your feedback.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitReport}
              disabled={reportSubmitting || !reportReason.trim()}
            >
              {reportSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}