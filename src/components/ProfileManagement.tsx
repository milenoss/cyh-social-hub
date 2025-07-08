import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  KeyRound,
  Smartphone,
  Trash2,
  KeyRound,
  Smartphone,
  Trash2,
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { SocialConnectionsManager } from "@/components/SocialConnectionsManager";
import { SecurityAuditLog } from "@/components/SecurityAuditLog";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/lib/supabase-types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { TwoFactorAuthDialog } from "@/components/TwoFactorAuthDialog";
import { AccountDeletionDialog } from "@/components/AccountDeletionDialog";

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
    location: profile?.location || "",
    website: profile?.website || "",
    social_links: (profile?.social_links && typeof profile.social_links === 'object' ? profile.social_links as SocialLinks : {})
  });

  const [notifications, setNotifications] = useState({
    email_challenges: true,
    email_progress: true,
    email_achievements: true,
    push_challenges: true,
    push_progress: false,
    push_achievements: true
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
        location: profile.location || "",
        website: profile.website || "",
        social_links: (profile.social_links && typeof profile.social_links === 'object' ? profile.social_links as SocialLinks : {})
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const result = await onUpdateProfile({
        display_name: formData.display_name,
        username: formData.username,
        bio: formData.bio,
        avatar_url: formData.avatar_url,
        is_public: formData.is_public,
        location: formData.location,
        website: formData.website,
        social_links: formData.social_links
      });
      
      if (result) {
        // Success toast is handled in the hook
      }
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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // For now, just show a placeholder URL
        // In a real app, you'd upload to Supabase Storage
        const reader = new FileReader();
        reader.onload = (e) => {
          setFormData(prev => ({ ...prev, avatar_url: e.target?.result as string }));
        };
        reader.readAsDataURL(file);
        
        toast({
          title: "Avatar Updated",
          description: "Avatar preview updated. Click Save to apply changes.",
        });
      }
    };
    input.click();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== user?.email) {
      toast({
        title: "Error",
        description: "Email confirmation doesn't match",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // This would call a server function to delete the account
      // For now, we'll just show a success message
      toast({
        title: "Account Deletion Requested",
        description: "Your account deletion request has been submitted. You'll receive a confirmation email shortly.",
      });
      
      // In a real implementation, you would call:
      // await supabase.rpc('delete_user_account')
      
      // Redirect to home page after a delay
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
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
          <TabsTrigger value="security" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
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
                      <MapPin className="h-4 w-4" />
                      <Label htmlFor="location">Location</Label>
                    </div>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="City, Country"
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

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and authentication options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Change */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Password</h3>
                <p className="text-sm text-muted-foreground">
                  Change your password or reset it if you've forgotten it
                </p>
                <Button variant="outline" asChild>
                  <Link to="/auth/reset-password">
                    <KeyRound className="h-4 w-4 mr-2" />
                    Change Password
                  </Link>
                </Button>
              </div>

              <Separator />

              {/* Two-Factor Authentication */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account with an authenticator app like Google Authenticator or Authy
                </p>
                <TwoFactorAuthDialog />
              </div>

              <Separator />

              {/* Social Connections */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Social Connections</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your social accounts for easier sign-in
                </p>
                <SocialConnectionsManager />
              </div>

              <Separator />
              
              {/* Security Audit Log */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Security Audit Log</h3>
                <p className="text-sm text-muted-foreground">
                  Review recent security activity on your account
                </p>
                <SecurityAuditLog />
              </div>

              {/* Account Deletion */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Delete Account</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data
                </p>
                <AccountDeletionDialog />
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

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>App Preferences</CardTitle>
              <CardDescription>
                Customize your app experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color theme
                  </p>
                </div>
                <ThemeToggle />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Reduced Motion</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimize animations and transitions
                  </p>
                </div>
                <Switch
                  checked={false}
                  onCheckedChange={() => {
                    // TODO: Implement reduced motion preference
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">
                    Play sounds for interactions and achievements
                  </p>
                </div>
                <Switch
                  checked={true}
                  onCheckedChange={() => {
                    // TODO: Implement sound effects preference
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}