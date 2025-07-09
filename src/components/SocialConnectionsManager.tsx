import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle } from "lucide-react";
import { useSocialConnections } from "@/hooks/useSocialConnections";
import { useState } from "react";

export function SocialConnectionsManager() {
  const { connections, isLoading, disconnectSocial } = useSocialConnections();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const handleDisconnect = async (provider: string) => {
    if (window.confirm(`Are you sure you want to disconnect your ${provider} account?`)) {
      setDisconnecting(provider);
      await disconnectSocial(provider);
      setDisconnecting(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'google':
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        );
      default:
        return <div className="h-5 w-5 rounded-full bg-primary/20"></div>;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-6">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading your connected accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Connected Accounts</h3>
      
      {connections.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              You don't have any social accounts connected to your profile.
            </p>
            <p className="text-sm text-muted-foreground">
              Connect social accounts to enable easier sign-in options.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      {getProviderIcon(connection.provider)}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{connection.provider}</p>
                      <p className="text-sm text-muted-foreground">
                        {connection.provider_email || connection.provider_username || 'Connected account'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(connection.provider)}
                    disabled={disconnecting === connection.provider}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {disconnecting === connection.provider ? (
                      <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <div className="pt-2">
        <h3 className="text-lg font-medium mb-3">Connect More Accounts</h3>
        
        <div className="grid grid-cols-1 gap-3">
          <Button 
            variant="outline" 
            className="justify-start"
            onClick={() => {
              supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/dashboard?tab=profile`,
                  queryParams: {
                    prompt: 'consent'
                  }
                }
              });
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Connect Google
          </Button>
        </div>
      </div>
      
      <Alert className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Connecting social accounts allows you to sign in using these providers. You can disconnect them at any time.
        </AlertDescription>
      </Alert>
    </div>
  );
}