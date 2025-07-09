import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Invitation {
  id: string;
  challenge_id: string;
  challenge_title: string;
  recipient_email: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  accepted_at: string | null;
  invitation_token: string;
}

export function useInvitations() {
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSentInvitations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenge_invitations')
        .select(`
          id,
          challenge_id,
          challenges(title),
          recipient_email,
          status,
          created_at,
          accepted_at,
          invitation_token
        `)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include challenge title
      const transformedData = data?.map(invitation => ({
        ...invitation,
        challenge_title: invitation.challenges?.title || 'Unknown Challenge'
      })) || [];

      setSentInvitations(transformedData);
    } catch (error: any) {
      console.error('Error fetching sent invitations:', error);
      toast({
        title: "Error",
        description: "Failed to load invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (challengeId: string, recipientEmail: string, message?: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('send_challenge_invitation', {
        challenge_id: challengeId,
        recipient_email: recipientEmail
      });

      if (error) throw error;

      toast({
        title: "Invitation Sent",
        description: `Successfully sent invitation to ${recipientEmail}`,
      });
      
      // Refresh invitations
      fetchSentInvitations();
      
      return data;
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
      return false;
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('challenge_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('sender_id', user.id);

      if (error) throw error;

      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been cancelled",
      });
      
      // Refresh invitations
      fetchSentInvitations();
      
      return true;
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invitation",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSentInvitations();
  }, [user]);

  return {
    sentInvitations,
    loading,
    sendInvitation,
    cancelInvitation,
    refetch: fetchSentInvitations
  };
}