import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Settings, 
  Shield, 
  Bell, 
  Eye, 
  EyeOff,
  Camera,
  Save,
  Trophy,
  Target,
  Flame,
  Award,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Github,
  Twitter,
  Instagram
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/lib/supabase-types";
import { useToast } from "@/hooks/use-toast";

interface ProfileManagementProps {
  profile: Profile | null;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void>;
}

interface SocialLinks {
  website?: string;
  twitter?: string;
  github?: string;
  instagram?: string;
}

export function ProfileManagement({ profile, onUpdateProfile }: ProfileManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
    is_public: profile?.is_public ?? true,
    location: "",
    website: "",
    social_links: {} as SocialLinks
  });

  const [notifications, setNotifications] = useState({
    email_challenges: true,
    email_progress: true,
    email_achievements: true,
    push_challenges: true,
    push_progress: false,
    push_achievements: true
  });

  const [privacy, setPrivacy] = useState({
    show_progress: true,
    show_achievements: true,
    show_challenges_created: true,
    allow_friend_requests: true
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
        is_public: profile.is_public ?? true,
        location: "",
        website: "",
        social_links: {}
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await onUpdateProfile({
        display_name: formData.display_name,
        username: formData.username,
        bio: formData.bio,
        avatar_url: formData.avatar_url,
        is_public: formData.is_public
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = () => {
    // TODO: Implement avatar upload functionality
    toast({
      title: "Coming Soon",
      description: "Avatar upload will be available in the next update.",
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, privacy, and notification preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Achievements</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your public profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {formData.display_name?.[0] || formData.username?.[0] || user?.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button onClick={handleAvatarUpload} variant="outline">
                    <Camera className="h-4 w-4" />
                    Change Avatar
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Your unique username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell others about yourself..."
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  {formData.bio.length}/500 characters
                </p>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <Label>Social Links</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      <Label htmlFor="website">Website</Label>
                    </div>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Twitter className="h-4 w-4" />
                      <Label htmlFor="twitter">Twitter</Label>
                    </div>
                    <Input
                      id="twitter"
                      value={formData.social_links.twitter || ""}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        social_links: { ...prev.social_links, twitter: e.target.value }
                      }))}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      <Label htmlFor="github">GitHub</Label>
                    </div>
                    <Input
                      id="github"
                      value={formData.social_links.github || ""}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        social_links: { ...prev.social_links, github: e.target.value }
                      }))}
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" />
                      <Label htmlFor="instagram">Instagram</Label>
                    </div>
                    <Input
                      id="instagram"
                      value={formData.social_links.instagram || ""}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        social_links: { ...prev.social_links, instagram: e.target.value }
                      }))}
                      placeholder="@username"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={loading}>
                  <Save className="h-4 w-4" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control who can see your profile and activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Make your profile visible to everyone
                  </p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Profile Visibility</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Show Progress</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your challenge progress to others
                    </p>
                  </div>
                  <Switch
                    checked={privacy.show_progress}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, show_progress: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Show Achievements</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your badges and achievements
                    </p>
                  </div>
                  <Switch
                    checked={privacy.show_achievements}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, show_achievements: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Show Created Challenges</Label>
                    <p className="text-sm text-muted-foreground">
                      Display challenges you've created
                    </p>
                  </div>
                  <Switch
                    checked={privacy.show_challenges_created}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, show_challenges_created: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow Friend Requests</Label>
                    <p className="text-sm text-muted-foreground">
                      Let others send you friend requests
                    </p>
                  </div>
                  <Switch
                    checked={privacy.allow_friend_requests}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, allow_friend_requests: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Email Notifications</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Challenge Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      New challenges and updates from creators
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_challenges}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_challenges: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Progress Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Daily reminders to check in on your progress
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_progress}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_progress: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Achievement Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      When you earn new badges or milestones
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_achievements}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_achievements: checked }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Push Notifications</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Challenge Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Instant notifications for challenge activity
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push_challenges}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push_challenges: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Progress Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Push reminders for daily check-ins
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push_progress}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push_progress: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Achievement Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Instant notifications for new achievements
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push_achievements}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push_achievements: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
              <CardDescription>
                Badges and milestones you've earned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Mock achievements - in real app, this would come from the database */}
                <div className="p-4 border rounded-lg text-center">
                  <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <h3 className="font-semibold">First Challenge</h3>
                  <p className="text-sm text-muted-foreground">Completed your first challenge</p>
                  <Badge variant="secondary" className="mt-2">Earned</Badge>
                </div>
                
                <div className="p-4 border rounded-lg text-center">
                  <Flame className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Streak Master</h3>
                  <p className="text-sm text-muted-foreground">Maintained a 7-day streak</p>
                  <Badge variant="secondary" className="mt-2">Earned</Badge>
                </div>
                
                <div className="p-4 border rounded-lg text-center opacity-50">
                  <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-semibold">Challenge Creator</h3>
                  <p className="text-sm text-muted-foreground">Create your first challenge</p>
                  <Badge variant="outline" className="mt-2">Locked</Badge>
                </div>
                
                <div className="p-4 border rounded-lg text-center opacity-50">
                  <Award className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-semibold">Mentor</h3>
                  <p className="text-sm text-muted-foreground">Help 10 people complete challenges</p>
                  <Badge variant="outline" className="mt-2">Locked</Badge>
                </div>
                
                <div className="p-4 border rounded-lg text-center opacity-50">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-semibold">Consistency King</h3>
                  <p className="text-sm text-muted-foreground">Complete 30 days in a row</p>
                  <Badge variant="outline" className="mt-2">Locked</Badge>
                </div>
                
                <div className="p-4 border rounded-lg text-center opacity-50">
                  <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-semibold">Champion</h3>
                  <p className="text-sm text-muted-foreground">Complete 10 challenges</p>
                  <Badge variant="outline" className="mt-2">Locked</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}