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
import { format } from "date-fns";

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
  easy: "Easy",
  medium: "Medium",
  hard: "Hard", 
  extreme: "Extreme"
};

// Mock data for participants - in real app, this would come from the database
const mockParticipants = [
  { id: '1', username: 'challenger1', display_name: 'Alex Chen', avatar_url: null, progress: 85, status: 'active', joined_at: '2024-01-15' },
  { id: '2', username: 'fitnessfan', display_name: 'Sarah Johnson', avatar_url: null, progress: 92, status: 'active', joined_at: '2024-01-14' },
  { id: '3', username: 'mindful_mike', display_name: 'Mike Wilson', avatar_url: null, progress: 100, status: 'completed', joined_at: '2024-01-10' },
  { id: '4', username: 'growth_guru', display_name: 'Emma Davis', avatar_url: null, progress: 67, status: 'active', joined_at: '2024-01-16' },
];

export function ChallengeDetailsModal({ challenge, open, onOpenChange, onJoin }: ChallengeDetailsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { participation, joinChallenge, leaveChallenge, loading: participationLoading } = useChallengeParticipation(challenge?.id);
  const [activeTab, setActiveTab] = useState("overview"); 
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!challenge) return null;

  const isOwner = user?.id === challenge.created_by;
  const hasJoined = !!participation;

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
    }
  };

  const completedParticipants = mockParticipants.filter(p => p.status === 'completed').length;
  const activeParticipants = mockParticipants.filter(p => p.status === 'active').length;

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
              </Button>
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
                <p className="text-2xl font-bold">{completedParticipants}</p>
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
                <h3 className="text-lg font-semibold">Participants ({challenge.participant_count || 0})</h3>
                <div className="flex gap-2">
                  {hasJoined && (
                    <Badge variant="default" className="text-xs">
                      You're participating
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {mockParticipants.map((participant) => (
                  <Card key={participant.id} className={participant.id === user?.id ? "border-primary/50 bg-primary/5" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={participant.avatar_url || ""} />
                            <AvatarFallback>
                              {participant.display_name[0] || participant.username[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{participant.display_name}</p>
                            <p className="text-sm text-muted-foreground">@{participant.username}</p>
                            {participant.id === user?.id && (
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
            </TabsContent>

            <TabsContent value="progress" className="space-y-4">
              {hasJoined && participation && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Your Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current Progress</span>
                        <span>{participation.progress}%</span>
                      </div>
                      <Progress value={participation.progress} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Started: {new Date(participation.started_at!).toLocaleDateString()}</span>
                        <span>Status: {participation.status}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Progress Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Completion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Overall Progress</span>
                          <span>{Math.round((completedParticipants / mockParticipants.length) * 100)}%</span>
                        </div>
                        <Progress value={(completedParticipants / mockParticipants.length) * 100} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Average Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Active Participants</span>
                          <span>{Math.round(mockParticipants.reduce((acc, p) => acc + p.progress, 0) / mockParticipants.length)}%</span>
                        </div>
                        <Progress value={mockParticipants.reduce((acc, p) => acc + p.progress, 0) / mockParticipants.length} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Leaderboard</h3>
                <div className="space-y-2">
                  {mockParticipants
                    .sort((a, b) => b.progress - a.progress)
                    .map((participant, index) => (
                      <div key={participant.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-sm font-bold">
                          {index + 1}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.avatar_url || ""} />
                          <AvatarFallback className="text-xs">
                            {participant.display_name[0] || participant.username[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{participant.display_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={participant.progress} className="w-16 h-2" />
                          <span className="text-sm font-medium w-12">{participant.progress}%</span>
                        </div>
                      </div>
                    ))}
                </div>
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
            <DialogTitle>Start Challenge: {challenge.title}</DialogTitle>
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
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{challenge.duration_days} days</span>
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
                <li>Earn {challenge.points_reward || 100} points upon completion</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmJoin} disabled={joining} variant="hero">
              {joining ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Start Challenge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report Challenge</DialogTitle>
            <DialogDescription>
              Please let us know why you're reporting this challenge
            </DialogDescription>
          </DialogHeader>
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