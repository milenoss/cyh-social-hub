import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { RefreshCw, AlertTriangle } from "lucide-react";

export function OAuthDebugger() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  const [oauthSettings, setOAuthSettings] = useState<any>(null);
  const [socialConnections, setSocialConnections] = useState<any>(null);
  const [oauthLogs, setOAuthLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchOAuthSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('debug_oauth_settings');
      
      if (error) throw error;
      
      setOAuthSettings(data);
    } catch (error) {
      console.error('Error fetching OAuth settings:', error);
      setError((error as Error).message);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to fetch OAuth settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSocialConnections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('social_connections')
        .select('*');
      
      if (error) throw error;
      
      setSocialConnections(data);
    } catch (error) {
      console.error('Error fetching social connections:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOAuthLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('oauth_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      setOAuthLogs(data || []);
    } catch (error) {
      console.error('Error fetching OAuth logs:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data based on active tab
    if (activeTab === "settings") {
      fetchOAuthSettings();
    } else if (activeTab === "connections") {
      fetchSocialConnections();
    } else if (activeTab === "logs") {
      fetchOAuthLogs();
    }
  }, [activeTab]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-4 pt-4">
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchOAuthSettings}
                disabled={loading}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            
            <div className="p-4 bg-muted rounded-md overflow-auto max-h-40">
              <pre className="text-xs">
                {oauthSettings ? JSON.stringify(oauthSettings, null, 2) : "Loading..."}
              </pre>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Environment Information</h3>
              <div className="p-4 bg-muted rounded-md">
                <pre className="text-xs">
{`VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? "✓ Set" : "✗ Not set"}
VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Not set"}
Current URL: ${window.location.href}
Redirect URL: ${window.location.origin}/dashboard
User Agent: ${navigator.userAgent}`}
                </pre>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="connections" className="space-y-4 pt-4">
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchSocialConnections}
                disabled={loading}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            
            <div className="p-4 bg-muted rounded-md overflow-auto max-h-40">
              <pre className="text-xs">
                {socialConnections ? JSON.stringify(socialConnections, null, 2) : "Loading..."}
              </pre>
            </div>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4 pt-4">
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchOAuthLogs}
                disabled={loading}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            
            <div className="p-4 bg-muted rounded-md overflow-auto max-h-60">
              <pre className="text-xs">
                {oauthLogs.length > 0 ? JSON.stringify(oauthLogs, null, 2) : "No logs found"}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator />
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Test Google Login</h3>
          <p className="text-xs text-muted-foreground">
            This will initiate a Google login flow to test your configuration.
          </p>
          
          <GoogleLoginButton 
            redirectTo={`${window.location.origin}/dashboard`}
            fullWidth
            onError={(error) => {
              setError(error.message);
            }}
          />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}