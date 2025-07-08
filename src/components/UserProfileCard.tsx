import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  MessageSquare, 
  Clock,
  RefreshCw,
  Check,
  X
} from "lucide-react";
import { useFriendSystem, FriendshipStatus } from "@/hooks/useFriendSystem";
import { Profile } from "@/lib/supabase-types";

interface UserProfileCardProps {
  profile: Profile;
  showActions?: boolean;
}

export function UserProfileCard({ profile, showActions = true }: UserProfileCardProps) {
  const { 
    checkFriendshipStatus, 
    sendFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest, 
    removeFriend 
  } = useFriendSystem();
  
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    const fetchFriendshipStatus = async () => {
      if (!profile?.user_id) return;
      
      setLoading(true);
      try {
        const result = await checkFriendshipStatus(profile.user_id);
        setFriendshipStatus(result.status);
        setRequestId(result.requestId);
      } finally {
        setLoading(false);
      }
    };

    fetchFriendshipStatus();
  }, [profile?.user_id]);

  const handleSendRequest = async () => {
    if (!profile?.user_id) return;
    
    setProcessingAction(true);
    try {
      await sendFriendRequest(profile.user_id);
      setFriendshipStatus('request_sent');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!requestId) return;
    
    setProcessingAction(true);
    try {
      await acceptFriendRequest(requestId);
      setFriendshipStatus('friends');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!requestId) return;
    
    setProcessingAction(true);
    try {
      await rejectFriendRequest(requestId);
      setFriendshipStatus('none');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!profile?.user_id) return;
    
    if (window.confirm('Are you sure you want to remove this friend?')) {
      setProcessingAction(true);
      try {
        await removeFriend(profile.user_id);
        setFriendshipStatus('none');
      } finally {
        setProcessingAction(false);
      }
    }
  };

  const renderActionButton = () => {
    if (loading) {
      return (
        <Button variant="outline" disabled>
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Loading...
        </Button>
      );
    }

    switch (friendshipStatus) {
      case 'friends':
        return (
          <div className="flex gap-2">
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRemoveFriend}
              disabled={processingAction}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {processingAction ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserMinus className="h-4 w-4 mr-2" />
              )}
              Unfriend
            </Button>
          </div>
        );
      
      case 'request_sent':
        return (
          <Button variant="outline" disabled>
            <Clock className="h-4 w-4 mr-2" />
            Request Sent
          </Button>
        );
      
      case 'request_received':
        return (
          <div className="flex gap-2">
            <Button 
              variant="default" 
              onClick={handleAcceptRequest}
              disabled={processingAction}
            >
              {processingAction ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Accept
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRejectRequest}
              disabled={processingAction}
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        );
      
      case 'none':
      default:
        return (
          <Button 
            onClick={handleSendRequest}
            disabled={processingAction}
          >
            {processingAction ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Add Friend
          </Button>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">User Profile</CardTitle>
          {friendshipStatus === 'friends' && (
            <Badge variant="outline" className="flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              Friends
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback className="text-lg">
              {profile.display_name?.[0] || profile.username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-xl font-semibold">{profile.display_name || profile.username}</h3>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
        </div>
        
        {profile.bio && (
          <p className="text-sm text-muted-foreground">{profile.bio}</p>
        )}
        
        {showActions && (
          <div className="pt-2">
            {renderActionButton()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}