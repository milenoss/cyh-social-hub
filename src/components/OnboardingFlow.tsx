import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Target, 
  User, 
  Heart, 
  Trophy, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Sparkles,
  Users,
  Calendar,
  Award,
  Flame
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ReactNode;
}

interface OnboardingData {
  displayName: string;
  bio: string;
  interests: string[];
  goals: string[];
  experience: 'beginner' | 'intermediate' | 'advanced';
  preferredDifficulty: string[];
  notifications: {
    email: boolean;
    push: boolean;
    reminders: boolean;
  };
}

const interests = [
  "Fitness", "Learning", "Mindfulness", "Creativity", "Lifestyle", 
  "Health", "Career", "Social", "Financial", "Personal Growth"
];

const goals = [
  "Build better habits", "Improve fitness", "Learn new skills", "Reduce stress",
  "Increase productivity", "Connect with others", "Challenge myself", "Have fun"
];

const difficulties = ["easy", "medium", "hard", "extreme"];

export function OnboardingFlow({ onComplete }: { onComplete: (data: OnboardingData) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    displayName: user?.user_metadata?.full_name || "",
    bio: "",
    interests: [],
    goals: [],
    experience: 'beginner',
    preferredDifficulty: ['easy'],
    notifications: {
      email: true,
      push: true,
      reminders: true
    }
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const toggleArrayItem = (key: 'interests' | 'goals' | 'preferredDifficulty', item: string) => {
    setData(prev => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter(i => i !== item)
        : [...prev[key], item]
    }));
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Choose Your Hard!',
      description: 'Let\'s get you set up for success',
      component: (
        <div className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-gradient-motivation rounded-full flex items-center justify-center">
            <Target className="h-12 w-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Ready to Choose Your Hard?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Life's going to be hard no matter what. Let's help you choose your hard and make it meaningful.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-medium">Join Community</p>
              <p className="text-sm text-muted-foreground">Connect with like-minded people</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-medium">Track Progress</p>
              <p className="text-sm text-muted-foreground">Monitor your growth journey</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'profile',
      title: 'Tell us about yourself',
      description: 'Help others get to know you',
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-2xl">
                {data.displayName?.[0] || user?.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">
              Your profile helps others connect with you
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={data.displayName}
                onChange={(e) => updateData({ displayName: e.target.value })}
                placeholder="How should others know you?"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                value={data.bio}
                onChange={(e) => updateData({ bio: e.target.value })}
                placeholder="Tell us a bit about yourself and what motivates you..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {data.bio.length}/200 characters
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'interests',
      title: 'What interests you?',
      description: 'Select areas you\'d like to focus on',
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              Choose the areas that excite you most. We'll recommend relevant challenges.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {interests.map((interest) => (
              <Button
                key={interest}
                variant={data.interests.includes(interest) ? 'default' : 'outline'}
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => toggleArrayItem('interests', interest)}
              >
                <span className="font-medium">{interest}</span>
                {data.interests.includes(interest) && (
                  <CheckCircle className="h-4 w-4" />
                )}
              </Button>
            ))}
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            Selected {data.interests.length} interests
          </p>
        </div>
      )
    },
    {
      id: 'goals',
      title: 'What are your goals?',
      description: 'Help us understand what you want to achieve',
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <Target className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              What do you hope to accomplish? Select all that apply.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goals.map((goal) => (
              <div
                key={goal}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  data.goals.includes(goal) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleArrayItem('goals', goal)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={data.goals.includes(goal)}
                    onChange={() => {}} // Handled by parent click
                  />
                  <span className="font-medium">{goal}</span>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            Selected {data.goals.length} goals
          </p>
        </div>
      )
    },
    {
      id: 'experience',
      title: 'What\'s your experience level?',
      description: 'This helps us recommend appropriate challenges',
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <Award className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              How would you describe your experience with personal challenges?
            </p>
          </div>
          
          <div className="space-y-3">
            {[
              { 
                value: 'beginner', 
                title: 'Beginner', 
                description: 'New to personal challenges and habit building',
                icon: <Sparkles className="h-5 w-5" />
              },
              { 
                value: 'intermediate', 
                title: 'Intermediate', 
                description: 'Some experience with challenges and goal setting',
                icon: <Flame className="h-5 w-5" />
              },
              { 
                value: 'advanced', 
                title: 'Advanced', 
                description: 'Experienced with challenges and personal development',
                icon: <Trophy className="h-5 w-5" />
              }
            ].map((level) => (
              <Card
                key={level.value}
                className={`cursor-pointer transition-all ${
                  data.experience === level.value 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => updateData({ experience: level.value as any })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      data.experience === level.value 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {level.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{level.title}</h3>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                    {data.experience === level.value && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'difficulty',
      title: 'Preferred difficulty levels',
      description: 'What challenge levels interest you?',
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <Target className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              Select the difficulty levels you're comfortable with. You can always change this later.
            </p>
          </div>
          
          <div className="space-y-3">
            {[
              { 
                value: 'easy', 
                title: 'Easy', 
                description: 'Light commitment, perfect for building habits',
                color: 'bg-green-100 text-green-800'
              },
              { 
                value: 'medium', 
                title: 'Medium', 
                description: 'Moderate effort, good for steady progress',
                color: 'bg-yellow-100 text-yellow-800'
              },
              { 
                value: 'hard', 
                title: 'Hard', 
                description: 'Significant commitment, for serious growth',
                color: 'bg-orange-100 text-orange-800'
              },
              { 
                value: 'extreme', 
                title: 'Extreme', 
                description: 'Maximum dedication, for the most ambitious',
                color: 'bg-red-100 text-red-800'
              }
            ].map((level) => (
              <div
                key={level.value}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  data.preferredDifficulty.includes(level.value) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleArrayItem('preferredDifficulty', level.value)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={data.preferredDifficulty.includes(level.value)}
                    onChange={() => {}} // Handled by parent click
                  />
                  <Badge className={level.color}>
                    {level.title}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{level.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'notifications',
      title: 'Stay motivated',
      description: 'Choose how you\'d like to receive updates',
      component: (
        <div className="space-y-6">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              We'll help keep you on track with gentle reminders and updates.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Email notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Weekly progress summaries and challenge updates
                </p>
              </div>
              <Checkbox
                checked={data.notifications.email}
                onCheckedChange={(checked) => 
                  updateData({ 
                    notifications: { ...data.notifications, email: checked as boolean }
                  })
                }
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Push notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time updates for achievements and milestones
                </p>
              </div>
              <Checkbox
                checked={data.notifications.push}
                onCheckedChange={(checked) => 
                  updateData({ 
                    notifications: { ...data.notifications, push: checked as boolean }
                  })
                }
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Daily reminders</h3>
                <p className="text-sm text-muted-foreground">
                  Gentle nudges to check in on your progress
                </p>
              </div>
              <Checkbox
                checked={data.notifications.reminders}
                onCheckedChange={(checked) => 
                  updateData({ 
                    notifications: { ...data.notifications, reminders: checked as boolean }
                  })
                }
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'complete',
      title: 'You\'re all set!',
      description: 'Welcome to the Choose Your Hard community',
      component: (
        <div className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome aboard, {data.displayName}!</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              You're now part of a community that believes in choosing meaningful challenges. 
              Let's start your journey!
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Target className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium mb-1">Find Challenges</h3>
              <p className="text-sm text-muted-foreground">
                Browse challenges that match your interests
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium mb-1">Join Community</h3>
              <p className="text-sm text-muted-foreground">
                Connect with others on similar journeys
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium mb-1">Track Progress</h3>
              <p className="text-sm text-muted-foreground">
                Monitor your growth and celebrate wins
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (currentStepData.id) {
      case 'profile':
        return data.displayName.trim().length > 0;
      case 'interests':
        return data.interests.length > 0;
      case 'goals':
        return data.goals.length > 0;
      case 'difficulty':
        return data.preferredDifficulty.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(data);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="text-center">
              <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
              <CardDescription>{currentStepData.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {currentStepData.component}
          
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} of {steps.length}
              </span>
            </div>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              variant={currentStep === steps.length - 1 ? 'hero' : 'default'}
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}