import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { Users, Clock, Target, Edit, Trash2, MoreHorizontal, CheckCircle, Calendar, Award } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChallengeWithCreator } from "@/lib/supabase-types";
import { useAuth } from "@/contexts/AuthContext";
import { useChallengeParticipation } from "@/hooks/useChallengeParticipation";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { InviteFriendsDialog } from "./InviteFriendsDialog";

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
  const isOwner = user?.id === challenge.created_by;
  const hasJoined = !!participation;
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [checkInNote, setCheckInNote] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const handleJoin = () => {
    if (hasJoined) {
      setShowProgressModal(true);
      return;
    }
    setShowJoinModal(true);
  };

  const confirmJoin = async () => {
    const success = await joinChallenge();
    if (success) {
      setShowJoinModal(false);
      setShowProgressModal(true);
    }
  };

  const handleCheckIn = async () => {
    if (!participation) return;
    
    setIsCheckingIn(true);
    const newProgress = Math.min(participation.progress + (100 / challenge.duration_days), 100);
    await updateProgress(newProgress, checkInNote);
    setCheckInNote("");
    setIsCheckingIn(false);
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

  return (
    <>
      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-2">
            <Badge variant="secondary" className="text-xs">
              {challenge.category}
            </Badge>
            <div className="flex items-center gap-2">
              <Badge 
                className={`${difficultyColors[challenge.difficulty]} text-white text-xs`}
              >
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
          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
            {challenge.title}
          </CardTitle>
          {challenge.creator && (
            <p className="text-xs text-muted-foreground">
              by {challenge.creator.display_name || challenge.creator.username || 'Anonymous'}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="pb-4">
          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
            {challenge.description}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{challenge.duration_days} days</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{challenge.participant_count || 0} joined</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {challenge.tags?.slice(0, 3).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="text-xs px-2 py-0"
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
        </CardContent>
        
        <CardFooter className="pt-0">
          {!isOwner && !hasJoined && (
            <Button 
              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
              variant="challenge" 
              onClick={(e) => { 
                handleCardClick(e); 
                handleJoin(); 
              }}
              disabled={loading}
            >
              <Target className="h-4 w-4 mr-2" />
              {loading ? "Joining..." : "Accept Challenge"}
            </Button>
          )}
          {!isOwner && hasJoined && (
            <div className="w-full text-center">
              <div className="text-sm text-green-600 font-medium mb-1">
                <Button 
                  variant="link" 
                  onClick={(e) => {
                    handleCardClick(e);
                    setShowProgressModal(true);
                  }}>
                  ✓ View Progress
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Progress: {participation?.progress || 0}%
              </div>
            </div>
          )}
          {isOwner && (
            <div className="w-full text-center text-sm text-muted-foreground">
              <Button 
                variant="link" 
                className="text-muted-foreground hover:text-primary"
                onClick={() => window.location.href = '/dashboard?tab=created'}>
                Manage Challenge
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Join Challenge Modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Challenge</DialogTitle>
            <DialogDescription>
              Are you ready to accept this challenge?
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
            <Button onClick={confirmJoin} disabled={loading}>
              {loading ? "Joining..." : "Accept Challenge"}
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
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
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
                    <CheckCircle className="h-4 w-4 text-primary" />
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
    </>
  );
}