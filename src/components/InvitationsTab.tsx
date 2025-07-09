import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle,
  Copy,
  Check,
  RefreshCw
} from "lucide-react";
import { useInvitations } from "@/hooks/useInvitations";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export function InvitationsTab() {
  const { sentInvitations, loading, cancelInvitation } = useInvitations();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCancelInvitation = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this invitation?')) {
      setProcessingId(id);
      await cancelInvitation(id);
      setProcessingId(null);
    }
  };

  const handleCopyLink = (token: string) => {
    const invitationLink = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(invitationLink);
    
    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Accepted
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="outline" className="text-red-600 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Declined
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading invitations...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Challenge Invitations</CardTitle>
        <CardDescription>
          Manage invitations you've sent to friends
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sentInvitations.length === 0 ? (
          <div className="text-center py-6">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Invitations Sent</h3>
            <p className="text-muted-foreground mb-4">
              You haven't sent any challenge invitations yet.
            </p>
            <Button variant="outline" asChild>
              <a href="/explore?tab=challenges">Browse Challenges</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sentInvitations.map((invitation) => (
              <Card key={invitation.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{invitation.challenge_title}</h3>
                        {getStatusBadge(invitation.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sent to: {invitation.recipient_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sent {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                        {invitation.accepted_at && ` • Accepted ${format(new Date(invitation.accepted_at), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      {invitation.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleCopyLink(invitation.invitation_token);
                              setCopiedId(invitation.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                          >
                            {copiedId === invitation.id ? (
                              <Check className="h-4 w-4 mr-2" />
                            ) : (
                              <Copy className="h-4 w-4 mr-2" />
                            )}
                            {copiedId === invitation.id ? "Copied" : "Copy Link"}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelInvitation(invitation.id)}
                            disabled={processingId === invitation.id}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {processingId === invitation.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            {processingId === invitation.id ? "" : "Cancel"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}