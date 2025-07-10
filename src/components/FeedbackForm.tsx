import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, RefreshCw, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface FeedbackFormProps {
  trigger?: React.ReactNode;
  challengeId?: string;
  challengeTitle?: string;
}

export function FeedbackForm({ trigger, challengeId, challengeTitle }: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "general",
    subject: "",
    message: "",
    email: user?.email || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // In a real implementation, this would call an API endpoint
      // For now, we'll simulate sending an email
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Log the feedback data that would be sent
      console.log("Feedback would be sent to: milenkhanal@gmail.com");
      console.log("Feedback data:", {
        ...formData,
        userId: user?.id || "anonymous",
        challengeId,
        challengeTitle,
        timestamp: new Date().toISOString(),
      });
      
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll review it shortly.",
      });
      
      // Reset form and close dialog
      setFormData({
        type: "general",
        subject: "",
        message: "",
        email: user?.email || "",
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Feedback
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            {challengeId 
              ? `Share your thoughts about "${challengeTitle || 'this challenge'}"`
              : "Help us improve Choose Your Hard with your feedback"
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Feedback Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Feedback</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="content">Challenge Content</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="feedback-subject">Subject</Label>
            <Input
              id="feedback-subject"
              placeholder="Brief description of your feedback"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              placeholder="Please provide details about your feedback..."
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={5}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="feedback-email">Your Email (for follow-up)</Label>
            <Input
              id="feedback-email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          
          <Alert>
            <AlertDescription>
              Your feedback will be sent to our team at milenkhanal@gmail.com and helps us improve the platform.
            </AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.subject || !formData.message || !formData.email}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Feedback
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}