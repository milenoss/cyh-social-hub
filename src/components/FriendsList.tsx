import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  UserMinus, 
  MessageSquare, 
  Search, 
  RefreshCw,
  UserCheck
} from "lucide-react";
import { useFriendSystem, Friend } from "@/hooks/useFriendSystem";

interface FriendsListProps {
  compact?: boolean;
  showSearch?: boolean;
  maxItems?: number;
}

export function FriendsList({ compact = false, showSearch = true, maxItems }: FriendsListProps) {
  const { friends, loading, removeFriend } = useFriendSystem();
  const [searchQuery, setSearchQuery] = useState("");
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleRemoveFriend = async (friendId: string) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      setProcessingAction(friendId);
      await removeFriend(friendId);
      setProcessingAction(null);
    }
  };

  const filteredFriends = friends.filter(friend => 
    friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayFriends = maxItems ? filteredFriends.slice(0, maxItems) : filteredFriends;

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading friends...</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            You don't have any friends yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {displayFriends.map((friend) => (
          <Card key={friend.friendship_id}>
            <CardContent className={`${compact ? 'p-3' : 'p-4'}`}>
              <div className="flex items-center gap-3">
                <Avatar className={compact ? "h-10 w-10" : "h-12 w-12"}>
                  <AvatarImage src={friend.avatar_url} />
                  <AvatarFallback>
                    {friend.display_name?.[0] || friend.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                    {friend.display_name || friend.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                </div>
                <div className="flex gap-2">
                  {!compact && (
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRemoveFriend(friend.user_id)}
                    disabled={processingAction === friend.user_id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {processingAction === friend.user_id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : compact ? (
                      <UserMinus className="h-4 w-4" />
                    ) : (
                      <UserMinus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {maxItems && filteredFriends.length > maxItems && (
        <div className="text-center">
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard?tab=friends">View All Friends</a>
          </Button>
        </div>
      )}
    </div>
  );
}