import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Bell, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/lib/supabase-types";
import { ProfileInfoTab } from "./ProfileInfoTab";
import { PrivacySettingsTab } from "./PrivacySettingsTab";
import { NotificationSettingsTab } from "./NotificationSettingsTab";
import { AchievementsTab } from "./AchievementsTab";

interface ProfileManagementProps {
  profile: Profile | null;
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export function ProfileManagement({ profile, onUpdateProfile }: ProfileManagementProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);

  useEffect(() => {
    if (profile) {
      setIsPublic(profile.is_public ?? true);
    }
  }, [profile]);

  const handlePublicChange = (checked: boolean) => {
    setIsPublic(checked);
    onUpdateProfile({ is_public: checked });
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

        <TabsContent value="profile">
          <ProfileInfoTab profile={profile} onUpdateProfile={onUpdateProfile} />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacySettingsTab isPublic={isPublic} onPublicChange={handlePublicChange} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettingsTab />
        </TabsContent>

        <TabsContent value="achievements">
          <AchievementsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}