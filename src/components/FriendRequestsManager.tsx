import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  X, 
  Clock, 
  RefreshCw
} from "lucide-react";
import { useFriendSystem, FriendRequest } from "@/hooks/useFriendSystem";
import { formatDistanceToNow } from "date-fns";

interface FriendRequestsManagerProps {
  type: 'received' | 'sent';
  compact?: boolean;
}

export function FriendRequestsManager({ type, compact = false }: FriendRequestsManagerProps) {
  const { 
    receivedRequests, 
    sentRequests, 
    loading, 
    acceptFriendRequest, 
    rejectFriendRequest 
  } = useFriendSystem();
  
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const requests = type === 'received' ? receivedRequests : sentRequests;

  const handleAcceptRequest = async (requestId: string) => {
    setProcessingAction(requestId);
    await acceptFriendRequest(requestId);
    setProcessingAction(null);
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingAction(requestId);
    await rejectFriendRequest(requestId);
    setProcessingAction(null);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            {type === 'received' 
              ? "You don't have any pending friend requests." 
              : "You haven't sent any friend requests."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardContent className={`${compact ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center gap-3">
              <Avatar className={compact ? "h-10 w-10" : "h-12 w-12"}>
                <AvatarImage 
                  src={type === 'received' 
                    ? request.sender?.avatar_url 
                    : request.recipient?.avatar_url} 
                />
                <AvatarFallback>
                  {type === 'received'
                    ? request.sender?.display_name?.[0] || request.sender?.username?.[0] || 'U'
                    : request.recipient?.display_name?.[0] || request.recipient?.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                  {type === 'received'
                    ? request.sender?.display_name || request.sender?.username
                    : request.recipient?.display_name || request.recipient?.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{type === 'received' ? request.sender?.username : request.recipient?.username}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {type === 'received' ? 'Received' : 'Sent'} {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </p>
              </div>
              
              {type === 'received' ? (
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleAcceptRequest(request.id)}
                    disabled={processingAction === request.id}
                  >
                    {processingAction === request.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {!compact && <span className="ml-2">Accept</span>}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRejectRequest(request.id)}
                    disabled={processingAction === request.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                    {!compact && <span className="ml-2">Reject</span>}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Pending</span>
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRejectRequest(request.id)}
                    disabled={processingAction === request.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {processingAction === request.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    {!compact && <span className="ml-2">Cancel</span>}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}