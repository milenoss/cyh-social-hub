import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SocialConnection {
  id: string;
  provider: string;
  provider_email: string;
  provider_username: string;
  provider_avatar_url: string;
  created_at: string;
  last_sign_in: string;
}

export function useSocialConnections() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchConnections = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Call the RPC function to get social connections
      const { data, error } = await supabase.rpc('get_social_connections');

      if (error) throw error;

      if (data && data.success) {
        setConnections(data.connections || []);
      }
    } catch (error: any) {
      console.error('Error fetching social connections:', error);
      toast({
        title: "Error",
        description: "Failed to load social connections",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectSocial = async (provider: string) => {
    if (!user) return false;

    try {
      // Call the RPC function to disconnect social account
      const { data, error } = await supabase.rpc('disconnect_social_account', {
        provider
      });

      if (error) throw error;

      toast({
        title: "Social Account Disconnected",
        description: `Your ${provider} account has been disconnected.`,
      });
      
      // Refresh connections
      fetchConnections();
      
      return true;
    } catch (error: any) {
      console.error('Error disconnecting social account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect social account",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  return {
    connections,
    isLoading,
    disconnectSocial,
    refetch: fetchConnections
  };
}