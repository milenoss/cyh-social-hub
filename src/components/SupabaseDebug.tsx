import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SupabaseDebug() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setConnectionStatus('unknown');
    setErrorMessage(null);
    
    try {
      // Try to fetch a simple query to test the connection
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) throw error;
      
      setConnectionStatus('success');
      toast({
        title: "Connection Successful",
        description: "Successfully connected to Supabase",
      });
    } catch (error) {
      console.error('Supabase connection error:', error);
      setConnectionStatus('error');
      setErrorMessage((error as Error).message);
      toast({
        title: "Connection Error",
        description: (error as Error).message || "Failed to connect to Supabase",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supabase Connection Debug</CardTitle>
        <CardDescription>
          Test your connection to Supabase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm">
            <strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL ? 
              `${import.meta.env.VITE_SUPABASE_URL.substring(0, 15)}...` : 
              "Not set"}
          </p>
          <p className="text-sm">
            <strong>Anon Key:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? 
              `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 15)}...` : 
              "Not set"}
          </p>
        </div>
        
        {connectionStatus === 'success' && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Successfully connected to Supabase!
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'error' && (
          <Alert variant="destructive">
            <AlertDescription>
              Connection failed: {errorMessage}
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={testConnection}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Testing Connection..." : "Test Supabase Connection"}
        </Button>
      </CardContent>
    </Card>
  );
}