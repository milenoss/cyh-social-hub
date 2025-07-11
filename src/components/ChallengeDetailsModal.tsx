import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Users, Trophy, Flag, Target, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { RealParticipantsList } from './RealParticipantsList';
import { ChallengeComments } from './ChallengeComments';
import { FeedbackDialog } from './FeedbackDialog';
import { useAuth } from '@/contexts/AuthContext';

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
  const [activeTab, setActiveTab] = useState('description');
  const { user } = useAuth();

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
      <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-2 md:p-4">
          <DialogTitle className="text-xl md:text-2xl font-bold">{challenge.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 md:space-y-6">
          {/* Challenge Info */}
          <div className="flex flex-wrap gap-2 md:gap-4 items-center">
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
          <div className="flex flex-wrap gap-1 md:gap-2">
            {challenge.tags && challenge.tags.length > 0 && (
              {challenge.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-3 text-xs">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="space-y-3 md:space-y-4">
              <div className="prose prose-sm max-w-none mt-2">
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {challenge.description}
                </p>
              </div>
              
              <div className="flex gap-2 md:gap-3 pt-2 md:pt-4">
                <Button onClick={handleJoinChallenge} className="flex-1 text-xs md:text-sm py-1.5 md:py-2">
                  Join Challenge
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleReportChallenge}
                  disabled={reportSubmitting}
                >
                  <FeedbackDialog 
                    trigger={
                      <div className="flex items-center gap-2">
                        <Flag className="h-4 w-4" />
                        <span>Report</span>
                      </div>
                    }
                    challengeId={challenge.id}
                    challengeTitle={challenge.title}
                  />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="participants" className="space-y-4">
              <RealParticipantsList 
                challengeId={challenge.id} 
                currentUserId={user?.id}
                showAsLeaderboard={true}
              />
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
    </Dialog>
  );
}