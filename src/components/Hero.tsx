import { Button } from "@/components/ui/button";
import { Target, Users, Trophy, TrendingUp } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Link } from "react-router-dom";

export function Hero() {
  const { actualTheme } = useTheme();

  return (
    <section className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-all duration-500 ${
      actualTheme === 'dark' 
        ? 'bg-gradient-to-br from-background via-accent/20 to-primary/5' 
        : 'bg-gradient-to-br from-background via-accent/30 to-primary/10'
    }`}>
      {/* Background decoration */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${
        actualTheme === 'dark'
          ? 'bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.15),transparent)]'
          : 'bg-[radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.1),transparent)]'
      }`}></div>
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto animate-slide-up">
          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Transform Your Life, One Challenge at a Time
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our community of achievers and take on challenges that will reshape your habits, boost your productivity, and elevate your lifestyle.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="hero" size="xl" className="animate-pulse-glow shadow-lg hover:shadow-xl" asChild>
              <Link to="/explore?tab=challenges">
              Start Your Challenge
              </Link>
            </Button>
            <Button variant="outline" size="xl" className="hover:shadow-md" asChild>
              <Link to="/explore?tab=challenges">
              Browse Challenges
              </Link>
            </Button>
          </div>
          
          {/* Stats/Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center space-y-2 animate-scale-in" style={{animationDelay: '0.1s'}}>
              <div className={`p-3 rounded-full transition-colors duration-300 ${
                actualTheme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'
              }`}>
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Pick Your Path</h3>
              <p className="text-xs text-muted-foreground">Choose challenges that matter</p>
            </div>
            
            <div className="flex flex-col items-center space-y-2 animate-scale-in" style={{animationDelay: '0.2s'}}>
              <div className={`p-3 rounded-full transition-colors duration-300 ${
                actualTheme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'
              }`}>
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Challenge Friends</h3>
              <p className="text-xs text-muted-foreground">Compete and support each other</p>
            </div>
            
            <div className="flex flex-col items-center space-y-2 animate-scale-in" style={{animationDelay: '0.3s'}}>
              <div className={`p-3 rounded-full transition-colors duration-300 ${
                actualTheme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'
              }`}>
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Track Progress</h3>
              <p className="text-xs text-muted-foreground">Visual progress tracking</p>
            </div>
            
            <div className="flex flex-col items-center space-y-2 animate-scale-in" style={{animationDelay: '0.4s'}}>
              <div className={`p-3 rounded-full transition-colors duration-300 ${
                actualTheme === 'dark' ? 'bg-primary/20' : 'bg-primary/10'
              }`}>
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Celebrate Wins</h3>
              <p className="text-xs text-muted-foreground">Share your achievements</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}