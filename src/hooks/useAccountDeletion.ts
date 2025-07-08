import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
        reason
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

  return {
    isDeleting,
    requestAccountDeletion
  };
}