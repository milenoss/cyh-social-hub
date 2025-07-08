import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { ChallengeGrid } from "@/components/ChallengeGrid";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { useAuth } from "@/contexts/AuthContext";
import { EmailVerificationGuard } from "@/components/EmailVerificationGuard";
import { useEffect, useState } from "react";

const Index = () => {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true); // TODO: Check from user profile

  // Auto-redirect authenticated users to main page
  useEffect(() => {
    if (window.location.pathname === '/auth' && user) {
      window.location.href = '/';
    }
  }, [user]);

  const handleOnboardingComplete = (data: any) => {
    // TODO: Save onboarding data to user profile
    console.log('Onboarding completed:', data);
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
  };

  // Show onboarding for new users
  useEffect(() => {
    if (user && !hasCompletedOnboarding && !loading) {
      setShowOnboarding(true);
    }
  }, [user, hasCompletedOnboarding, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding flow for new users
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Main Content */}
      <EmailVerificationGuard showWarning={user ? true : false}>
        <main className="pt-16">
        <Hero />
        <div id="challenges">
          <ChallengeGrid />
        </div>
        </main>
      </EmailVerificationGuard>
      
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
