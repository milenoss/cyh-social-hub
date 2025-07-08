import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, Shield, AlertTriangle } from "lucide-react";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { useTwoFactorAuth } from "@/hooks/useTwoFactorAuth";
import { useAuth } from "@/contexts/AuthContext";

interface TwoFactorAuthDialogProps {
  trigger?: React.ReactNode;
}

export function TwoFactorAuthDialog({ trigger }: TwoFactorAuthDialogProps) {
  const { user } = useAuth();
  const { isEnabled, isLoading, disableTwoFactor } = useTwoFactorAuth();
  const [open, setOpen] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const handleDisable2FA = async () => {
    setIsDisabling(true);
    const success = await disableTwoFactor();
    if (success) {
      setOpen(false);
    }
    setIsDisabling(false);
  };

  const handleSetupComplete = () => {
    setIsSettingUp(false);
    setOpen(false);
  };

  const handleSetupCancel = () => {
    setIsSettingUp(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Smartphone className="h-4 w-4 mr-2" />
            {isEnabled ? "Manage 2FA" : "Setup 2FA"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {isSettingUp ? (
          <TwoFactorSetup 
            userId={user?.id || ''} 
            onComplete={handleSetupComplete} 
            onCancel={handleSetupCancel} 
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                {isEnabled 
                  ? "Manage your two-factor authentication settings" 
                  : "Add an extra layer of security to your account"}
              </DialogDescription>
            </DialogHeader>
            
            {isLoading ? (
              <div className="py-6 text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your security settings...</p>
              </div>
            ) : isEnabled ? (
              <div className="space-y-4 py-4">
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Two-factor authentication is currently <strong>enabled</strong> for your account.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Recovery Codes</h3>
                  <p className="text-sm text-muted-foreground">
                    You have recovery codes that can be used if you lose access to your authenticator app.
                  </p>
                  <Button variant="outline" size="sm">
                    View Recovery Codes
                  </Button>
                </div>
                
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Disabling 2FA will make your account less secure. We recommend keeping it enabled.
                  </AlertDescription>
                </Alert>
                
                <DialogFooter className="sm:justify-between">
                  <Button 
                    variant="destructive" 
                    onClick={handleDisable2FA}
                    disabled={isDisabling}
                  >
                    {isDisabling ? "Disabling..." : "Disable 2FA"}
                  </Button>
                  <Button onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Why use two-factor authentication?</h3>
                  <p className="text-sm text-muted-foreground">
                    Two-factor authentication adds an extra layer of security to your account. 
                    In addition to your password, you'll need a code from your phone to sign in.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <Smartphone className="h-5 w-5 text-primary mb-2" />
                    <h4 className="font-medium">Authenticator App</h4>
                    <p className="text-xs text-muted-foreground">
                      Use Google Authenticator, Authy, or any TOTP app
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Shield className="h-5 w-5 text-primary mb-2" />
                    <h4 className="font-medium">Recovery Codes</h4>
                    <p className="text-xs text-muted-foreground">
                      Backup codes in case you lose your device
                    </p>
                  </div>
                </div>
                
                <DialogFooter className="sm:justify-between">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsSettingUp(true)}>
                    Set Up 2FA
                  </Button>
                </DialogFooter>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}