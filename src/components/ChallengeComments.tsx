import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Heart, 
  Reply, 
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
import { formatDistanceToNow } from "date-fns";

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

// Mock comments data - in real app, this would come from the database
const mockComments: Comment[] = [
  {
    id: '1',
    user_id: 'user1',
    challenge_id: 'challenge1',
    content: 'This challenge has been amazing! Already seeing great results after just one week. The daily check-ins really help keep me accountable.',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z',
    likes_count: 12,
    is_pinned: true,
    user: {
      id: 'user1',
      username: 'fitnessfan',
      display_name: 'Sarah Johnson',
      avatar_url: null
    },
    replies: [
      {
        id: '2',
        user_id: 'user2',
        challenge_id: 'challenge1',
        content: 'Totally agree! The community support makes all the difference.',
        created_at: '2024-01-20T11:00:00Z',
        updated_at: '2024-01-20T11:00:00Z',
        likes_count: 3,
        is_pinned: false,
        parent_id: '1',
        user: {
          id: 'user2',
          username: 'challenger1',
          display_name: 'Alex Chen',
          avatar_url: null
        }
      }
    ]
  },
  {
    id: '3',
    user_id: 'user3',
    challenge_id: 'challenge1',
    content: 'Day 15 update: Still going strong! Had a tough day yesterday but the motivation from everyone here kept me going. Thanks for creating this challenge! 💪',
    created_at: '2024-01-19T15:30:00Z',
    updated_at: '2024-01-19T15:30:00Z',
    likes_count: 8,
    is_pinned: false,
    user: {
      id: 'user3',
      username: 'mindful_mike',
      display_name: 'Mike Wilson',
      avatar_url: null
    }
  },
  {
    id: '4',
    user_id: 'user4',
    challenge_id: 'challenge1',
    content: 'Quick question - is it okay to modify the workout if I have knee issues? Want to make sure I\'m still following the challenge properly.',
    created_at: '2024-01-19T09:15:00Z',
    updated_at: '2024-01-19T09:15:00Z',
    likes_count: 2,
    is_pinned: false,
    user: {
      id: 'user4',
      username: 'growth_guru',
      display_name: 'Emma Davis',
      avatar_url: null
    }
  }
];

export function ChallengeComments({ challengeId, challengeOwnerId }: ChallengeCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      // TODO: Implement actual comment submission
      const mockNewComment: Comment = {
        id: Date.now().toString(),
        user_id: user.id,
        challenge_id: challengeId,
        content: newComment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        likes_count: 0,
        is_pinned: false,
        user: {
          id: user.id,
          username: user.email?.split('@')[0] || 'user',
          display_name: user.email?.split('@')[0] || 'User',
          avatar_url: null
        }
      };

      setComments(prev => [mockNewComment, ...prev]);
      setNewComment("");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return;

    setLoading(true);
    try {
      // TODO: Implement actual reply submission
      const mockReply: Comment = {
        id: Date.now().toString(),
        user_id: user.id,
        challenge_id: challengeId,
        content: replyContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        likes_count: 0,
        is_pinned: false,
        parent_id: parentId,
        user: {
          id: user.id,
          username: user.email?.split('@')[0] || 'user',
          display_name: user.email?.split('@')[0] || 'User',
          avatar_url: null
        }
      };

      setComments(prev => prev.map(comment => 
        comment.id === parentId 
          ? { ...comment, replies: [...(comment.replies || []), mockReply] }
          : comment
      ));
      
      setReplyContent("");
      setReplyingTo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes_count: comment.is_liked ? comment.likes_count - 1 : comment.likes_count + 1,
          is_liked: !comment.is_liked
        };
      }
      return comment;
    }));
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    }
  };

  const handlePinComment = (commentId: string) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, is_pinned: !comment.is_pinned }
        : comment
    ));
  };

  const isOwner = user?.id === challengeOwnerId;

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
                    <Send className="h-4 w-4" />
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
        <div className="flex items-center justify-between">
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
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
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
                        {comment.replies.map((reply) => (
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
                                  {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
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
                                  <Heart className="h-3 w-3 mr-1" />
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