import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

export function useAccountDeletion() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const requestAccountDeletion = async (reason?: string) => {
    if (!user) return false;

    setIsDeleting(true);
    try {
      // Call the RPC function to request account deletion
      const { data, error } = await supabase.rpc('request_account_deletion', {
        reason: reason || null
      });

      if (error) throw error;

      toast({
        title: "Account Deletion Requested",
        description: "Your account deletion request has been submitted. You'll receive a confirmation email shortly.",
      });
      
      // Sign out the user
      await signOut();
      
      // Redirect to home page
      window.location.href = '/';
      
      return true;
    } catch (error: any) {
      console.error('Error requesting account deletion:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to request account deletion",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeletionRequest = async (requestId: string, reason?: string) => {
    if (!user) return false;

    try {
      // Call the RPC function to cancel account deletion
      const { data, error } = await supabase.rpc('cancel_account_deletion', {
        request_id: requestId,
        reason: reason || null
      });

      if (error) throw error;

      toast({
        title: "Deletion Request Cancelled",
        description: "Your account deletion request has been cancelled.",
      });
      
      return true;
    } catch (error: any) {
      console.error('Error cancelling deletion request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel deletion request",
        variant: "destructive",
      });
      return false;
    }
  };

  const getDeletionRequests = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('id, status, reason, requested_at, cancellation_reason, data_retention_period')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      return data as any[] || [];
    } catch (error: any) {
      console.error('Error fetching deletion requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch deletion requests",
        variant: "destructive",
      });
      return [];
    }
  };

  return {
    isDeleting,
    requestAccountDeletion,
    cancelDeletionRequest,
    getDeletionRequests
  };
}