import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Check, X, RefreshCw } from "lucide-react";
import { useFriendSystem } from "@/hooks/useFriendSystem";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

export function FriendRequestsNotification() {
  const { receivedRequests, acceptFriendRequest, rejectFriendRequest } = useFriendSystem();
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleAcceptRequest = async (requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setProcessingAction(requestId);
    await acceptFriendRequest(requestId);
    setProcessingAction(null);
  };

  const handleRejectRequest = async (requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setProcessingAction(requestId);
    await rejectFriendRequest(requestId);
    setProcessingAction(null);
  };

  if (receivedRequests.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <UserPlus className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
            {receivedRequests.length}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Friend Requests</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-[300px] overflow-y-auto">
          {receivedRequests.map((request) => (
            <DropdownMenuItem key={request.id} className="flex flex-col items-stretch p-0 focus:bg-transparent">
              <div className="flex items-center gap-3 p-2 hover:bg-muted rounded-md">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={request.sender?.avatar_url} />
                  <AvatarFallback>
                    {request.sender?.display_name?.[0] || request.sender?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {request.sender?.display_name || request.sender?.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{request.sender?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="default" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => handleAcceptRequest(request.id, e)}
                    disabled={processingAction === request.id}
                  >
                    {processingAction === request.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => handleRejectRequest(request.id, e)}
                    disabled={processingAction === request.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard?tab=friends" className="w-full cursor-pointer">
            View all requests
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}