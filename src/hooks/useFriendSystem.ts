import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FriendRequest {
  id: string;
  sender_id: string;
  sender?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
  recipient_id?: string;
  recipient?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
  message?: string;
  created_at: string;
}

export interface Friend {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  friendship_id: string;
  created_at: string;
}

export interface UserSearchResult {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  is_friend: boolean;
  has_pending_request: boolean;
}

export type FriendshipStatus = 'none' | 'friends' | 'request_sent' | 'request_received';

export function useFriendSystem() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFriends = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_friends');

      if (error) throw error;

      if (data && data.success) {
        setFriends(data.friends || []);
      }
    } catch (error: any) {
      console.error('Error fetching friends:', error);
      toast({
        title: "Error",
        description: "Failed to load friends",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_friend_requests', {
        status: 'pending'
      });

      if (error) throw error;

      if (data && data.success) {
        setReceivedRequests(data.received || []);
        setSentRequests(data.sent || []);
      }
    } catch (error: any) {
      console.error('Error fetching friend requests:', error);
      toast({
        title: "Error",
        description: "Failed to load friend requests",
        variant: "destructive",
      });
    }
  };

  const sendFriendRequest = async (recipientId: string, message?: string) => {
    if (!user) return false;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('send_friend_request', {
        recipient_id: recipientId,
        message
      });

      if (error) throw error;

      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully.",
      });
      
      // Refresh friend requests
      fetchFriendRequests();
      
      return true;
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const acceptFriendRequest = async (requestId: string) => {
    if (!user) return false;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      });

      if (error) throw error;

      toast({
        title: "Friend Request Accepted",
        description: "You are now friends with this user.",
      });
      
      // Refresh friends and requests
      fetchFriends();
      fetchFriendRequests();
      
      return true;
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept friend request",
        variant: "destructive",
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    if (!user) return false;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('reject_friend_request', {
        request_id: requestId
      });

      if (error) throw error;

      toast({
        title: "Friend Request Rejected",
        description: "The friend request has been rejected.",
      });
      
      // Refresh friend requests
      fetchFriendRequests();
      
      return true;
    } catch (error: any) {
      console.error('Error rejecting friend request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject friend request",
        variant: "destructive",
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return false;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('remove_friend', {
        friend_id: friendId
      });

      if (error) throw error;

      toast({
        title: "Friend Removed",
        description: "This user has been removed from your friends.",
      });
      
      // Refresh friends
      fetchFriends();
      
      return true;
    } catch (error: any) {
      console.error('Error removing friend:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove friend",
        variant: "destructive",
      });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const searchUsers = async (query: string, limit = 10, offset = 0) => {
    if (!user || !query.trim()) return { users: [], total: 0 };

    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_query: query.trim(),
        limit_count: limit,
        offset_count: offset
      });

      if (error) throw error;

      if (data && data.success) {
        return { 
          users: data.users || [], 
          total: data.total || 0 
        };
      }
      
      return { users: [], total: 0 };
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
      return { users: [], total: 0 };
    }
  };

  const getFriendSuggestions = async (limit = 10) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_friend_suggestions', {
        limit_count: limit
      });

      if (error) throw error;

      if (data && data.success) {
        return data.suggestions || [];
      }
      
      return [];
    } catch (error: any) {
      console.error('Error getting friend suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to get friend suggestions",
        variant: "destructive",
      });
      return [];
    }
  };

  const checkFriendshipStatus = async (targetUserId: string): Promise<{
    status: FriendshipStatus;
    requestId?: string;
    isSender?: boolean;
  }> => {
    if (!user) return { status: 'none' };

    try {
      const { data, error } = await supabase.rpc('check_friendship_status', {
        target_user_id: targetUserId
      });

      if (error) throw error;

      if (data && data.success) {
        return {
          status: data.status as FriendshipStatus,
          requestId: data.request_id,
          isSender: data.is_sender
        };
      }
      
      return { status: 'none' };
    } catch (error: any) {
      console.error('Error checking friendship status:', error);
      return { status: 'none' };
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [user]);

  return {
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
    getFriendSuggestions,
    checkFriendshipStatus,
    refetchFriends: fetchFriends,
    refetchRequests: fetchFriendRequests
  };
}