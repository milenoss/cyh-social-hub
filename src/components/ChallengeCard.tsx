import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Target } from "lucide-react";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  duration: string;
  category: string;
  participants: number;
  tags: string[];
}

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin?: (challengeId: string) => void;
}

const difficultyColors = {
  easy: "bg-difficulty-easy",
  medium: "bg-difficulty-medium", 
  hard: "bg-difficulty-hard",
  extreme: "bg-difficulty-extreme"
};

const difficultyLabels = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard", 
  extreme: "Extreme"
};

export function ChallengeCard({ challenge, onJoin }: ChallengeCardProps) {
  const handleJoin = () => {
    onJoin?.(challenge.id);
  };

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary" className="text-xs">
            {challenge.category}
          </Badge>
          <Badge 
            className={`${difficultyColors[challenge.difficulty]} text-white text-xs`}
          >
            {difficultyLabels[challenge.difficulty]}
          </Badge>
        </div>
        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
          {challenge.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-4">
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {challenge.description}
        </p>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{challenge.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{challenge.participants} joined</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {challenge.tags.slice(0, 3).map((tag) => (
            <Badge 
              key={tag} 
              variant="outline" 
              className="text-xs px-2 py-0"
            >
              {tag}
            </Badge>
          ))}
          {challenge.tags.length > 3 && (
            <Badge variant="outline" className="text-xs px-2 py-0">
              +{challenge.tags.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
          variant="challenge"
          onClick={handleJoin}
        >
          <Target className="h-4 w-4" />
          Accept Challenge
        </Button>
      </CardFooter>
    </Card>
  );
}