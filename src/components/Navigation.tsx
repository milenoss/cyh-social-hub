import { Button } from "@/components/ui/button";
import { Target, User, Trophy, Users } from "lucide-react";

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-motivation rounded-lg">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Choose Your Hard
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <a href="#challenges" className="text-muted-foreground hover:text-primary transition-colors">
              Challenges
            </a>
            <a href="#community" className="text-muted-foreground hover:text-primary transition-colors">
              Community
            </a>
            <a href="#progress" className="text-muted-foreground hover:text-primary transition-colors">
              Progress
            </a>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <Users className="h-4 w-4" />
              Find Friends
            </Button>
            <Button variant="ghost" size="sm">
              <Trophy className="h-4 w-4" />
              My Challenges
            </Button>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4" />
              Profile
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}