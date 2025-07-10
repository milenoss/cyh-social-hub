import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChallengeGrid } from "@/components/ChallengeGrid";
import { ChallengeFeed } from "@/components/ChallengeFeed";
import { Leaderboards } from "@/components/Leaderboards";
import { FeedbackForm } from "@/components/FeedbackForm";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { 
  Search, 
  Activity, 
  Trophy, 
  Target,
  TrendingUp,
  Users,
  Flame
} from "lucide-react";

export default function Explore() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("challenges");

  // Handle tab switching from URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['challenges', 'search', 'activity', 'leaderboards', 'friends'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            Explore Challenges
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            Discover new challenges, track community activity, and see how you stack up against others
          </p>
          <div className="flex justify-center">
            <FeedbackForm />
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Challenges</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboards" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Leaderboards</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="challenges">
            <ChallengeGrid />
          </TabsContent>

          <TabsContent value="search">
            <AdvancedSearch />
          </TabsContent>

          <TabsContent value="activity">
            <ChallengeFeed />
          </TabsContent>

          <TabsContent value="leaderboards">
            <Leaderboards />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}