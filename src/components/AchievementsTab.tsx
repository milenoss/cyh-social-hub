import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Target, Award, Calendar } from "lucide-react";

export function AchievementsTab() {
  return (
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
  );
}