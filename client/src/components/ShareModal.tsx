import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, Download, Calendar, Lock, Droplets, Share2, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

export const ShareModal = ({ isOpen, onClose, fileId, fileName }: ShareModalProps) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const [shareSettings, setShareSettings] = useState({
    passwordProtected: false,
    password: "",
    hasExpiration: true,
    expirationHours: "24",
    downloadLimit: false,
    maxDownloads: "10",
    watermarkEnabled: false,
    allowPreview: true,
    requireEmail: false,
    useTrackingPage: false, // Default to direct Azure link; will auto-switch when policies require it
    useShortLink: true, // Default to short LinkSecure URLs (cleaner, trackable, secure)
  });
  
  const [shareLink, setShareLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkGenerated, setLinkGenerated] = useState(false);
  const { toast } = useToast();
  const token = localStorage.getItem('token');

  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link copied",
        description: "Share link has been copied to your clipboard.",
      });
    }
  };

  const generateSecureLink = async () => {
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate secure links.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${API_URL}/api/files/${fileId}/generate-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expiresInHours: parseInt(shareSettings.expirationHours),
          maxAccessCount: shareSettings.downloadLimit ? parseInt(shareSettings.maxDownloads) : undefined,
          useTrackingPage: shareSettings.useTrackingPage,
          password: shareSettings.passwordProtected ? shareSettings.password : undefined,
          requireEmail: shareSettings.requireEmail,
          allowPreview: shareSettings.allowPreview,
          watermarkEnabled: shareSettings.watermarkEnabled
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setShareLink(result.data.secureUrl);
        setLinkGenerated(true);
        setQrDataUrl(""); // reset QR when regenerating link
        toast({
          title: "Success",
          description: "Secure Azure link generated successfully!",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate secure link');
      }
    } catch (error) {
      console.error('Error generating secure link:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate secure link",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateShortLink = async () => {
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate short links.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // First get the file details to get the blob path
      const fileResponse = await fetch(`${API_URL}/api/files/${fileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!fileResponse.ok) throw new Error('Failed to fetch file details');
      
      const fileData = await fileResponse.json();
      const blobPath = fileData.data?.blobName || fileData.data?.fileName;

      // Generate short link
      const response = await fetch(`${API_URL}/api/v1/links/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner_id: localStorage.getItem('userId') || 'anonymous',
          blob_path: blobPath,
          expiry_minutes: parseInt(shareSettings.expirationHours) * 60,
          metadata: {
            original_file_name: fileName,
            file_size: fileData.data?.fileSize || 0,
            mime_type: fileData.data?.mimeType || 'application/octet-stream'
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setShareLink(result.link);
        setLinkGenerated(true);
        setQrDataUrl("");
        toast({
          title: "Success",
          description: "Short LinkSecure URL generated successfully!",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate short link');
      }
    } catch (error) {
      console.error('Error generating short link:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate short link",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSetting = (key: string, value: any) => {
    setShareSettings(prev => ({ ...prev, [key]: value }));
  };

  const generateQRCode = async () => {
    if (!shareLink) {
      toast({ title: "Generate link first", description: "Create a share link before generating QR.", variant: "destructive" });
      return;
    }
    setQrGenerating(true);
    try {
      // Dynamic CDN import to avoid bundling dependencies
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const QRCode = (await import('https://esm.sh/qrcode@1.5.3')).default as any;
      const dataUrl = await QRCode.toDataURL(shareLink, {
        errorCorrectionLevel: 'M',
        width: 256,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setQrDataUrl(dataUrl);
      toast({ title: "QR Code generated", description: "Scan on any device to view the file." });
    } catch (e) {
      console.error(e);
      toast({ title: "QR generation failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setQrGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${fileName.replace(/\s+/g,'_')}_qr.png`;
    a.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5 text-primary" />
            <span>Share File</span>
          </DialogTitle>
          <DialogDescription>
            Configure secure sharing settings for "{fileName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Link Type Selection */}
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="short-link" className="text-base font-medium">
                    Use Short LinkSecure URL
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Generate a short, memorable link (e.g., linksecure.com/s/abc123)
                  </p>
                </div>
                <Switch
                  id="short-link"
                  checked={shareSettings.useShortLink}
                  onCheckedChange={(checked) => {
                    handleUpdateSetting('useShortLink', checked);
                    setLinkGenerated(false);
                    setShareLink("");
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Share Link */}
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">
                {shareSettings.useShortLink ? 'Short LinkSecure URL' : 'Azure Secure Link'}
              </CardTitle>
              <CardDescription>
                {shareSettings.useShortLink 
                  ? 'Generate a short, easy-to-share LinkSecure URL that redirects to your Azure file'
                  : 'Generate a secure, time-limited Azure SAS link for sharing your file'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!linkGenerated ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      {shareSettings.useShortLink
                        ? 'Click to generate a short LinkSecure URL that works on any device'
                        : 'Click to generate a secure Azure link that works on any device'}
                    </p>
                    <Button 
                      onClick={shareSettings.useShortLink ? generateShortLink : generateSecureLink}
                      disabled={isGenerating}
                      className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    >
                      {isGenerating ? (
                        <>
                          <Droplets className="h-4 w-4 mr-2 animate-spin" />
                          {shareSettings.useShortLink ? 'Generating Short Link...' : 'Generating Azure Link...'}
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4 mr-2" />
                          {shareSettings.useShortLink ? 'Generate Short Link' : 'Generate Secure Azure Link'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input value={shareLink} readOnly className="flex-1 font-mono text-sm" />
                    <Button onClick={handleCopyLink} variant="outline">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button onClick={generateQRCode} variant="outline" disabled={qrGenerating}>
                      <QrCode className={`h-4 w-4 ${qrGenerating ? 'animate-pulse' : ''}`} />
                    </Button>
                  </div>

                  {qrDataUrl && (
                    <div className="flex flex-col items-center space-y-3 pt-2">
                      <img src={qrDataUrl} alt="Share QR" className="w-48 h-48 border rounded" />
                      <Button onClick={downloadQR} size="sm">
                        <Download className="h-4 w-4 mr-2" /> Download QR
                      </Button>
                    </div>
                  )}
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-green-800">
                      <Lock className="h-4 w-4" />
                      <span className="text-sm font-medium">Azure SAS Link Generated</span>
                    </div>
                    <p className="text-green-700 text-xs mt-1">
                      This link points directly to Azure Blob Storage and works on any device without requiring your server
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Expires in {shareSettings.expirationHours} hours</span>
                    </div>
                    {shareSettings.downloadLimit && (
                      <div className="flex items-center space-x-1">
                        <Download className="h-4 w-4" />
                        <span>Max {shareSettings.maxDownloads} downloads</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Lock className="h-5 w-5 text-accent" />
                <span>Security Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Protection */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Password Protection</Label>
                  <p className="text-sm text-muted-foreground">
                    Require a password to access the file
                  </p>
                </div>
                <Switch
                  checked={shareSettings.passwordProtected}
                  onCheckedChange={(checked) => handleUpdateSetting("passwordProtected", checked)}
                />
              </div>

              {shareSettings.passwordProtected && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a secure password"
                    value={shareSettings.password}
                    onChange={(e) => handleUpdateSetting("password", e.target.value)}
                  />
                </div>
              )}

              {/* Expiration Hours */}
              <div className="space-y-2">
                <Label htmlFor="expirationHours">Link Expiration (Hours)</Label>
                <Input
                  id="expirationHours"
                  type="number"
                  min="1"
                  max="168"
                  value={shareSettings.expirationHours}
                  onChange={(e) => handleUpdateSetting("expirationHours", e.target.value)}
                  placeholder="24"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum: 1 hour, Maximum: 168 hours (7 days)
                </p>
              </div>

              {/* Download Limits */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Download Limit</Label>
                  <p className="text-sm text-muted-foreground">
                    Limit the number of downloads
                  </p>
                </div>
                <Switch
                  checked={shareSettings.downloadLimit}
                  onCheckedChange={(checked) => handleUpdateSetting("downloadLimit", checked)}
                />
              </div>

              {shareSettings.downloadLimit && (
                <div className="space-y-2">
                  <Label htmlFor="maxDownloads">Maximum Downloads</Label>
                  <Select
                    value={shareSettings.maxDownloads}
                    onValueChange={(value) => handleUpdateSetting("maxDownloads", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 download</SelectItem>
                      <SelectItem value="5">5 downloads</SelectItem>
                      <SelectItem value="10">10 downloads</SelectItem>
                      <SelectItem value="25">25 downloads</SelectItem>
                      <SelectItem value="100">100 downloads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tracking Page Option */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Use Tracking Page</Label>
                    <p className="text-sm text-muted-foreground">
                      Show a branded page with download analytics
                    </p>
                  </div>
                  <Switch
                    checked={shareSettings.useTrackingPage}
                    onCheckedChange={(checked) => handleUpdateSetting("useTrackingPage", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Azure SAS Features Info */}
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Droplets className="h-5 w-5 text-primary" />
                <span>Azure SAS Link Features</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Droplets className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-blue-900">Azure SAS Link Benefits</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Direct access to Azure Blob Storage (no server dependency)</li>
                      <li>• Works on any device (phone, tablet, laptop)</li>
                      <li>• Time-limited access with automatic expiration</li>
                      <li>• Read-only permissions for security</li>
                      <li>• No need to expose your server IP address</li>
                      <li>• Fully cloud-hosted and scalable</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Lock className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-900">Security Features</h4>
                    <ul className="text-xs text-green-800 space-y-1">
                      <li>• Only file owner can generate links</li>
                      <li>• Time-limited access (1 hour to 7 days)</li>
                      <li>• Optional download count limits</li>
                      <li>• Access tracking and logging</li>
                      <li>• Automatic link revocation on expiry</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Settings Summary */}
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Active Security Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {shareSettings.passwordProtected && (
                  <Badge variant="default" className="bg-accent">
                    <Lock className="h-3 w-3 mr-1" />
                    Password Protected
                  </Badge>
                )}
                {shareSettings.hasExpiration && (
                  <Badge variant="default" className="bg-warning">
                    <Calendar className="h-3 w-3 mr-1" />
                    Expires {shareSettings.expirationDate}
                  </Badge>
                )}
                {shareSettings.downloadLimit && (
                  <Badge variant="default" className="bg-primary">
                    <Download className="h-3 w-3 mr-1" />
                    {shareSettings.maxDownloads} downloads max
                  </Badge>
                )}
                {shareSettings.watermarkEnabled && (
                  <Badge variant="default" className="bg-destructive">
                    <Droplets className="h-3 w-3 mr-1" />
                    Watermarked
                  </Badge>
                )}
                {!shareSettings.passwordProtected && 
                 !shareSettings.hasExpiration && 
                 !shareSettings.downloadLimit && 
                 !shareSettings.watermarkEnabled && (
                  <Badge variant="secondary">No restrictions</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            onClick={async () => {
              if (shareSettings.passwordProtected && !shareSettings.password.trim()) {
                toast({ title: "Password required", description: "Enter a password to enable protection.", variant: "destructive" });
                return;
              }
              await generateSecureLink();
            }}
            disabled={isGenerating}
          >
            Update Share Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};