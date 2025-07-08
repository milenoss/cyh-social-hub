import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Camera, Save, LinkIcon, Twitter, Github, Instagram } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/lib/supabase-types";
import { useToast } from "@/hooks/use-toast";

interface SocialLinks {
  website?: string;
  twitter?: string;
  github?: string;
  instagram?: string;
}

interface ProfileInfoTabProps {
  profile: Profile | null;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const getInitialSocialLinks = (socialLinks: any): SocialLinks => {
  if (!socialLinks || typeof socialLinks !== 'object') {
    return {
      website: "",
      twitter: "",
      github: "",
      instagram: ""
    };
  }
  
  return {
    website: socialLinks.website || "",
    twitter: socialLinks.twitter || "",
    github: socialLinks.github || "",
    instagram: socialLinks.instagram || ""
  };
};

export function ProfileInfoTab({ profile, onUpdateProfile }: ProfileInfoTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
    location: "",
    website: "",
    social_links: getInitialSocialLinks(profile?.social_links)
  });

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await onUpdateProfile({
        display_name: formData.display_name,
        username: formData.username,
        bio: formData.bio,
        avatar_url: formData.avatar_url
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
    toast({
      title: "Coming Soon",
      description: "Avatar upload will be available in the next update.",
    });
  };

  return (
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
  );
}