import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  RefreshCw
} from "lucide-react";
import { useFriendSystem } from "@/hooks/useFriendSystem";

export function FriendSuggestions() {
  const { getFriendSuggestions, sendFriendRequest } = useFriendSystem();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const suggestedUsers = await getFriendSuggestions(5);
      setSuggestions(suggestedUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setProcessingAction(userId);
    await sendFriendRequest(userId);
    setProcessingAction(null);
    
    // Remove from suggestions
    setSuggestions(prev => prev.filter(user => user.user_id !== userId));
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">People You May Know</CardTitle>
          <CardDescription>Friend suggestions based on your connections</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Finding suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          People You May Know
        </CardTitle>
        <CardDescription>Friend suggestions based on your connections</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {suggestions.map((user) => (
            <div key={user.user_id} className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>
                  {user.display_name?.[0] || user.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.display_name || user.username}</p>
                <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                {user.mutual_friends_count > 0 && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {user.mutual_friends_count} mutual {user.mutual_friends_count === 1 ? 'friend' : 'friends'}
                  </Badge>
                )}
              </div>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => handleSendRequest(user.user_id)}
                disabled={processingAction === user.user_id}
              >
                {processingAction === user.user_id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard?tab=friends">View More</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}