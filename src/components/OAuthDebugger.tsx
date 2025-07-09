import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Code } from "@/components/ui/code";

export function OAuthDebugger() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [oauthSettings, setOAuthSettings] = useState<any>(null);
  const [socialConnections, setSocialConnections] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOAuthSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('get_oauth_settings');
      
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
      const { data, error } = await supabase.rpc('get_social_connections');
      
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

  const testGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            prompt: 'consent',
            access_type: 'offline'
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Redirecting",
        description: "You will be redirected to Google for authentication",
      });
    } catch (error) {
      console.error('Error initiating Google login:', error);
      setError((error as Error).message);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to initiate Google login",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OAuth Debugger</CardTitle>
        <CardDescription>
          Debug your OAuth configuration and social connections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <h3 className="text-lg font-medium">OAuth Settings</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchOAuthSettings}
              disabled={loading}
            >
              Fetch Settings
            </Button>
          </div>
          
          {oauthSettings && (
            <div className="p-4 bg-muted rounded-md overflow-auto max-h-40">
              <pre className="text-xs">{JSON.stringify(oauthSettings, null, 2)}</pre>
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <h3 className="text-lg font-medium">Social Connections</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSocialConnections}
              disabled={loading}
            >
              Fetch Connections
            </Button>
          </div>
          
          {socialConnections && (
            <div className="p-4 bg-muted rounded-md overflow-auto max-h-40">
              <pre className="text-xs">{JSON.stringify(socialConnections, null, 2)}</pre>
            </div>
          )}
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Test Google Login</h3>
          <p className="text-sm text-muted-foreground">
            This will initiate a Google login flow to test your configuration.
          </p>
          
          <Button 
            onClick={testGoogleLogin}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Loading..." : "Test Google Login"}
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Error: {error}
            </AlertDescription>
          </Alert>
        )}
        
        <Separator />
        
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
      </CardContent>
    </Card>
  );
}