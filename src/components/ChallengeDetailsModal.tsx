import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Users, Trophy, Flag } from 'lucide-react';
import { toast } from 'sonner';

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  category: string;
  duration_days: number;
  points_reward: number;
  tags: string[];
  created_at: string;
  created_by: string;
  is_public: boolean;
}

interface Participant {
  id: string;
  user_id: string;
  progress: number;
  status: string;
  user?: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface ChallengeDetailsModalProps {
  challenge: Challenge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin?: (challengeId: string) => void;
  participants?: Participant[];
}

const difficultyLabels: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  extreme: "Extreme"
};

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-orange-100 text-orange-800",
  extreme: "bg-red-100 text-red-800"
};

export function ChallengeDetailsModal({ 
  challenge, 
  open, 
  onOpenChange, 
  onJoin,
  participants = []
}: ChallengeDetailsModalProps) {
  const [reportSubmitting, setReportSubmitting] = useState(false);

  if (!challenge) return null;

  const handleJoinChallenge = () => {
    if (onJoin) {
      onJoin(challenge.id);
    }
  };

  const handleReportChallenge = async () => {
    setReportSubmitting(true);
    try {
      // Implement report functionality here
      toast.success('Challenge reported successfully');
    } catch (error) {
      toast.error('Failed to report challenge');
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{challenge.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Challenge Info */}
          <div className="flex flex-wrap gap-4 items-center">
            <Badge className={difficultyColors[challenge.difficulty]}>
              {difficultyLabels[challenge.difficulty]}
            </Badge>
            <Badge variant="outline">{challenge.category}</Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {challenge.duration_days} days
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Trophy className="w-4 h-4" />
              {challenge.points_reward} points
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {participants.length} participants
            </div>
          </div>

          {/* Tags */}
          {challenge.tags && challenge.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {challenge.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed">
                  {challenge.description}
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleJoinChallenge} className="flex-1">
                  Join Challenge
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleReportChallenge}
                  disabled={reportSubmitting}
                >
                  <Flag className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="participants" className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Active Participants ({participants.length})</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {participants.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No participants yet. Be the first to join!
                    </p>
                  ) : (
                    participants.map((participant) => (
                      <div key={participant.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={participant.user?.avatar_url} />
                          <AvatarFallback>
                            {participant.user?.display_name?.[0] || participant.user?.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {participant.user?.display_name || participant.user?.username || 'Anonymous'}
                          </p>
                          <div className="flex items-center gap-2">
                            <Progress value={participant.progress} className="w-16 h-1.5" />
                            <span className="text-xs font-medium">{participant.progress}%</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Duration</h4>
                  <p className="text-muted-foreground text-sm">{challenge.duration_days} days</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Difficulty</h4>
                  <p className="text-muted-foreground text-sm">{difficultyLabels[challenge.difficulty]}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Category</h4>
                  <p className="text-muted-foreground text-sm">{challenge.category}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Points Reward</h4>
                  <p className="text-muted-foreground text-sm">{challenge.points_reward} points</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Created</h4>
                  <p className="text-muted-foreground text-sm">
                    {new Date(challenge.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Visibility</h4>
                  <p className="text-muted-foreground text-sm">
                    {challenge.is_public ? 'Public' : 'Private'}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}