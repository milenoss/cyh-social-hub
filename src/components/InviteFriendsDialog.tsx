import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Mail, Copy, Check, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface InviteFriendsDialogProps {
  challengeId: string;
  challengeTitle: string;
  trigger?: React.ReactNode;
}

export function InviteFriendsDialog({ challengeId, challengeTitle, trigger }: InviteFriendsDialogProps) {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSendInvitations = async () => {
    if (!emails.trim()) {
      toast({
        title: "Error",
        description: "Please enter at least one email address",
        variant: "destructive",
      });
      return;
    }

    const emailList = emails.split(/[,;\s]+/).filter(email => email.trim() !== "");
    const validEmails = emailList.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    
    if (validEmails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter valid email addresses",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      // Send invitations to each email
      const results = await Promise.all(
        validEmails.map(async (email) => {
          const { data, error } = await supabase.rpc('send_challenge_invitation', {
            challenge_id: challengeId,
            recipient_email: email.trim()
          });

          if (error) throw error;
          return data;
        })
      );

      // Generate a shareable link for the first invitation
      if (results.length > 0 && results[0].success) {
        const invitationToken = results[0].invitation.invitation_token;
        const baseUrl = window.location.origin;
        setInvitationLink(`${baseUrl}/invite?token=${invitationToken}`);
      }

      toast({
        title: "Invitations Sent",
        description: `Successfully sent ${validEmails.length} invitation${validEmails.length > 1 ? 's' : ''}`,
      });

      // Clear form but keep dialog open to show the link
      setEmails("");
      setMessage("");
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitations",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    if (!invitationLink) return;
    
    navigator.clipboard.writeText(invitationLink);
    setLinkCopied(true);
    
    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard",
    });
    
    setTimeout(() => setLinkCopied(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Invite Friends
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends to Join</DialogTitle>
          <DialogDescription>
            Invite friends to join "{challengeTitle}" and tackle it together
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="emails">Email Addresses</Label>
            <Input
              id="emails"
              placeholder="friend@example.com, another@example.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Hey! I'm doing this challenge and thought you might want to join me..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          
          {invitationLink && (
            <div className="space-y-2 pt-2">
              <Label>Shareable Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={invitationLink}
                  readOnly
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {linkCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with friends to invite them to the challenge
              </p>
            </div>
          )}
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Invitations will be sent via email. Recipients will need to create an account if they don't have one.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendInvitations}
            disabled={sending || !emails.trim()}
          >
            {sending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}