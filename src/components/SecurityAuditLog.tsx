import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  User,
  LogIn,
  LogOut,
  Key,
  Smartphone,
  Trash2,
  Github,
  Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SecurityEvent {
  id: string;
  event_type: string;
  event_data: any;
  ip_address: string;
  created_at: string;
}

export function SecurityAuditLog() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const limit = 10;

  const fetchSecurityLogs = async (pageNumber = 0, append = false) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_security_audit_logs', {
        limit_count: limit,
        offset_count: pageNumber * limit
      });

      if (error) throw error;

      if (data && data.success) {
        if (append) {
          setEvents(prev => [...prev, ...data.logs]);
        } else {
          setEvents(data.logs || []);
        }
        
        setHasMore(data.logs.length === limit);
      }
    } catch (error: any) {
      console.error('Error fetching security logs:', error);
      toast({
        title: "Error",
        description: "Failed to load security logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSecurityLogs(nextPage, true);
  };

  useEffect(() => {
    fetchSecurityLogs();
  }, [user]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login':
      case 'login_success':
        return <LogIn className="h-4 w-4 text-green-600" />;
      case 'login_failed':
        return <LogIn className="h-4 w-4 text-red-600" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-blue-600" />;
      case 'password_reset':
      case 'password_changed':
        return <Key className="h-4 w-4 text-amber-600" />;
      case 'two_factor_enabled':
      case 'two_factor_disabled':
        return <Smartphone className="h-4 w-4 text-purple-600" />;
      case 'account_created':
        return <User className="h-4 w-4 text-green-600" />;
      case 'account_deletion_requested':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'account_deletion_cancelled':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'social_account_connected':
      case 'social_account_disconnected':
        return <Github className="h-4 w-4 text-gray-600" />;
      case 'email_verification_success':
        return <Mail className="h-4 w-4 text-green-600" />;
      case 'email_verification_failed':
        return <Mail className="h-4 w-4 text-red-600" />;
      default:
        return <Shield className="h-4 w-4 text-primary" />;
    }
  };

  const getEventTitle = (event: SecurityEvent) => {
    const type = event.event_type;
    
    switch (type) {
      case 'login':
      case 'login_success':
        return 'Successful login';
      case 'login_failed':
        return 'Failed login attempt';
      case 'logout':
        return 'Logged out';
      case 'password_reset':
        return 'Password reset requested';
      case 'password_changed':
        return 'Password changed';
      case 'two_factor_enabled':
        return 'Two-factor authentication enabled';
      case 'two_factor_disabled':
        return 'Two-factor authentication disabled';
      case 'account_created':
        return 'Account created';
      case 'account_deletion_requested':
        return 'Account deletion requested';
      case 'account_deletion_cancelled':
        return 'Account deletion cancelled';
      case 'social_account_connected':
        return `${event.event_data?.provider || 'Social'} account connected`;
      case 'social_account_disconnected':
        return `${event.event_data?.provider || 'Social'} account disconnected`;
      case 'email_verification_success':
        return 'Email verified';
      case 'email_verification_failed':
        return 'Email verification failed';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getEventSeverity = (eventType: string) => {
    if (eventType.includes('failed') || eventType.includes('deletion_requested')) {
      return 'destructive';
    }
    if (eventType.includes('enabled') || eventType.includes('success') || eventType.includes('created')) {
      return 'success';
    }
    if (eventType.includes('disabled') || eventType.includes('reset')) {
      return 'warning';
    }
    return 'default';
  };

  if (loading && events.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading security activity...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Security Activity Log
        </CardTitle>
        <CardDescription>
          Recent security-related activity on your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-6">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Security Activity</h3>
            <p className="text-muted-foreground">
              Your security activity log is empty. Recent security events will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="mt-1">
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {getEventTitle(event)}
                      </p>
                      <Badge variant={getEventSeverity(event.event_type) as any} className="text-xs">
                        {event.event_type.includes('failed') ? 'Alert' : 
                         event.event_type.includes('enabled') ? 'Security Change' : 'Info'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {event.ip_address && (
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        IP: {event.ip_address}
                      </span>
                    )}
                    {event.event_data?.provider && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Provider: {event.event_data.provider}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="text-center pt-2">
                <Button 
                  variant="outline" 
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}