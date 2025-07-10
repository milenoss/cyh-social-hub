import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Heart, 
  Reply,
  RefreshCw,
  MoreHorizontal,
  Flag,
  Trash2,
  Edit,
  Send,
  Pin,
  Award
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  user_id: string;
  challenge_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  is_pinned: boolean;
  parent_id?: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  replies?: Comment[];
  is_liked?: boolean;
}

interface ChallengeCommentsProps {
  challengeId: string;
  challengeOwnerId: string;
}

export function ChallengeComments({ challengeId, challengeOwnerId }: ChallengeCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  const fetchComments = async () => {
    if (!challengeId) return;
    
    setIsLoadingComments(true);
    try {
      const { data, error } = await supabase.rpc('get_real_challenge_comments', {
        challenge_id_param: challengeId
      });

      if (error) throw error;

      if (data && data.success) {
        setComments(data.comments || []);
      } else {
        console.error('Error in response:', data.message);
      }
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [challengeId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('add_real_challenge_comment', {
        challenge_id_param: challengeId,
        content_text: newComment
      });

      if (error) throw error;

      if (data && data.success) {
        // Refresh comments to get the new comment with all data
        fetchComments();
        toast({
          title: "Comment posted",
          description: "Your comment has been posted successfully",
        });
      } else {
        throw new Error(data.message || 'Failed to post comment');
      }

      setNewComment("");
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('add_real_challenge_comment', {
        challenge_id_param: challengeId,
        content_text: replyContent,
        parent_id_param: parentId
      });

      if (error) throw error;

      if (data && data.success) {
        // Refresh comments to get the new reply with all data
        fetchComments();
        toast({
          title: "Reply posted",
          description: "Your reply has been posted successfully",
        });
      } else {
        throw new Error(data.message || 'Failed to post reply');
      }

      setReplyContent("");
      setReplyingTo(null);
    } catch (error: any) {
      console.error('Error posting reply:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to post reply",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like comments",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('toggle_real_comment_like', {
        comment_id_param: commentId
      });

      if (error) throw error;

      if (data && data.success) {
        // Update the comment in the local state
        setComments(prev => 
          prev.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likes_count: data.likes_count,
                is_liked: data.is_liked
              };
            }
            
            // Also check in replies
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map(reply => 
                  reply.id === commentId 
                    ? { ...reply, likes_count: data.likes_count, is_liked: data.is_liked }
                    : reply
                )
              };
            }
            
            return comment;
          })
        );
      } else {
        throw new Error(data.message || 'Failed to toggle like');
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to like comment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        // TODO: Implement actual comment deletion
        // For now, we'll just remove it from the UI
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        
        toast({
          title: "Comment deleted",
          description: "Your comment has been deleted",
        });
      } catch (error: any) {
        console.error('Error deleting comment:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete comment",
          variant: "destructive",
        });
      }
    }
  };

  const handlePinComment = async (commentId: string) => {
    if (!user || user.id !== challengeOwnerId) {
      toast({
        title: "Permission denied",
        description: "Only challenge creators can pin comments",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('toggle_comment_pin', {
        comment_id_param: commentId
      });

      if (error) throw error;

      if (data && data.success) {
        // Update the comment in the local state
        setComments(prev => 
          prev.map(comment => 
            comment.id === commentId 
              ? { ...comment, is_pinned: data.is_pinned }
              : comment
          )
        );
        
        toast({
          title: data.is_pinned ? "Comment pinned" : "Comment unpinned",
          description: data.is_pinned 
            ? "The comment has been pinned to the top" 
            : "The comment has been unpinned",
        });
      } else {
        throw new Error(data.message || 'Failed to toggle pin status');
      }
    } catch (error: any) {
      console.error('Error toggling pin status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to pin/unpin comment",
        variant: "destructive",
      });
    }
  };

  const isOwner = user?.id === challengeOwnerId;

  if (isLoadingComments) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-muted animate-pulse rounded-md"></div>
                <div className="h-20 bg-muted animate-pulse rounded-md"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <div className="h-6 w-40 bg-muted animate-pulse rounded-md"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                        <div>
                          <div className="h-4 w-32 bg-muted animate-pulse rounded-md"></div>
                          <div className="h-3 w-24 bg-muted animate-pulse rounded-md mt-1"></div>
                        </div>
                      </div>
                    </div>
                    <div className="h-16 bg-muted animate-pulse rounded-md"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comment Input */}
      {user ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Share your thoughts, progress, or ask questions..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)} 
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || loading}
                    size="sm"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {loading ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Join the Discussion</h3>
            <p className="text-muted-foreground mb-4">
              Sign in to share your progress and connect with other participants
            </p>
            <Button variant="hero" onClick={() => window.location.href = '/auth'}>
              Sign In to Comment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">
            Comments ({comments.length})
          </h3>
          <Badge variant="outline" className="text-xs">
            {comments.filter(c => c.is_pinned).length} Pinned
          </Badge>
        </div>

        {comments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
              <p className="text-muted-foreground">
                Be the first to share your thoughts on this challenge!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id} className={comment.is_pinned ? "border-primary/50 bg-primary/5" : ""}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Comment Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {comment.user.display_name[0] || comment.user.username[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{comment.user.display_name}</p>
                            <p className="text-xs text-muted-foreground">@{comment.user.username}</p>
                            {comment.is_pinned && (
                              <Badge variant="secondary" className="text-xs">
                                <Pin className="h-3 w-3 mr-1" />
                                Pinned
                              </Badge>
                            )}
                            {comment.user_id === challengeOwnerId && (
                              <Badge variant="outline" className="text-xs">
                                <Award className="h-3 w-3 mr-1" />
                                Creator
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(parseISO(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {/* Comment Actions */}
                      {(user?.id === comment.user_id || isOwner) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isOwner && (
                              <DropdownMenuItem onClick={() => handlePinComment(comment.id)}>
                                <Pin className="h-4 w-4 mr-2" />
                                {comment.is_pinned ? "Unpin" : "Pin"} Comment
                              </DropdownMenuItem>
                            )}
                            {user?.id === comment.user_id && (
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {(user?.id === comment.user_id || isOwner) && (
                              <DropdownMenuItem 
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Flag className="h-4 w-4 mr-2" />
                              Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Comment Content */}
                    <p className="text-sm leading-relaxed">{comment.content}</p>

                    {/* Comment Actions */}
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikeComment(comment.id)}
                        className={`h-8 px-2 ${comment.is_liked ? 'text-red-600' : ''}`}
                      >
                        <Heart className={`h-4 w-4 mr-1 ${comment.is_liked ? 'fill-current' : ''}`} />
                        {comment.likes_count}
                      </Button>
                      
                      {user && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="h-8 px-2"
                        >
                          <Reply className="h-4 w-4 mr-1" />
                          Reply
                        </Button>
                      )}
                    </div>

                    {/* Reply Input */}
                    {replyingTo === comment.id && (
                      <div className="ml-8 pt-3 border-t">
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.user_metadata?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {user?.email?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <Textarea
                              placeholder="Write a reply..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={!replyContent.trim() || loading}
                              >
                                Reply
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-8 pt-3 border-t space-y-3">
                        {comment.replies.map((reply: any) => (
                          <div key={reply.id} className="flex gap-3">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={reply.user.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {reply.user.display_name[0] || reply.user.username[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{reply.user.display_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(parseISO(reply.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              <p className="text-sm">{reply.content}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLikeComment(reply.id)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <Heart className={`h-3 w-3 mr-1 ${reply.is_liked ? 'fill-current text-red-600' : ''}`} />
                                  {reply.likes_count}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}