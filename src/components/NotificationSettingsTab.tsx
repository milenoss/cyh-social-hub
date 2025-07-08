import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export function NotificationSettingsTab() {
  const [notifications, setNotifications] = useState({
    email_challenges: true,
    email_progress: true,
    email_achievements: true,
    push_challenges: true,
    push_progress: false,
    push_achievements: true
  });

  return (
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
  );
}