import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Target, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChallengeWithCreator } from "@/lib/supabase-types";
import { useAuth } from "@/contexts/AuthContext";

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
  const isOwner = user?.id === challenge.created_by;

  const handleJoin = () => {
    onJoin?.(challenge.id);
  };

  const handleEdit = () => {
    onEdit?.(challenge);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
      onDelete?.(challenge.id);
    }
  };

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
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
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
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
        {!isOwner && (
          <Button 
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
            variant="challenge"
            onClick={handleJoin}
          >
            <Target className="h-4 w-4" />
            Accept Challenge
          </Button>
        )}
        {isOwner && (
          <div className="w-full text-center text-sm text-muted-foreground">
            Your Challenge
          </div>
        )}
      </CardFooter>
    </Card>
  );
}