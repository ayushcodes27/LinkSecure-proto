import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Link, 
  Copy, 
  Clock, 
  Eye, 
  Download, 
  Shield, 
  X, 
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";
import QRCode from "qrcode";

interface SecureLink {
  linkId: string;
  secureToken: string;
  secureUrl: string;
  short_code?: string;
  status?: 'active' | 'revoked' | 'expired';
  expiresAt: string;
  maxAccessCount?: number;
  fileName: string;
  originalName: string;
  accessCount: number;
  isActive: boolean;
  createdAt: string;
}

interface SecureLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  onLinkGenerated?: () => void; // Callback to refresh parent component's secure links
}

const SecureLinkModal = ({ isOpen, onClose, fileId, fileName, onLinkGenerated }: SecureLinkModalProps) => {
  const [activeTab, setActiveTab] = useState("generate");
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [maxAccessCount, setMaxAccessCount] = useState("");
  const [generatedLink, setGeneratedLink] = useState<SecureLink | null>(null);
  const [userLinks, setUserLinks] = useState<SecureLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  // Security options
  const [password, setPassword] = useState("");
  const [requireEmail, setRequireEmail] = useState(false);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [allowPreview, setAllowPreview] = useState(true);
  const [useTrackingPage, setUseTrackingPage] = useState(false);
  // QR
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const { toast } = useToast();
  const token = localStorage.getItem('token');

  // Fetch user's secure links
  const fetchUserLinks = async () => {
    if (!token) return;
    
    setLinksLoading(true);
    try {
      const response = await fetch(apiUrl('/api/files/secure-links'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setUserLinks(result.data.links || []);
      } else if (response.status === 401) {
        // Authentication error - don't show toast, just log
        console.warn('Authentication required for secure links');
        setUserLinks([]);
      } else {
        // Other errors - show toast only if it's not a 404 (no links found)
        if (response.status !== 404) {
          throw new Error('Failed to fetch secure links');
        }
        setUserLinks([]);
      }
    } catch (error) {
      console.error('Error fetching secure links:', error);
      // Only show error toast for non-authentication errors
      if (error instanceof Error && !error.message.includes('401')) {
        toast({
          title: "Error",
          description: "Failed to load secure links",
          variant: "destructive"
        });
      }
      setUserLinks([]);
    } finally {
      setLinksLoading(false);
    }
  };

  // Generate secure link
  const generateSecureLink = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/files/${fileId}/generate-link`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expiresInHours: parseInt(expiresInHours),
          maxAccessCount: maxAccessCount ? parseInt(maxAccessCount) : undefined,
          password: password || undefined,
          requireEmail,
          watermarkEnabled,
          allowPreview,
          useTrackingPage: useTrackingPage || requireEmail || !!password || watermarkEnabled || !allowPreview
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedLink(result.data);
        toast({
          title: "Success",
          description: "Secure link generated successfully",
        });
        // Refresh user links in modal
        fetchUserLinks();
        // Notify parent component to refresh its secure links list
        if (onLinkGenerated) {
          onLinkGenerated();
        }
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Failed to generate secure link';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error generating secure link:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate secure link";
      
      // Don't show error toast for authentication issues
      if (!errorMessage.includes('401') && !errorMessage.includes('Unauthorized')) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive"
      });
    }
  };

  // Revoke secure link
  const revokeSecureLink = async (linkId: string, shortCode?: string) => {
    if (!token) return;
    
    try {
      // Try new endpoint first if short_code is available
      if (shortCode) {
        const response = await fetch(apiUrl(`/api/links/${shortCode}/revoke`), {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          toast({
            title: "Success",
            description: "Secure link revoked successfully",
          });
          // Refresh user links in modal
          fetchUserLinks();
          // Notify parent component to refresh its secure links list
          if (onLinkGenerated) {
            onLinkGenerated();
          }
          return;
        }
      }
      
      // Fallback to old endpoint for backward compatibility
      const response = await fetch(apiUrl(`/api/files/secure-links/${linkId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Secure link revoked successfully",
        });
        // Refresh user links in modal
        fetchUserLinks();
        // Notify parent component to refresh its secure links list
        if (onLinkGenerated) {
          onLinkGenerated();
        }
      } else {
        throw new Error('Failed to revoke secure link');
      }
    } catch (error) {
      console.error('Error revoking secure link:', error);
      toast({
        title: "Error",
        description: "Failed to revoke secure link",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserLinks();
    }
  }, [isOpen]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const isExpired = (expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
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
            Generate and manage secure links for {fileName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Link</TabsTrigger>
            <TabsTrigger value="manage">Manage Links</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate New Secure Link</CardTitle>
                <CardDescription>
                  Create a time-limited secure link for sharing this file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiresInHours">Expires In (Hours)</Label>
                    <Input
                      id="expiresInHours"
                      type="number"
                      min="1"
                      max="168"
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(e.target.value)}
                      placeholder="24"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum: 1 hour, Maximum: 168 hours (7 days)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAccessCount">Max Access Count (Optional)</Label>
                    <Input
                      id="maxAccessCount"
                      type="number"
                      min="1"
                      value={maxAccessCount}
                      onChange={(e) => setMaxAccessCount(e.target.value)}
                      placeholder="Unlimited"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for unlimited access
                    </p>
                  </div>
                </div>

                {/* Security Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password (Optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Set a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Recipients must enter this to view/download.</p>
                  </div>
                  <div className="space-y-3">
                    <Label>Access Policies</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Require Email</div>
                          <div className="text-xs text-muted-foreground">Ask visitors to provide a valid email.</div>
                        </div>
                        <Switch checked={requireEmail} onCheckedChange={setRequireEmail} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Watermark</div>
                          <div className="text-xs text-muted-foreground">Overlay email + timestamp on previews.</div>
                        </div>
                        <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Allow Preview</div>
                          <div className="text-xs text-muted-foreground">Disable to force direct download only.</div>
                        </div>
                        <Switch checked={allowPreview} onCheckedChange={setAllowPreview} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Use Tracking Page</div>
                          <div className="text-xs text-muted-foreground">Show branded page and analytics.</div>
                        </div>
                        <Switch checked={useTrackingPage} onCheckedChange={setUseTrackingPage} />
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={generateSecureLink}
                  disabled={loading}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Link...
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Generate Secure Link
                    </>
                  )}
                </Button>

                {generatedLink && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-800 flex items-center gap-2">
                        <Check className="h-5 w-5" />
                        Link Generated Successfully
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Secure Link</Label>
                        <div className="flex gap-2">
                          <Input
                            value={generatedLink.secureUrl}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(generatedLink.secureUrl)}
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Expires:</span>
                          <p className="text-muted-foreground">{formatDate(generatedLink.expiresAt)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Max Access:</span>
                          <p className="text-muted-foreground">
                            {generatedLink.maxAccessCount || "Unlimited"}
                          </p>
                        </div>
                      </div>
                      {/* Policy Summary (from form selections) */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {password && <Badge variant="outline">Password</Badge>}
                        {requireEmail && <Badge variant="outline">Email Required</Badge>}
                        {watermarkEnabled && <Badge variant="outline">Watermark</Badge>}
                        {!allowPreview && <Badge variant="outline">No Preview</Badge>}
                        {useTrackingPage && <Badge variant="outline">Tracking Page</Badge>}
                      </div>
                      {/* QR Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!generatedLink?.secureUrl) return;
                            setQrGenerating(true);
                            try {
                              const dataUrl = await QRCode.toDataURL(generatedLink.secureUrl, { errorCorrectionLevel: 'M', width: 256, margin: 1 });
                              setQrDataUrl(dataUrl);
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setQrGenerating(false);
                            }
                          }}
                          disabled={qrGenerating}
                        >
                          {qrGenerating ? 'Generating QR…' : 'Generate QR'}
                        </Button>
                        {qrDataUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = qrDataUrl;
                              a.download = `${fileName.replace(/\s+/g,'_')}_qr.png`;
                              a.click();
                            }}
                          >
                            Download QR
                          </Button>
                        )}
                      </div>
                      {qrDataUrl && (
                        <div className="pt-2">
                          <img src={qrDataUrl} alt="Secure Link QR" className="w-40 h-40 border rounded" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Secure Links</CardTitle>
                    <CardDescription>
                      Manage all your active and expired secure links
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchUserLinks}
                    disabled={linksLoading}
                  >
                    {linksLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {linksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading links...</span>
                  </div>
                ) : userLinks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No secure links found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userLinks.map((link) => (
                      <div
                        key={link.linkId}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{link.originalName}</span>
                            <Badge variant={
                              link.status === 'revoked' ? "destructive" :
                              link.status === 'expired' || isExpired(link.expiresAt) ? "secondary" :
                              link.isActive ? "default" : "secondary"
                            }>
                              {link.status === 'revoked' ? 'Revoked' :
                               link.status === 'expired' || isExpired(link.expiresAt) ? 'Expired' :
                               link.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {getTimeRemaining(link.expiresAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {link.accessCount} views
                            </div>
                            {link.maxAccessCount && (
                              <div className="flex items-center gap-1">
                                <Shield className="h-4 w-4" />
                                Max: {link.maxAccessCount}
                              </div>
                            )}
                            {/* Policy hints */}
                            {password && <Badge variant="outline">Password</Badge>}
                            {requireEmail && <Badge variant="outline">Email</Badge>}
                            {watermarkEnabled && <Badge variant="outline">Watermark</Badge>}
                            {!allowPreview && <Badge variant="outline">No Preview</Badge>}
                          </div>
                          
                          <div className="flex gap-2">
                            <Input
                              value={link.secureUrl}
                              readOnly
                              className="font-mono text-xs flex-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(link.secureUrl)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeSecureLink(link.linkId, link.short_code)}
                            disabled={link.status === 'revoked' || !link.isActive || isExpired(link.expiresAt)}
                            className="text-destructive hover:text-destructive"
                            title={link.status === 'revoked' ? 'Already revoked' : 'Revoke link'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SecureLinkModal;
