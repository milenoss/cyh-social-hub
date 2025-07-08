import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Shield, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface EmailVerificationGuardProps {
  children: ReactNode;
  requireVerification?: boolean;
  showWarning?: boolean;
}

export function EmailVerificationGuard({ 
  children, 
  requireVerification = false,
  showWarning = true 
}: EmailVerificationGuardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  const isVerified = user?.email_confirmed_at;

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`
        }
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: "Please check your email for the verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // If verification is required and user is not verified, show verification required screen
  if (requireVerification && user && !isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle>Email Verification Required</CardTitle>
            <CardDescription>
              Please verify your email address to access this feature
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <Mail className="h-4 w-4" />
              <AlertDescription className="text-amber-800">
                We've sent a verification link to <strong>{user.email}</strong>. 
                Please check your email and click the link to verify your account.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Button 
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {isResending ? "Sending..." : "Resend Verification Email"}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Didn't receive the email? Check your spam folder or try resending.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If showing warning and user is not verified, show warning banner with content
  if (showWarning && user && !isVerified) {
    return (
      <div>
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 mb-4">
          <Mail className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <div className="flex-1">
              <strong>Please verify your email address.</strong> Some features may be limited until verified.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendVerification}
              disabled={isResending}
              className="border-amber-300 text-amber-800 hover:bg-amber-100 ml-4"
            >
              {isResending ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Mail className="h-3 w-3 mr-1" />
              )}
              {isResending ? "Sending..." : "Resend"}
            </Button>
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  // Default: show children without any verification UI
  return <>{children}</>;
}