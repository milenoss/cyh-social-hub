import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface PrivacySettingsTabProps {
  isPublic: boolean;
  onPublicChange: (isPublic: boolean) => void;
}

export function PrivacySettingsTab({ isPublic, onPublicChange }: PrivacySettingsTabProps) {
  const [privacy, setPrivacy] = useState({
    show_progress: true,
    show_achievements: true,
    show_challenges_created: true,
    allow_friend_requests: true
  });

  return (
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
            checked={isPublic}
            onCheckedChange={onPublicChange}
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
  );
}