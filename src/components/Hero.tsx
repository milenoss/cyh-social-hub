import { Button } from "@/components/ui/button";
import { Target, Users, Trophy, TrendingUp } from "lucide-react";

export function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/30 to-primary/10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,87,34,0.1),transparent)]"></div>
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto animate-slide-up">
          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Choose Your Hard
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Life's going to be hard no matter what. You might as well choose your hard and make it meaningful.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="hero" size="xl" className="animate-pulse-glow">
              Start Your Challenge
            </Button>
            <Button variant="outline" size="xl">
              Browse Challenges
            </Button>
          </div>
          
          {/* Stats/Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <div className="flex flex-col items-center space-y-2 animate-scale-in" style={{animationDelay: '0.1s'}}>
              <div className="p-3 bg-primary/10 rounded-full">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Pick Your Path</h3>
              <p className="text-xs text-muted-foreground">Choose challenges that matter</p>
            </div>
            
            <div className="flex flex-col items-center space-y-2 animate-scale-in" style={{animationDelay: '0.2s'}}>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Challenge Friends</h3>
              <p className="text-xs text-muted-foreground">Compete and support each other</p>
            </div>
            
            <div className="flex flex-col items-center space-y-2 animate-scale-in" style={{animationDelay: '0.3s'}}>
              <div className="p-3 bg-primary/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Track Progress</h3>
              <p className="text-xs text-muted-foreground">Visual progress tracking</p>
            </div>
            
            <div className="flex flex-col items-center space-y-2 animate-scale-in" style={{animationDelay: '0.4s'}}>
              <div className="p-3 bg-primary/10 rounded-full">
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