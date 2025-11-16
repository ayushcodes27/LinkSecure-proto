import { useState, useEffect } from "react";
import { apiUrl } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Shield, Link as LinkIcon, Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  onFileShared?: () => void;
}

export const ShareModal = ({ isOpen, onClose, fileId, fileName, onFileShared }: ShareModalProps) => {
  // State for private sharing
  const [shareEmail, setShareEmail] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<any[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  // State for public link settings
  const [expiresInHours, setExpiresInHours] = useState("");
  const [maxAccessCount, setMaxAccessCount] = useState("");
  const [password, setPassword] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  
  const { toast } = useToast();
  const token = localStorage.getItem('token');

  // Fetch shared users on mount
  useEffect(() => {
    if (isOpen && fileId) {
      fetchSharedUsers();
    }
  }, [isOpen, fileId]);

  const fetchSharedUsers = async () => {
    if (!token) return;
    setLoadingShares(true);
    try {
      const response = await fetch(apiUrl(`/api/files/${fileId}/shares`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSharedUsers(data.data?.shares || []);
      }
    } catch (error) {
      console.error('Error fetching shared users:', error);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleShareWithUser = async () => {
    const email = shareEmail.trim();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter a recipient email address",
        variant: "destructive"
      });
      return;
    }

    setIsSharing(true);
    try {
      const response = await fetch(apiUrl(`/api/files/${fileId}/share`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          sendEmail: sendEmailNotification,
          permissionLevel: 'view'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "File shared successfully",
          description: `${fileName} has been shared with ${email}`,
        });
        setShareEmail('');
        fetchSharedUsers();
        if (onFileShared) onFileShared();
      } else {
        throw new Error(data.message || 'Failed to share file');
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share file",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveAccess = async (userId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/files/${fileId}/share/${userId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast({ title: "Access removed", description: "User access has been revoked" });
        fetchSharedUsers();
      } else {
        throw new Error('Failed to remove access');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove access", variant: "destructive" });
    }
  };

  const handleGenerateLink = async () => {
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate links.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(apiUrl(`/api/files/${fileId}/generate-link`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expiresInHours: expiresInHours ? parseInt(expiresInHours) : 24,
          useShortLink: true,
          maxAccessCount: maxAccessCount ? parseInt(maxAccessCount) : undefined,
          password: password.trim() || undefined
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedLink(result.data.secureUrl);
        generateQRCode(result.data.secureUrl);
        toast({
          title: "Success",
          description: "Secure link generated successfully!",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate link');
      }
    } catch (error) {
      console.error('Error generating link:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate link",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Link copied",
        description: "Share link has been copied to your clipboard.",
      });
    }
  };

  const generateQRCode = async (url: string) => {
    try {
      const QRCode = (await import('qrcode')).default;
      const qrDataURL = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(qrDataURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadQR = () => {
    if (qrDataUrl) {
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `${fileName}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Secure Link Management
          </DialogTitle>
          <DialogDescription>
            Share or generate a secure link for {fileName}
          </DialogDescription>
        </DialogHeader>

        {/* Share with people section (always visible at top) */}
        <div className="space-y-2 py-4">
          <Label htmlFor="share-email">Share with people</Label>
          <div className="flex space-x-2">
            <Input
              type="email"
              id="share-email"
              placeholder="Add people or emails"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && shareEmail.trim()) {
                  handleShareWithUser();
                }
              }}
            />
            <Button
              onClick={handleShareWithUser}
              disabled={!shareEmail.trim() || isSharing}
            >
              {isSharing ? "Sending..." : "Send"}
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="email-notification"
              checked={sendEmailNotification}
              onCheckedChange={setSendEmailNotification}
            />
            <Label htmlFor="email-notification" className="text-sm font-normal cursor-pointer">
              Send email notification to recipient
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Only people added can access this file after logging in.
          </p>
        </div>

        <Separator className="-mt-2" />

        {/* Tabbed interface */}
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Get Link</TabsTrigger>
            <TabsTrigger value="manage">People with access</TabsTrigger>
          </TabsList>

          {/* Get Link Tab */}
          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Public Link Settings</CardTitle>
                <CardDescription>
                  Create and customize a public, shareable link for this file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedLink ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Input value={generatedLink} readOnly className="flex-1 font-mono text-sm" />
                      <Button onClick={handleCopyLink} variant="outline">
                        Copy
                      </Button>
                    </div>
                    {qrDataUrl && (
                      <div className="flex flex-col items-center space-y-2 p-4 bg-muted/50 rounded-lg">
                        <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                        <Button onClick={downloadQR} variant="outline" size="sm">
                          Download QR Code
                        </Button>
                      </div>
                    )}
                    <Button 
                      onClick={() => {
                        setGeneratedLink("");
                        setQrDataUrl(null);
                      }} 
                      variant="outline" 
                      className="w-full"
                    >
                      Generate New Link
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiresInHours">Expires In (Hours)</Label>
                        <Input
                          type="number"
                          id="expiresInHours"
                          min="1"
                          max="168"
                          placeholder="24 (default)"
                          value={expiresInHours}
                          onChange={(e) => setExpiresInHours(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty for 24 hours default. Max: 168 hours (7 days)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxAccessCount">Max Access Count (Optional)</Label>
                        <Input
                          type="number"
                          id="maxAccessCount"
                          min="1"
                          placeholder="Unlimited"
                          value={maxAccessCount}
                          onChange={(e) => setMaxAccessCount(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty for unlimited access
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password (Optional)</Label>
                      <Input
                        type="password"
                        id="password"
                        placeholder="Set a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recipients must enter this password to view/download the file.
                      </p>
                    </div>

                    <Button
                      onClick={handleGenerateLink}
                      disabled={isGenerating}
                      className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      {isGenerating ? "Generating..." : "Generate Secure Link"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* People with access Tab */}
          <TabsContent value="manage" className="space-y-6">
            {loadingShares ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading shared users...
              </div>
            ) : sharedUsers.length > 0 ? (
              <div className="space-y-2">
                {sharedUsers.map((share: any) => (
                  <div key={share.userId} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{share.userEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          {share.accessLevel || 'view'} access • Shared {new Date(share.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAccess(share.userId)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  No users have access yet. Use the section above to share with people.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
