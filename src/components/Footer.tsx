import { FeedbackForm } from "@/components/FeedbackForm";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-muted/50 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">Choose Your Hard</h3>
            <p className="text-muted-foreground mb-4">
              Transform your life, one challenge at a time. Join our community of achievers.
            </p>
            <FeedbackForm />
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Explore</h3>
            <ul className="space-y-2">
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
          
          <div>
            <h3 className="text-lg font-bold mb-4">Account</h3>
            <ul className="space-y-2">
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
          
          <div>
            <h3 className="text-lg font-bold mb-4">Contact</h3>
            <p className="text-muted-foreground mb-2">
              Have questions or feedback?
            </p>
            <a 
              href="mailto:milenkhanal@gmail.com" 
              className="text-primary hover:underline"
            >
              milenkhanal@gmail.com
            </a>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} Choose Your Hard. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}