import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type ResetState = 'request' | 'sent' | 'reset' | 'success' | 'error';

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resetState, setResetState] = useState<ResetState>('request');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    // Check if this is a password reset callback
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    if (accessToken && refreshToken && type === 'recovery') {
      // Set the session with the tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ error }) => {
        if (error) {
          console.error('Error setting session:', error);
          setResetState('error');
        } else {
          setResetState('reset');
        }
      });
    }
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;

      setResetState('sent');
      toast({
        title: "Reset email sent",
        description: "Please check your email for password reset instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setResetState('success');
      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
      setResetState('error');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (resetState) {
      case 'request':
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Reset Your Password</CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a link to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <Link 
                  to="/auth" 
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Remember your password? Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        );

      case 'sent':
        return (
          <Card className="max-w-md mx-auto border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <Mail className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-800 mb-2">Check Your Email</h2>
              <p className="text-green-700 mb-4">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-green-600 mb-6">
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </p>
              
              <Alert className="border-green-300 bg-green-100 mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-green-800">
                  Didn't receive the email? Check your spam folder or try requesting another reset link.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button 
                  onClick={() => setResetState('request')}
                  variant="outline"
                  className="w-full border-green-300 text-green-800 hover:bg-green-100"
                >
                  Send Another Link
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/auth">Back to Sign In</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'reset':
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Set New Password</CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Password must be at least 6 characters long and contain a mix of letters and numbers for security.
                  </AlertDescription>
                </Alert>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case 'success':
        return (
          <Card className="max-w-md mx-auto border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-800 mb-2">Password Updated!</h2>
              <p className="text-green-700 mb-4">
                Your password has been successfully updated. You can now sign in with your new password.
              </p>
              <p className="text-sm text-green-600 mb-6">
                Redirecting to your dashboard...
              </p>
              <Button asChild className="w-full">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        );

      case 'error':
      default:
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Reset Failed</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't reset your password. The link may be invalid or expired.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => setResetState('request')}
                  className="w-full"
                >
                  Request New Reset Link
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/auth">Back to Sign In</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 pt-20 flex items-center justify-start w-full">
        <Link to="/auth" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {renderContent()}
      </div>

      {/* Help Text */}
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Having trouble?{" "}
          <Link to="/support" className="text-primary hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}