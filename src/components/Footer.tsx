import { FeedbackForm } from "@/components/FeedbackForm";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-muted/50 py-8 md:py-12">
      <div className="container mx-auto px-2 md:px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div className="text-center sm:text-left">
            <h3 className="text-base md:text-lg font-bold mb-2 md:mb-4">Choose Your Hard</h3>
            <p className="text-sm text-muted-foreground mb-3 md:mb-4">
              Transform your life, one challenge at a time. Join our community of achievers.
            </p>
            <FeedbackForm />
          </div>
          
          <div className="text-center sm:text-left">
            <h3 className="text-base md:text-lg font-bold mb-2 md:mb-4">Explore</h3>
            <ul className="space-y-1 md:space-y-2">
              <li>
                <Link to="/explore?tab=challenges" className="text-muted-foreground hover:text-primary transition-colors">
                  Browse Challenges
                </Link>
              </li>
              <li>
                <Link to="/explore?tab=activity" className="text-muted-foreground hover:text-primary transition-colors">
                  Community Activity
                </Link>
              </li>
              <li>
                <Link to="/explore?tab=leaderboards" className="text-muted-foreground hover:text-primary transition-colors">
                  Leaderboards
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="text-center sm:text-left">
            <h3 className="text-base md:text-lg font-bold mb-2 md:mb-4">Account</h3>
            <ul className="space-y-1 md:space-y-2">
              <li>
                <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/dashboard?tab=profile" className="text-muted-foreground hover:text-primary transition-colors">
                  Profile Settings
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">
                  Sign In / Sign Up
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="text-center sm:text-left">
            <h3 className="text-base md:text-lg font-bold mb-2 md:mb-4">Contact</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Have questions or feedback?
            </p>
            <a 
              href="mailto:chooseyourharduk@gmail.com" 
              className="text-primary hover:underline text-sm md:text-base"
            >
              chooseyourharduk@gmail.com
            </a>
            <div className="mt-3 md:mt-4">
              <p className="text-xs md:text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Choose Your Hard. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}