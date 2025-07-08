import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { ChallengeGrid } from "@/components/ChallengeGrid";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Main Content */}
      <main>
        <Hero />
        <div id="challenges">
          <ChallengeGrid />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-muted/50 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">Ready to Choose Your Hard?</h3>
            <p className="text-muted-foreground mb-6">
              Join thousands of people who decided to make their struggles meaningful. 
              The path won't be easy, but it will be worth it.
            </p>
            <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
              <span>Free Forever</span>
              <span>•</span>
              <span>Community Driven</span>
              <span>•</span>
              <span>Your Growth Matters</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
