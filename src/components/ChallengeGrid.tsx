import { useState } from "react";
import { ChallengeCard, type Challenge } from "./ChallengeCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Sample challenge data
const sampleChallenges: Challenge[] = [
  {
    id: "1",
    title: "30-Day Morning Workout",
    description: "Start your day with energy! 30 minutes of exercise every morning for 30 days. Build the habit that transforms your entire day.",
    difficulty: "medium",
    duration: "30 days",
    category: "Fitness",
    participants: 1247,
    tags: ["fitness", "morning", "habit", "energy"]
  },
  {
    id: "2", 
    title: "Learn a Programming Language",
    description: "Master the fundamentals of a new programming language in 90 days. Daily coding practice and weekly projects.",
    difficulty: "hard",
    duration: "90 days",
    category: "Learning",
    participants: 856,
    tags: ["coding", "skills", "career", "technology"]
  },
  {
    id: "3",
    title: "Digital Detox Weekend",
    description: "Disconnect from all digital devices for 48 hours. Rediscover the joy of offline activities and deep focus.",
    difficulty: "easy",
    duration: "2 days",
    category: "Mindfulness",
    participants: 2103,
    tags: ["mindfulness", "focus", "wellness", "balance"]
  },
  {
    id: "4",
    title: "Write a Novel in a Month",
    description: "Complete NaNoWriMo challenge - write 50,000 words in 30 days. Join a community of aspiring authors.",
    difficulty: "extreme",
    duration: "30 days", 
    category: "Creativity",
    participants: 423,
    tags: ["writing", "creativity", "nanowrimo", "storytelling"]
  },
  {
    id: "5",
    title: "Cook Every Meal at Home",
    description: "No takeout, no eating out. Cook every single meal at home for 14 days. Improve your cooking skills and save money.",
    difficulty: "medium",
    duration: "14 days",
    category: "Lifestyle",
    participants: 789,
    tags: ["cooking", "health", "money", "skills"]
  },
  {
    id: "6",
    title: "Read 12 Books This Year",
    description: "Commit to reading one book per month. Expand your knowledge and perspective through diverse literature.",
    difficulty: "easy",
    duration: "12 months",
    category: "Learning",
    participants: 1567,
    tags: ["reading", "knowledge", "personal growth", "books"]
  }
];

const categories = ["All", "Fitness", "Learning", "Mindfulness", "Creativity", "Lifestyle"];
const difficulties = ["All", "easy", "medium", "hard", "extreme"];

export function ChallengeGrid() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [challenges] = useState<Challenge[]>(sampleChallenges);

  const filteredChallenges = challenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         challenge.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || challenge.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "All" || challenge.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const handleJoinChallenge = (challengeId: string) => {
    // TODO: Implement join challenge logic
    console.log("Joining challenge:", challengeId);
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choose Your Challenge
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every challenge is an opportunity to grow. Pick the one that scares and excites you the most.
          </p>
        </div>

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
            <div key={challenge.id} className="animate-scale-in">
              <ChallengeCard 
                challenge={challenge} 
                onJoin={handleJoinChallenge}
              />
            </div>
          ))}
        </div>

        {filteredChallenges.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No challenges found matching your criteria.</p>
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedCategory("All");
              setSelectedDifficulty("All");
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}