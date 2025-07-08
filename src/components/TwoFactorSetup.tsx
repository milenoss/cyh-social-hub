import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, Copy, Check, AlertTriangle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

interface TwoFactorSetupProps {
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function TwoFactorSetup({ userId, onComplete, onCancel }: TwoFactorSetupProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("setup");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, this would call your backend to generate a secret
    const generateSecret = async () => {
      try {
        setIsLoading(true);
        
        // Simulate API call to generate secret
        // In production, this would be a call to your Supabase Edge Function
        setTimeout(() => {
          // Example secret - in production this would come from the server
          const mockSecret = "JBSWY3DPEHPK3PXP";
          setSecretKey(mockSecret);
          
          // Generate QR code
          const otpAuthUrl = `otpauth://totp/ChooseYourHard:user?secret=${mockSecret}&issuer=ChooseYourHard`;
          QRCode.toDataURL(otpAuthUrl, (err, url) => {
            if (err) {
              console.error("Error generating QR code:", err);
              return;
            }
            setQrCodeUrl(url);
            setIsLoading(false);
          });
        }, 1500);
      } catch (error) {
        console.error("Error generating 2FA secret:", error);
        toast({
          title: "Error",
          description: "Failed to generate 2FA secret. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    generateSecret();
  }, [toast]);

  const handleCopySecret = () => {
    if (secretKey) {
      navigator.clipboard.writeText(secretKey);
      setIsCopied(true);
      toast({
        title: "Secret copied",
        description: "The secret key has been copied to your clipboard.",
      });
      
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Simulate verification API call
      // In production, this would verify the code against the secret
      setTimeout(() => {
        // For demo purposes, any 6-digit code is accepted
        if (verificationCode.length === 6 && /^\d+$/.test(verificationCode)) {
          toast({
            title: "2FA Enabled",
            description: "Two-factor authentication has been successfully enabled for your account.",
          });
          onComplete();
        } else {
          toast({
            title: "Invalid code",
            description: "The verification code is incorrect. Please try again.",
            variant: "destructive",
          });
        }
        setIsVerifying(false);
      }, 1500);
    } catch (error) {
      console.error("Error verifying 2FA code:", error);
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive",
      });
      setIsVerifying(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Enhance your account security with two-factor authentication
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="verify">Verify</TabsTrigger>
          </TabsList>
          
          <TabsContent value="setup" className="space-y-4 pt-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Generating your secure key...</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-medium">1. Scan QR Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  
                  <div className="flex justify-center p-4 bg-muted/50 rounded-lg">
                    {qrCodeUrl && (
                      <img 
                        src={qrCodeUrl} 
                        alt="2FA QR Code" 
                        className="w-48 h-48"
                      />
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">2. Or Enter Secret Key</h3>
                  <p className="text-sm text-muted-foreground">
                    If you can't scan the QR code, enter this secret key manually in your app:
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 p-2 bg-muted font-mono text-sm rounded-md">
                      {secretKey}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopySecret}
                      className="shrink-0"
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Keep this secret key safe. You'll need it if you lose access to your authenticator app.
                  </AlertDescription>
                </Alert>
                
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button onClick={() => setActiveTab("verify")}>
                    Continue
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="verify" className="space-y-4 pt-4">
            <div className="space-y-2">
              <h3 className="font-medium">Verify Setup</h3>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to verify the setup
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>
            </div>
            
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                After enabling 2FA, you'll need to enter a verification code each time you sign in.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setActiveTab("setup")}>
                Back
              </Button>
              <Button 
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || isVerifying}
              >
                {isVerifying ? "Verifying..." : "Enable 2FA"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}