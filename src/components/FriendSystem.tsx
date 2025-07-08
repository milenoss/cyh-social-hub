import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Check, 
  X, 
  Clock,
  RefreshCw,
  MessageSquare,
  UserCheck
} from "lucide-react";
import { useFriendSystem, Friend, FriendRequest, UserSearchResult } from "@/hooks/useFriendSystem";
import { formatDistanceToNow } from "date-fns";
import { EmailVerificationGuard } from "@/components/EmailVerificationGuard";

export function FriendSystem() {
  const { 
    friends, 
    receivedRequests, 
    sentRequests, 
    loading, 
    actionLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers,
    getFriendSuggestions
  } = useFriendSystem();
  
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { users } = await searchUsers(searchQuery);
      setSearchResults(users);
    } finally {
      setIsSearching(false);
    }
  };

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const suggestedUsers = await getFriendSuggestions();
      setSuggestions(suggestedUsers);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setProcessingAction(userId);
    await sendFriendRequest(userId);
    setProcessingAction(null);
    
    // Update search results to reflect the sent request
    setSearchResults(prev => 
      prev.map(user => 
        user.user_id === userId 
          ? { ...user, has_pending_request: true } 
          : user
      )
    );
  };

  const handleAcceptRequest = async (requestId: string, senderId: string) => {
    setProcessingAction(requestId);
    await acceptFriendRequest(requestId);
    setProcessingAction(null);
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingAction(requestId);
    await rejectFriendRequest(requestId);
    setProcessingAction(null);
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      setProcessingAction(friendId);
      await removeFriend(friendId);
      setProcessingAction(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'suggestions') {
      loadSuggestions();
    }
  }, [activeTab]);

  return (
    <EmailVerificationGuard requireVerification={false} showWarning={true}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Friends & Connections
            </CardTitle>
            <CardDescription>
              Manage your friends and connect with other users
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search for users by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-20"
          />
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8"
          >
            {isSearching ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2">Search</span>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Friends</span>
              {friends.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {friends.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
              {receivedRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {receivedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Suggestions</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your friends...</p>
              </div>
            ) : friends.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Friends Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't added any friends yet. Search for users or check your friend requests.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button onClick={() => setActiveTab("requests")}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Check Requests
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("search")}>
                      <Search className="h-4 w-4 mr-2" />
                      Find Friends
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {friends.map((friend) => (
                  <Card key={friend.friendship_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback>
                            {friend.display_name?.[0] || friend.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{friend.display_name || friend.username}</p>
                          <p className="text-sm text-muted-foreground truncate">@{friend.username}</p>
                          {friend.bio && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{friend.bio}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRemoveFriend(friend.user_id)}
                            disabled={processingAction === friend.user_id}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {processingAction === friend.user_id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
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
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            {/* Received Requests */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Received Requests</h3>
              
              {loading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading requests...</p>
                </div>
              ) : receivedRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      You don't have any pending friend requests.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {receivedRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.sender?.avatar_url} />
                            <AvatarFallback>
                              {request.sender?.display_name?.[0] || request.sender?.username?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{request.sender?.display_name || request.sender?.username}</p>
                            <p className="text-sm text-muted-foreground truncate">@{request.sender?.username}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Sent {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                            </p>
                            {request.message && (
                              <p className="text-sm mt-2 p-2 bg-muted rounded-md">
                                "{request.message}"
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleAcceptRequest(request.id, request.sender_id)}
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
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={processingAction === request.id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Requests */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Sent Requests</h3>
              
              {loading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading requests...</p>
                </div>
              ) : sentRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      You haven't sent any friend requests.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.recipient?.avatar_url} />
                            <AvatarFallback>
                              {request.recipient?.display_name?.[0] || request.recipient?.username?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{request.recipient?.display_name || request.recipient?.username}</p>
                            <p className="text-sm text-muted-foreground truncate">@{request.recipient?.username}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Sent {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                            </p>
                          </div>
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
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-4">
            {loadingSuggestions ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Finding friend suggestions...</p>
              </div>
            ) : suggestions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Suggestions Available</h3>
                  <p className="text-muted-foreground mb-4">
                    We don't have any friend suggestions for you right now. Try searching for users instead.
                  </p>
                  <Button onClick={() => setActiveTab("search")}>
                    <Search className="h-4 w-4 mr-2" />
                    Search for Friends
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((user) => (
                  <Card key={user.user_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.display_name?.[0] || user.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.display_name || user.username}</p>
                          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                          {user.mutual_friends_count > 0 && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {user.mutual_friends_count} mutual {user.mutual_friends_count === 1 ? 'friend' : 'friends'}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleSendRequest(user.user_id)}
                          disabled={processingAction === user.user_id}
                        >
                          {processingAction === user.user_id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                          <span className="ml-2">Add</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Search Results Tab */}
          <TabsContent value="search" className="space-y-4">
            {searchQuery && (
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Search Results</h3>
                {isSearching ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Searching for users...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">
                        No users found matching "{searchQuery}".
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchResults.map((user) => (
                      <Card key={user.user_id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback>
                                {user.display_name?.[0] || user.username?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{user.display_name || user.username}</p>
                              <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                              {user.bio && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{user.bio}</p>
                              )}
                            </div>
                            {user.is_friend ? (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRemoveFriend(user.user_id)}
                                disabled={processingAction === user.user_id}
                              >
                                {processingAction === user.user_id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                                <span className="ml-2">Friends</span>
                              </Button>
                            ) : user.has_pending_request ? (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Pending</span>
                              </Badge>
                            ) : (
                              <Button 
                                size="sm"
                                onClick={() => handleSendRequest(user.user_id)}
                                disabled={processingAction === user.user_id}
                              >
                                {processingAction === user.user_id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserPlus className="h-4 w-4" />
                                )}
                                <span className="ml-2">Add</span>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!searchQuery && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Search for Friends</h3>
                  <p className="text-muted-foreground mb-4">
                    Enter a name or username in the search bar above to find people to connect with.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </EmailVerificationGuard>
  );
}