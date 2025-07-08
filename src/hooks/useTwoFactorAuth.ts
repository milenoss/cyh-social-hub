import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useTwoFactorAuth() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTwoFactorStatus = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Call the RPC function to get 2FA status
      const { data, error } = await supabase.rpc('get_two_factor_status');

      if (error) throw error;

      if (data && data.success) {
        setIsEnabled(data.two_factor_enabled);
      }
    } catch (error: any) {
      console.error('Error fetching 2FA status:', error);
      toast({
        title: "Error",
        description: "Failed to load 2FA status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupTwoFactor = async () => {
    if (!user) return null;

    setIsSettingUp(true);
    try {
      // In a real implementation, this would call a server function to generate a secret
      // For demo purposes, we'll simulate the response
      
      // This would be the response from your server
      const mockResponse = {
        secret: "JBSWY3DPEHPK3PXP", // Example secret
        qrCodeUrl: "otpauth://totp/ChooseYourHard:user?secret=JBSWY3DPEHPK3PXP&issuer=ChooseYourHard",
        recoveryCodes: [
          "1234-5678-9012",
          "2345-6789-0123",
          "3456-7890-1234",
          "4567-8901-2345",
          "5678-9012-3456"
        ]
      };

      return mockResponse;
    } catch (error: any) {
      console.error('Error setting up 2FA:', error);
      toast({
        title: "Error",
        description: "Failed to set up 2FA",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSettingUp(false);
    }
  };

  const enableTwoFactor = async (secret: string, verificationCode: string) => {
    if (!user) return false;

    try {
      // In a real implementation, this would verify the code and enable 2FA
      // For demo purposes, we'll simulate success
      
      // Generate mock recovery codes
      const recoveryCodes = [
        "1234-5678-9012",
        "2345-6789-0123",
        "3456-7890-1234",
        "4567-8901-2345",
        "5678-9012-3456"
      ];
      
      // Call the RPC function to enable 2FA
      const { data, error } = await supabase.rpc('enable_two_factor', {
        secret,
        recovery_codes: recoveryCodes
      });

      if (error) throw error;

      setIsEnabled(true);
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled for your account.",
      });
      
      return true;
    } catch (error: any) {
      console.error('Error enabling 2FA:', error);
      toast({
        title: "Error",
        description: "Failed to enable 2FA",
        variant: "destructive",
      });
      return false;
    }
  };

  const disableTwoFactor = async () => {
    if (!user) return false;

    try {
      // Call the RPC function to disable 2FA
      const { data, error } = await supabase.rpc('disable_two_factor');

      if (error) throw error;

      setIsEnabled(false);
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });
      
      return true;
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      toast({
        title: "Error",
        description: "Failed to disable 2FA",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTwoFactorStatus();
  }, [user]);

  return {
    isEnabled,
    isLoading,
    isSettingUp,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    refetch: fetchTwoFactorStatus
  };
}