import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown,
  Calendar,
  Users,
  Target,
  Clock,
  Award,
  TrendingUp,
  Star
} from "lucide-react";
import { ChallengeCard } from "./ChallengeCard";
import { useChallenges } from "@/hooks/useChallenges";
import { ChallengeWithCreator, DifficultyLevel } from "@/lib/supabase-types";

interface SearchFilters {
  query: string;
  categories: string[];
  difficulties: DifficultyLevel[];
  durationRange: [number, number];
  pointsRange: [number, number];
  participantRange: [number, number];
  tags: string[];
  sortBy: 'newest' | 'oldest' | 'popular' | 'difficulty' | 'duration' | 'points';
  sortOrder: 'asc' | 'desc';
  showCompleted: boolean;
  showPublicOnly: boolean;
  createdBy?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

const categories = [
  "Fitness", "Learning", "Mindfulness", "Creativity", "Lifestyle", 
  "Health", "Career", "Social", "Financial", "Personal Growth"
];

const difficulties: DifficultyLevel[] = ["easy", "medium", "hard", "extreme"];

const popularTags = [
  "30-day", "beginner", "advanced", "daily", "weekly", "habit", "fitness", 
  "mindfulness", "productivity", "health", "learning", "social", "creative"
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'difficulty', label: 'By Difficulty' },
  { value: 'duration', label: 'By Duration' },
  { value: 'points', label: 'By Points' }
];

export function AdvancedSearch() {
  const { challenges, loading, joinChallenge } = useChallenges();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    categories: [],
    difficulties: [],
    durationRange: [1, 365],
    pointsRange: [0, 1000],
    participantRange: [0, 1000],
    tags: [],
    sortBy: 'newest',
    sortOrder: 'desc',
    showCompleted: false,
    showPublicOnly: true
  });

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: 'categories' | 'difficulties' | 'tags', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value as any)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      categories: [],
      difficulties: [],
      durationRange: [1, 365],
      pointsRange: [0, 1000],
      participantRange: [0, 1000],
      tags: [],
      sortBy: 'newest',
      sortOrder: 'desc',
      showCompleted: false,
      showPublicOnly: true
    });
  };

  const getFilteredAndSortedChallenges = (): ChallengeWithCreator[] => {
    let filtered = challenges.filter(challenge => {
      // Text search
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const matchesTitle = challenge.title.toLowerCase().includes(query);
        const matchesDescription = challenge.description.toLowerCase().includes(query);
        const matchesTags = challenge.tags?.some(tag => tag.toLowerCase().includes(query));
        const matchesCreator = challenge.creator?.display_name?.toLowerCase().includes(query) ||
                              challenge.creator?.username?.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesDescription && !matchesTags && !matchesCreator) {
          return false;
        }
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(challenge.category)) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulties.length > 0 && !filters.difficulties.includes(challenge.difficulty as DifficultyLevel)) {
        return false;
      }

      // Duration filter
      if (challenge.duration_days < filters.durationRange[0] || challenge.duration_days > filters.durationRange[1]) {
        return false;
      }

      // Points filter
      const points = challenge.points_reward || 0;
      if (points < filters.pointsRange[0] || points > filters.pointsRange[1]) {
        return false;
      }

      // Participant filter
      const participants = challenge.participant_count || 0;
      if (participants < filters.participantRange[0] || participants > filters.participantRange[1]) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const challengeTags = challenge.tags || [];
        const hasMatchingTag = filters.tags.some(tag => 
          challengeTags.some(challengeTag => challengeTag.toLowerCase().includes(tag.toLowerCase()))
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Public only filter
      if (filters.showPublicOnly && !challenge.is_public) {
        return false;
      }

      return true;
    });

    // Sort results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'newest':
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case 'oldest':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'popular':
          comparison = (b.participant_count || 0) - (a.participant_count || 0);
          break;
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3, extreme: 4 };
          comparison = difficultyOrder[a.difficulty as DifficultyLevel] - difficultyOrder[b.difficulty as DifficultyLevel];
          break;
        case 'duration':
          comparison = a.duration_days - b.duration_days;
          break;
        case 'points':
          comparison = (a.points_reward || 0) - (b.points_reward || 0);
          break;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  };

  const filteredChallenges = getFilteredAndSortedChallenges();
  const activeFiltersCount = 
    filters.categories.length + 
    filters.difficulties.length + 
    filters.tags.length + 
    (filters.query ? 1 : 0) +
    (filters.durationRange[0] !== 1 || filters.durationRange[1] !== 365 ? 1 : 0) +
    (filters.pointsRange[0] !== 0 || filters.pointsRange[1] !== 1000 ? 1 : 0) +
    (filters.participantRange[0] !== 0 || filters.participantRange[1] !== 1000 ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search
          </CardTitle>
          <CardDescription>
            Find the perfect challenge with powerful search and filtering options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search challenges, creators, tags..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filters.sortBy === 'popular' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('sortBy', 'popular')}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Popular
            </Button>
            <Button
              variant={filters.sortBy === 'newest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('sortBy', 'newest')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Latest
            </Button>
            <Button
              variant={filters.difficulties.includes('easy') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleArrayFilter('difficulties', 'easy')}
            >
              Beginner Friendly
            </Button>
            <Button
              variant={filters.categories.includes('Fitness') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleArrayFilter('categories', 'Fitness')}
            >
              Fitness
            </Button>
            <Button
              variant={filters.categories.includes('Learning') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleArrayFilter('categories', 'Learning')}
            >
              Learning
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleContent>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Categories */}
              <div className="space-y-3">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={filters.categories.includes(category) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleArrayFilter('categories', category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Difficulty */}
              <div className="space-y-3">
                <Label>Difficulty</Label>
                <div className="flex gap-2">
                  {difficulties.map((difficulty) => (
                    <Button
                      key={difficulty}
                      variant={filters.difficulties.includes(difficulty) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleArrayFilter('difficulties', difficulty)}
                    >
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Duration Range */}
              <div className="space-y-3">
                <Label>Duration (days)</Label>
                <div className="px-3">
                  <Slider
                    value={filters.durationRange}
                    onValueChange={(value) => handleFilterChange('durationRange', value)}
                    max={365}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>{filters.durationRange[0]} days</span>
                    <span>{filters.durationRange[1]} days</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Points Range */}
              <div className="space-y-3">
                <Label>Points Reward</Label>
                <div className="px-3">
                  <Slider
                    value={filters.pointsRange}
                    onValueChange={(value) => handleFilterChange('pointsRange', value)}
                    max={1000}
                    min={0}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>{filters.pointsRange[0]} pts</span>
                    <span>{filters.pointsRange[1]} pts</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Participants Range */}
              <div className="space-y-3">
                <Label>Number of Participants</Label>
                <div className="px-3">
                  <Slider
                    value={filters.participantRange}
                    onValueChange={(value) => handleFilterChange('participantRange', value)}
                    max={1000}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>{filters.participantRange[0]} people</span>
                    <span>{filters.participantRange[1]} people</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-3">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <Button
                      key={tag}
                      variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleArrayFilter('tags', tag)}
                    >
                      #{tag}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Sort Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={filters.sortBy} onValueChange={(value: any) => handleFilterChange('sortBy', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Order</Label>
                  <Select value={filters.sortOrder} onValueChange={(value: any) => handleFilterChange('sortOrder', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Additional Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Show Public Only</Label>
                    <p className="text-sm text-muted-foreground">
                      Only show publicly visible challenges
                    </p>
                  </div>
                  <Switch
                    checked={filters.showPublicOnly}
                    onCheckedChange={(checked) => handleFilterChange('showPublicOnly', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Include Completed</Label>
                    <p className="text-sm text-muted-foreground">
                      Show challenges you've already completed
                    </p>
                  </div>
                  <Switch
                    checked={filters.showCompleted}
                    onCheckedChange={(checked) => handleFilterChange('showCompleted', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Found {filteredChallenges.length} challenges matching your criteria
              </CardDescription>
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                <Badge variant="secondary">{activeFiltersCount}</Badge>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Challenge Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : filteredChallenges.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No challenges found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search criteria or filters to find more challenges.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => (
            <div key={challenge.id} className="animate-fade-in-up">
              <ChallengeCard 
                challenge={challenge} 
                onJoin={joinChallenge}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}