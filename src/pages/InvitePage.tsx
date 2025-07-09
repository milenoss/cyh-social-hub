import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Users, ArrowLeft, RefreshCw, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type InvitationState = 'loading' | 'success' | 'error' | 'expired' | 'not_authenticated';

interface InvitationDetails {
  challengeId: string;
  challengeTitle: string;
  senderName: string;
}

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [invitationState, setInvitationState] = useState<InvitationState>('loading');
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setInvitationState('error');
      return;
    }

    const fetchInvitationDetails = async () => {
      try {
        // In a real implementation, you would fetch the invitation details
        // For now, we'll simulate this with a delay
        const { data, error } = await supabase.rpc('get_invitation_details', {
          invitation_token: token
        });

        if (error) throw error;

        if (data && data.success) {
          setInvitationDetails({
            challengeId: data.challenge_id,
            challengeTitle: data.challenge_title,
            senderName: data.sender_name
          });
          setInvitationState('loading');
        } else {
          setInvitationState('expired');
        }
      } catch (error) {
        console.error('Error fetching invitation:', error);
        setInvitationState('error');
      }
    };

    fetchInvitationDetails();
  }, [searchParams]);

  useEffect(() => {
    // Once we have both user and invitation details, we can determine the state
    if (invitationDetails) {
      if (!user) {
        setInvitationState('not_authenticated');
      } else {
        setInvitationState('loading');
      }
    }
  }, [user, invitationDetails]);

  const handleAcceptInvitation = async () => {
    if (!user || !invitationDetails) return;

    const token = searchParams.get('token');
    if (!token) return;

    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc('accept_challenge_invitation', {
        invitation_token: token
      });

      if (error) throw error;

      if (data && data.success) {
        setInvitationState('success');
        toast({
          title: "Challenge Joined",
          description: `You've successfully joined the challenge: ${invitationDetails.challengeTitle}`,
        });
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard?tab=active');
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to accept invitation');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
      setInvitationState('error');
    } finally {
      setAccepting(false);
    }
  };

  const renderContent = () => {
    switch (invitationState) {
      case 'loading':
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Loading invitation...</h2>
              <p className="text-muted-foreground">Please wait while we retrieve the challenge details.</p>
            </CardContent>
          </Card>
        );

      case 'success':
        return (
          <Card className="max-w-md mx-auto border-green-200 bg-green-50">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-800 mb-2">Challenge Joined!</h2>
              <p className="text-green-700 mb-4">
                You've successfully joined the challenge: <strong>{invitationDetails?.challengeTitle}</strong>
              </p>
              <p className="text-sm text-green-600">
                Redirecting to your dashboard...
              </p>
            </CardContent>
          </Card>
        );

      case 'not_authenticated':
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Join Challenge</CardTitle>
              <CardDescription>
                You've been invited to join a challenge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {invitationDetails?.senderName} invited you to join:
                </h3>
                <p className="font-medium text-lg mb-4">
                  {invitationDetails?.challengeTitle}
                </p>
                <Alert className="mb-4">
                  <AlertDescription>
                    Please sign in or create an account to join this challenge.
                  </AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <Link to="/auth">Sign In / Create Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'expired':
        return (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <XCircle className="h-16 w-16 text-amber-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invitation Expired</h2>
              <p className="text-muted-foreground mb-6">
                This invitation has expired or has already been used.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/explore?tab=challenges">Browse Challenges</Link>
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
              <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't find this invitation. It may be invalid or expired.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/explore?tab=challenges">Browse Challenges</Link>
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 pt-20 flex items-center justify-start w-full">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {renderContent()}
      </div>

      {/* Action Buttons */}
      {invitationState === 'loading' && user && invitationDetails && (
        <div className="flex justify-center pb-8">
          <Button 
            onClick={handleAcceptInvitation}
            disabled={accepting}
            size="lg"
            className="min-w-[200px]"
          >
            {accepting ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Target className="h-4 w-4 mr-2" />
            )}
            {accepting ? "Joining..." : "Accept Challenge"}
          </Button>
        </div>
      )}
    </div>
  );
}