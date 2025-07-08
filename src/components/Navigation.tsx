import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Target, User, Trophy, Users, LogOut } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export function Navigation() {
  const { user, signOut } = useAuth();
  const { profile, stats } = useDashboard();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b shadow-sm">
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
            <Link to="/explore" className="text-muted-foreground hover:text-primary transition-colors">
              Explore
            </Link>
            <a href="#community" className="text-muted-foreground hover:text-primary transition-colors">
              Community
            </a>
            <a href="#progress" className="text-muted-foreground hover:text-primary transition-colors">
              Progress
            </a>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <Users className="h-4 w-4" />
                  Find Friends
                </Button>
                <Button variant="ghost" size="sm">
                  <Trophy className="h-4 w-4" />
                  My Challenges
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard">
                    <Target className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Dashboard</span>
                  </Link>
                </Button>
                
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          {profile?.display_name?.[0] || profile?.username?.[0] || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline">
                        {profile?.display_name || profile?.username || 'Profile'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    {/* Profile Header */}
                    <div className="p-4 border-b">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={profile?.avatar_url || ""} />
                          <AvatarFallback className="text-lg">
                            {profile?.display_name?.[0] || profile?.username?.[0] || user.email?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {profile?.display_name || profile?.username || 'User'}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {profile?.bio && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {profile.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="p-3 border-b">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-primary">{stats.challengesCompleted}</p>
                          <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-orange-600">{stats.currentStreak}</p>
                          <p className="text-xs text-muted-foreground">Streak</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600">{stats.activeChallenges}</p>
                          <p className="text-xs text-muted-foreground">Active</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-blue-600">{stats.totalPoints}</p>
                          <p className="text-xs text-muted-foreground">Points</p>
                        </div>
                      </div>
                    </div>
                    {/* Menu Items */}
                    <div className="p-1">
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="flex items-center gap-2 w-full">
                          <Target className="h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" onClick={() => window.location.href = '/dashboard?tab=profile'} className="flex items-center gap-2 w-full">
                          <User className="h-4 w-4" />
                          Profile Settings
                        </Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" onClick={() => window.location.href = '/dashboard?tab=created'} className="flex items-center gap-2 w-full">
                          <Trophy className="h-4 w-4" />
                          My Challenges
                        </Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" onClick={() => window.location.href = '/dashboard?tab=completed'} className="flex items-center gap-2 w-full">
                          <Trophy className="h-4 w-4" />
                          Achievements
                        </Link>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Sign Out</span>
                </Button>
              </>
            ) : (
              <Button variant="hero" size="sm" asChild>
                <Link to="/auth">
                  <User className="h-4 w-4" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}