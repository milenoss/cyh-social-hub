import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Trash2, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { useAccountDeletion } from "@/hooks/useAccountDeletion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type DeletionRequest = {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  reason: string | null;
  requested_at: string;
  cancellation_reason: string | null;
  data_retention_period: number;
};

export function AccountDeletionFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    isDeleting, 
    requestAccountDeletion, 
    cancelDeletionRequest, 
    getDeletionRequests 
  } = useAccountDeletion();
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [pendingRequest, setPendingRequest] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchDeletionRequests = async () => {
      setLoading(true);
      try {
        const requests = await getDeletionRequests();
        const pendingReq = requests.find(req => req.status === 'pending');
        setPendingRequest(pendingReq || null);
      } catch (error) {
        console.error('Error fetching deletion requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeletionRequests();
  }, []);

  const handleRequestDeletion = async () => {
    if (!user) return;
    
    if (confirmation !== user.email) {
      toast({
        title: "Confirmation failed",
        description: "Please enter your email correctly to confirm deletion",
        variant: "destructive",
      });
      return;
    }
    
    const success = await requestAccountDeletion(reason);
    if (success) {
      setShowConfirmation(false);
      setReason("");
      setConfirmation("");
      
      // Refresh the pending request
      const requests = await getDeletionRequests();
      const pendingReq = requests.find(req => req.status === 'pending');
      setPendingRequest(pendingReq || null);
    }
  };

  const handleCancelDeletion = async () => {
    if (!pendingRequest) return;
    
    setIsCancelling(true);
    try {
      const success = await cancelDeletionRequest(pendingRequest.id, cancellationReason);
      if (success) {
        setPendingRequest(null);
        setCancellationReason("");
        toast({
          title: "Deletion request cancelled",
          description: "Your account deletion request has been cancelled.",
        });
      }
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking account status...</p>
        </CardContent>
      </Card>
    );
  }

  if (pendingRequest) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-amber-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Account Deletion Pending
          </CardTitle>
          <CardDescription className="text-amber-700">
            Your account is scheduled for deletion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your account will be permanently deleted after the retention period. This action cannot be undone.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Requested on:</span>
              <span>{new Date(pendingRequest.requested_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Data retention period:</span>
              <span>{pendingRequest.data_retention_period} days</span>
            </div>
            {pendingRequest.reason && (
              <div className="pt-2">
                <span className="font-medium text-sm">Reason for deletion:</span>
                <p className="text-sm mt-1 p-2 bg-amber-100 rounded-md">{pendingRequest.reason}</p>
              </div>
            )}
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <h3 className="text-base font-medium">Want to keep your account?</h3>
            <p className="text-sm text-muted-foreground">
              If you've changed your mind, you can cancel your deletion request.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="cancellation-reason">Reason for cancellation (optional)</Label>
              <Textarea
                id="cancellation-reason"
                placeholder="Tell us why you decided to keep your account..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
              />
            </div>
            
            <Button 
              variant="default" 
              onClick={handleCancelDeletion}
              disabled={isCancelling}
              className="w-full"
            >
              {isCancelling ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isCancelling ? "Cancelling..." : "Keep My Account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showConfirmation) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Confirm Account Deletion
          </CardTitle>
          <CardDescription>
            This action cannot be undone. Please confirm your decision.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              All your data will be permanently deleted after the retention period. This includes your profile, challenges, progress, and all other account information.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="delete-reason">Why are you leaving? (Optional)</Label>
            <Textarea
              id="delete-reason"
              placeholder="Please tell us why you're deleting your account..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="delete-confirmation" className="text-destructive">
              Type <strong>{user?.email}</strong> to confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Enter your email to confirm"
              className="border-destructive/50 focus-visible:ring-destructive"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowConfirmation(false);
              setReason("");
              setConfirmation("");
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleRequestDeletion}
            disabled={isDeleting || confirmation !== user?.email}
          >
            {isDeleting ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {isDeleting ? "Processing..." : "Delete My Account"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Account</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Deleting your account is permanent. All your data will be permanently deleted and cannot be recovered.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <h3 className="font-medium">What happens when you delete your account:</h3>
          <ul className="space-y-2 list-disc pl-5 text-sm">
            <li>Your profile and personal information will be permanently deleted</li>
            <li>All your challenges, progress, and achievements will be removed</li>
            <li>Your friendships and social connections will be deleted</li>
            <li>You will lose access to all features and content</li>
            <li>Your data will be retained for 30 days before permanent deletion</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="destructive" 
          onClick={() => setShowConfirmation(true)}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Account
        </Button>
      </CardFooter>
    </Card>
  );
}