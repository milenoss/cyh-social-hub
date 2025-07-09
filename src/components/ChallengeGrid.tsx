import { useState } from "react";
import { ChallengeCard } from "./ChallengeCard";
import { ChallengeDetailsModal } from "./ChallengeDetailsModal";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CreateChallengeDialog } from "./CreateChallengeDialog";
import { useChallenges } from "@/hooks/useChallenges";
import { useAuth } from "@/contexts/AuthContext";
import { ChallengeWithCreator, DifficultyLevel } from "@/lib/supabase-types";

const categories = ["All", "Fitness", "Learning", "Mindfulness", "Creativity", "Lifestyle", "Health", "Career", "Social", "Financial", "Personal Growth"];
const difficulties: (string | DifficultyLevel)[] = ["All", "easy", "medium", "hard", "extreme"];

export function ChallengeGrid() {
  const { user } = useAuth();
  const { challenges, loading, createChallenge, updateChallenge, deleteChallenge, joinChallenge } = useChallenges();
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeWithCreator | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");

  const filteredChallenges = challenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || challenge.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "All" || challenge.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const handleJoinChallenge = (challengeId: string) => {
    if (!user) {
      // Redirect to auth page or show login modal
      window.location.href = '/auth';
      return;
    }
    joinChallenge(challengeId);
  };

  const handleEditChallenge = (challenge: ChallengeWithCreator) => {
    // TODO: Implement edit challenge modal
    console.log("Edit challenge:", challenge);
  };

  const handleDeleteChallenge = (challengeId: string) => {
    deleteChallenge(challengeId);
  };

  const handleChallengeClick = (challenge: ChallengeWithCreator) => {
    setSelectedChallenge(challenge);
    setDetailsModalOpen(true);
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choose Your Challenge
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Loading challenges...
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choose Your Challenge
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Every challenge is an opportunity to grow. Pick the one that scares and excites you the most.
          </p>
          {user && (
            <CreateChallengeDialog 
              onCreateChallenge={createChallenge}
              trigger={
                <Button variant="hero" size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Challenge
                </Button>
              }
            />
          )}
        </div>

        {/* Challenge Details Modal */}
        <ChallengeDetailsModal
          challenge={selectedChallenge}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          onJoin={handleJoinChallenge}
        />

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search challenges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap justify-center gap-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Categories:
              </span>
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:scale-105"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Difficulty:</span>
            {difficulties.map((difficulty) => (
              <Badge
                key={difficulty}
                variant={selectedDifficulty === difficulty ? "default" : "outline"}
                className="cursor-pointer transition-all hover:scale-105"
                onClick={() => setSelectedDifficulty(difficulty)}
              >
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="text-center mb-6">
          <p className="text-muted-foreground">
            Showing {filteredChallenges.length} of {challenges.length} challenges
          </p>
        </div>

        {/* Challenge Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => (
            <div key={challenge.id} className="animate-scale-in cursor-pointer" onClick={() => handleChallengeClick(challenge)}>
              <ChallengeCard 
                challenge={challenge} 
                onJoin={handleJoinChallenge}
                onEdit={handleEditChallenge}
                onDelete={handleDeleteChallenge}
              />
            </div>
          ))}
        </div>

        {filteredChallenges.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {challenges.length === 0 
                ? "No challenges available yet. Be the first to create one!" 
                : "No challenges found matching your criteria."
              }
            </p>
            <div className="flex justify-center gap-4">
              {challenges.length > 0 && (
                <Button variant="outline" onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("All");
                    setSelectedDifficulty("All");
                }}>
                  Clear Filters
                </Button>
              )}
                {!user && (
                  <Button variant="hero" asChild>
                    <Link to="/auth">
                      <Plus className="h-4 w-4 mr-2" />
                      Sign In to Create Challenge
                    </Link>
                  </Button>
                )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}