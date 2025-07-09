import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Code } from "@/components/ui/code";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function OAuthDebugger() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [oauthSettings, setOAuthSettings] = useState<any>(null);
  const [socialConnections, setSocialConnections] = useState<any>(null);
  const [oauthLogs, setOAuthLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchOAuthSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('debug_oauth_config');
      
      if (error) throw error;
      
      setOAuthSettings(data);
      toast({
        title: "Success",
        description: "Successfully fetched OAuth settings",
      });
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
      toast({
        title: "Success",
        description: "Successfully fetched social connections",
      });
    } catch (error) {
      console.error('Error fetching social connections:', error);
      setError((error as Error).message);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to fetch social connections",
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "Successfully fetched OAuth logs",
      });
    } catch (error) {
      console.error('Error fetching OAuth logs:', error);
      setError((error as Error).message);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to fetch OAuth logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOAuthSettings();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>OAuth Debugger</CardTitle>
        <CardDescription>
          Debug your OAuth configuration and social connections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="settings">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <h3 className="text-lg font-medium">OAuth Settings</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchOAuthSettings}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </div>
              
              {oauthSettings && (
                <div className="p-4 bg-muted rounded-md overflow-auto max-h-40">
                  <pre className="text-xs">{JSON.stringify(oauthSettings, null, 2)}</pre>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Debug Information</h3>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Environment Variables:</p>
                <Code className="text-xs">
                  VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? "✓ Set" : "✗ Not set"}<br />
                  VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? "✓ Set" : "✗ Not set"}
                </Code>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Current URL:</p>
                <Code className="text-xs break-all">
                  {window.location.href}
                </Code>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Redirect URL:</p>
                <Code className="text-xs break-all">
                  {`${window.location.origin}/dashboard`}
                </Code>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="connections" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <h3 className="text-lg font-medium">Social Connections</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchSocialConnections}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </div>
              
              {socialConnections && (
                <div className="p-4 bg-muted rounded-md overflow-auto max-h-40">
                  <pre className="text-xs">{JSON.stringify(socialConnections, null, 2)}</pre>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <h3 className="text-lg font-medium">OAuth Logs</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchOAuthLogs}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </div>
              
              {oauthLogs.length > 0 ? (
                <div className="p-4 bg-muted rounded-md overflow-auto max-h-60">
                  <pre className="text-xs">{JSON.stringify(oauthLogs, null, 2)}</pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No OAuth logs found. Try logging in with Google first.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator />
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Test Google Login</h3>
          <p className="text-sm text-muted-foreground">
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
            <AlertDescription>
              Error: {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}