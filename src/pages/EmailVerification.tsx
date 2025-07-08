import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type VerificationState = 'loading' | 'success' | 'error' | 'expired' | 'already_verified';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [verificationState, setVerificationState] = useState<VerificationState>('loading');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const handleEmailVerification = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      // If no token, this might be a direct access to the verification page
      if (!token || type !== 'signup') {
        if (user?.email_confirmed_at) {
          setVerificationState('already_verified');
        } else {
          setVerificationState('error');
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });

        if (error) {
          if (error.message.includes('expired')) {
            setVerificationState('expired');
          } else {
            setVerificationState('error');
          }
          return;
        }

        if (data.user) {
          setVerificationState('success');
          toast({
            title: "Email verified successfully!",
            description: "Welcome to Choose Your Hard. Your account is now active.",
          });
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setVerificationState('error');
      }
    };

    handleEmailVerification();
  }, [searchParams, navigate, user, toast]);

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
        description: "Please check your email for the new verification link.",
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

  const renderContent = () => {
    switch (verificationState) {
      case 'loading':
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
              <p className="text-muted-foreground">Please wait while we confirm your email address.</p>
            </CardContent>
          </Card>
        );

      case 'success':
        return (
          <Card className="max-w-md mx-auto border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-800 mb-2">Email Verified!</h2>
              <p className="text-green-700 mb-4">
                Your email has been successfully verified. You now have full access to all features.
              </p>
              <p className="text-sm text-green-600">
                Redirecting to your dashboard...
              </p>
            </CardContent>
          </Card>
        );

      case 'already_verified':
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Already Verified</h2>
              <p className="text-muted-foreground mb-6">
                Your email address is already verified. You have full access to all features.
              </p>
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        );

      case 'expired':
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <XCircle className="h-16 w-16 text-amber-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Link Expired</h2>
              <p className="text-muted-foreground mb-6">
                This verification link has expired. Please request a new verification email.
              </p>
              <Button 
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full mb-3"
              >
                {isResending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {isResending ? "Sending..." : "Send New Verification Email"}
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link to="/dashboard">Continue to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        );

      case 'error':
      default:
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't verify your email address. The link may be invalid or expired.
              </p>
              {user && !user.email_confirmed_at && (
                <Button 
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="w-full mb-3"
                >
                  {isResending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {isResending ? "Sending..." : "Send New Verification Email"}
                </Button>
              )}
              <Button variant="outline" asChild className="w-full">
                <Link to="/dashboard">Continue to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 pt-20">
        <Link to="/" className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {renderContent()}
      </div>

      {/* Help Text */}
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Having trouble? Check your spam folder or{" "}
          <Link to="/support" className="text-primary hover:underline">
            contact support
          </Link>
        </p>
      </div>
    </div>
  );
}