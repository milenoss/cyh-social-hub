import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Users, Clock, Target, Edit, Trash2, MoreHorizontal, CheckCircle, RefreshCw, Award, Share2, Flag, Copy, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChallengeWithCreator } from "@/lib/supabase-types";
import { useAuth } from "@/contexts/AuthContext";
import { useChallengeParticipation } from "@/hooks/useChallengeParticipation";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { InviteFriendsDialog } from "./InviteFriendsDialog";
import { useToast } from "@/hooks/use-toast";

interface ChallengeCardProps {
  challenge: ChallengeWithCreator;
  onJoin?: (challengeId: string) => void;
  onEdit?: (challenge: ChallengeWithCreator) => void;
  onDelete?: (challengeId: string) => void;
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

export function ChallengeCard({ challenge, onJoin, onEdit, onDelete }: ChallengeCardProps) {
  const { user } = useAuth();
  const { participation, joinChallenge, updateProgress, loading } = useChallengeParticipation(challenge.id);
  const { toast } = useToast();
  const isOwner = user?.id === challenge.created_by;
  const hasJoined = !!participation; 
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [checkInNote, setCheckInNote] = useState("");
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const handleJoin = () => {
    if (!user) {
      // Redirect to auth page
      window.location.href = '/auth';
      return;
    }
    
    if (hasJoined) {
      setShowProgressModal(true);
      return;
    }
    setShowJoinModal(true);
  };

  const confirmJoin = async () => {
    const success = await joinChallenge();
    if (success) {
      toast({
        title: "Challenge Started!",
        description: "You've successfully joined the challenge. Check in daily to track your progress.",
      });
      setShowJoinModal(false);
      setShowProgressModal(true);
    }
  };

  const handleCheckIn = async () => {
    if (!participation) return;
    
    // Calculate the new progress based on challenge duration
    const progressIncrement = Math.min(100 / challenge.duration_days, 100);
    const newProgress = Math.min(participation.progress + progressIncrement, 100);
    
    setIsCheckingIn(true);
    await updateProgress(newProgress, checkInNote);
    setCheckInNote("");
    setIsCheckingIn(false);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
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

  const handleReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handleEdit = () => {
    onEdit?.(challenge);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
      onDelete?.(challenge.id);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card click when clicking on action buttons
    e.stopPropagation();
  };

  const todayCheckedIn = participation?.last_check_in ? 
    new Date(participation.last_check_in).toDateString() === new Date().toDateString() : false;

  // Calculate days remaining
  const daysRemaining = participation?.started_at ? 
    Math.max(0, challenge.duration_days - differenceInDays(new Date(), new Date(participation.started_at))) : 
    challenge.duration_days;
    
  // Calculate expected end date
  const endDate = participation?.started_at ? 
    addDays(new Date(participation.started_at), challenge.duration_days) : 
    null;

  return (
    <>
      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer overflow-hidden">
        <CardHeader className="pb-1 md:pb-3 px-2 md:px-6 pt-2 md:pt-6">
          <div className="flex items-start justify-between mb-2">
            <Badge variant="secondary" className="text-[10px] md:text-xs">
              {challenge.category}
            </Badge>
            <div className="flex items-center gap-2">
              <Badge className={`${difficultyColors[challenge.difficulty]} text-white`}>
                {difficultyLabels[challenge.difficulty]}
              </Badge>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={handleCardClick}>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { handleCardClick(e); handleEdit(); }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { handleCardClick(e); handleDelete(); }} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <CardTitle className="text-sm md:text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {challenge.title}
          </CardTitle>
          {challenge.creator && (
            <p className="text-xs text-muted-foreground">
              by {challenge.creator.display_name || challenge.creator.username || 'Anonymous'}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="pb-2 md:pb-4 px-2 md:px-6">
          <p className="text-muted-foreground text-[10px] md:text-sm mb-1 md:mb-4 line-clamp-2 md:line-clamp-3">
            {challenge.description}
          </p>
          
          <div className="flex items-center gap-1 md:gap-4 text-[10px] md:text-xs text-muted-foreground mb-1 md:mb-3">
            <div className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
              <span>{challenge.duration_days} days</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-2.5 w-2.5 md:h-3 md:w-3" /> 
              <span>{challenge.participant_count || 0} joined</span> 
            </div>
          </div>
          
          <div className="flex flex-wrap gap-0.5 md:gap-1 mb-1 md:mb-2">
            {challenge.tags?.slice(0, 3).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="text-[8px] md:text-xs px-1 md:px-2 py-0"
              >
                {tag}
              </Badge>
            ))}
            {(challenge.tags?.length || 0) > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                +{(challenge.tags?.length || 0) - 3}
              </Badge>
            )}
          </div>
          
          <div className="flex justify-between mt-0.5 md:mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] md:text-xs px-1 md:px-2 h-5 md:h-7"
              onClick={(e) => handleShare(e)}
            >
              {linkCopied ? (
                <Check className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
              ) : (
                <Share2 className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
              )}
              <span className="hidden sm:inline">Share</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] md:text-xs px-1 md:px-2 h-5 md:h-7"
              onClick={(e) => handleReport(e)}
            >
              <Flag className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
              <span className="hidden sm:inline">Report</span>
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="pt-0 px-2 md:px-6 pb-2 md:pb-6">
          {!isOwner && !hasJoined && (
            <Button 
              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all text-[10px] md:text-sm py-0.5 md:py-2"
              variant="challenge" 
              onClick={(e) => {
                e.preventDefault(); // Prevent default action
                e.stopPropagation(); // Stop event propagation
                handleJoin();
              }}
              disabled={loading}
            >
              <Target className="h-4 w-4 mr-2" />
              {loading ? "Loading..." : "Start Challenge"}
            </Button>
          )}
          {!isOwner && hasJoined && (
            <div className="w-full text-center">
              <div className="text-sm text-green-600 font-medium mb-1">
                <Button 
                  variant="link" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowProgressModal(true);
                  }}>
                  ✓ View Progress
                </Button>
              </div>
              <Progress value={participation?.progress || 0} className="h-2 w-full max-w-[150px] mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">
                Progress: {participation?.progress || 0}%
              </p>
            </div>
          )}
          {isOwner && (
            <Button 
              variant="link" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = '/dashboard?tab=created';
              }}
              className="w-full text-muted-foreground hover:text-primary"
            >
              Manage Challenge
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Join Challenge Modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Challenge</DialogTitle>
            <DialogDescription>
              Are you ready to start this challenge?
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
            <Button variant="outline" onClick={() => setShowJoinModal(false)}>
              Cancel
            </Button>
            <Button onClick={confirmJoin} disabled={loading} variant="hero">
              <Target className="h-4 w-4 mr-2" />
              {loading ? "Starting..." : "Start Challenge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Challenge Progress</DialogTitle>
            <DialogDescription>
              Track your progress for {challenge.title}
            </DialogDescription>
          </DialogHeader>
          {participation && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{participation.progress}%</span>
                </div>
                <Progress value={participation.progress} className="h-2.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Day {Math.max(1, challenge.duration_days - daysRemaining)} of {challenge.duration_days}</span>
                  <span>{daysRemaining} days remaining</span>
                  {endDate && (
                    <span>Ends: {format(endDate, 'MMM d, yyyy')}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Started: {format(new Date(participation.started_at || ''), 'MMM d, yyyy')}</span>
                </div>
                <Badge variant={participation.status === 'completed' ? 'default' : 'secondary'}>
                  {participation.status}
                </Badge>
              </div>

              {participation.status === 'completed' ? (
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">Challenge Completed!</p>
                  <p className="text-sm text-green-700">Congratulations on your achievement!</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-700">+{challenge.points_reward || 100} points earned</span>
                  </div>
                </div>
              ) : todayCheckedIn ? (
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">Already checked in today!</p>
                  <p className="text-sm text-green-700">Great job staying consistent!</p>
                  <p className="text-xs text-green-600 mt-2">
                    Last check-in: {format(new Date(participation.last_check_in || ''), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <Separator />
                  <h3 className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Daily Check-in
                  </h3>
                  <Textarea
                    placeholder="How did today go? Any notes or reflections..."
                    value={checkInNote}
                    onChange={(e) => setCheckInNote(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleCheckIn} 
                    className="w-full" 
                    disabled={isCheckingIn}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> 
                    {isCheckingIn ? "Checking in..." : "Check In for Today"}
                  </Button>
                </div>
              )}
              
              <div className="pt-2">
                <InviteFriendsDialog
                  challengeId={challenge.id}
                  challengeTitle={challenge.title}
                  trigger={
                    <Button variant="outline" className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Invite Friends to Join
                    </Button>
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProgressModal(false)}>
              Close
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
    </>
  );
}