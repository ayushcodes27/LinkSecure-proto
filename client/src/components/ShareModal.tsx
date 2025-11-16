import { useState, useEffect } from "react";
import { apiUrl } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Copy, Eye, Download, Calendar, Lock, Droplets, Share2, QrCode, Settings, Mail, X, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

export const ShareModal = ({ isOpen, onClose, fileId, fileName }: ShareModalProps) => {
  // State for private sharing
  const [shareEmail, setShareEmail] = useState("");
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<any[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  // State for public link
  const [shareLink, setShareLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [linkGenerated, setLinkGenerated] = useState(false);
  
  // Link settings (collapsed in settings panel)
  const [linkSettings, setLinkSettings] = useState({
    passwordProtected: false,
    password: "",
    expirationHours: "24",
    downloadLimit: false,
    maxDownloads: "10",
    watermarkEnabled: false,
    previewMode: "preview", // "preview" or "download"
    requireEmail: false,
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  
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
        setSharedUsers(data.shares || []);
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
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "File shared successfully",
          description: `${fileName} has been shared with ${email}`,
        });
        setShareEmail('');
        fetchSharedUsers(); // Refresh the list
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

    // Validate password if enabled
    if (linkSettings.passwordProtected && !linkSettings.password.trim()) {
      toast({
        title: "Password required",
        description: "Please enter a password or disable password protection.",
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
          expiresInHours: parseInt(linkSettings.expirationHours),
          useShortLink: true, // Always use short links for cleaner URLs
          maxAccessCount: linkSettings.downloadLimit ? parseInt(linkSettings.maxDownloads) : undefined,
          password: linkSettings.passwordProtected ? linkSettings.password : undefined,
          requireEmail: linkSettings.requireEmail,
          allowPreview: linkSettings.previewMode === "preview",
          watermarkEnabled: linkSettings.watermarkEnabled
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setShareLink(result.data.secureUrl);
        setLinkGenerated(true);
        setQrDataUrl("");
        toast({
          title: "Success",
          description: "Link generated successfully!",
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
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast({
        title: "Link copied",
        description: "Share link has been copied to your clipboard.",
      });
    }
  };

  const handleUpdateLinkSetting = (key: string, value: any) => {
    setLinkSettings(prev => ({ ...prev, [key]: value }));
    // Reset generated link when settings change
    if (linkGenerated) {
      setLinkGenerated(false);
      setShareLink("");
    }
  };

  const generateQRCode = async () => {
    if (!shareLink) {
      toast({ title: "Generate link first", description: "Create a share link before generating QR.", variant: "destructive" });
      return;
    }
    setQrGenerating(true);
    try {
      // @ts-ignore
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
            <span>Share "{fileName}"</span>
          </DialogTitle>
          <DialogDescription>
            Share with specific people or get a link anyone can access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* SECTION 1: Share with people (Private Share - Google Drive Style) */}
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Share with people
              </CardTitle>
              <CardDescription>
                Give specific people access to this file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email input with send button */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && shareEmail.trim()) {
                      handleShareWithUser();
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  onClick={handleShareWithUser}
                  disabled={!shareEmail.trim() || isSharing}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSharing ? "Sending..." : "Send"}
                </Button>
              </div>

              {/* Email notification toggle */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Notify user via email</span>
                </div>
                <Switch
                  checked={sendEmailNotification}
                  onCheckedChange={setSendEmailNotification}
                />
              </div>

              {/* List of people who have access */}
              {loadingShares ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Loading shared users...
                </div>
              ) : sharedUsers.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">People with access</Label>
                  <div className="space-y-2">
                    {sharedUsers.map((share: any) => (
                      <div key={share.userId} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {share.userEmail?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{share.userEmail}</p>
                            <p className="text-xs text-muted-foreground">
                              {share.accessLevel || 'view'} access
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
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/20">
                  No users have access yet. Enter an email above to share.
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* SECTION 2: Get link (Public Link Share) */}
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Get link
              </CardTitle>
              <CardDescription>
                Anyone with the link can access this file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Link display or generation button */}
              {!linkGenerated ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a secure link to share this file with anyone
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={handleGenerateLink}
                      disabled={isGenerating}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isGenerating ? (
                        <>
                          <Droplets className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4 mr-2" />
                          Generate Link
                        </>
                      )}
                    </Button>
                    <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Link Settings</h4>
                            <p className="text-xs text-muted-foreground">
                              Configure security and access options
                            </p>
                          </div>

                          <Separator />

                          {/* Password Protection */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="password-toggle" className="text-sm">Password Protection</Label>
                              <Switch
                                id="password-toggle"
                                checked={linkSettings.passwordProtected}
                                onCheckedChange={(checked) => handleUpdateLinkSetting("passwordProtected", checked)}
                              />
                            </div>
                            {linkSettings.passwordProtected && (
                              <Input
                                type="password"
                                placeholder="Enter password"
                                value={linkSettings.password}
                                onChange={(e) => handleUpdateLinkSetting("password", e.target.value)}
                              />
                            )}
                          </div>

                          <Separator />

                          {/* Expiration */}
                          <div className="space-y-2">
                            <Label htmlFor="expiration" className="text-sm">Link Expiration (Hours)</Label>
                            <Input
                              id="expiration"
                              type="number"
                              min="1"
                              max="168"
                              value={linkSettings.expirationHours}
                              onChange={(e) => handleUpdateLinkSetting("expirationHours", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">1-168 hours (7 days max)</p>
                          </div>

                          <Separator />

                          {/* Download Limit */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="download-limit-toggle" className="text-sm">Download Limit</Label>
                              <Switch
                                id="download-limit-toggle"
                                checked={linkSettings.downloadLimit}
                                onCheckedChange={(checked) => handleUpdateLinkSetting("downloadLimit", checked)}
                              />
                            </div>
                            {linkSettings.downloadLimit && (
                              <Select
                                value={linkSettings.maxDownloads}
                                onValueChange={(value) => handleUpdateLinkSetting("maxDownloads", value)}
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
                            )}
                          </div>

                          <Separator />

                          {/* Preview Mode Radio Group */}
                          <div className="space-y-3">
                            <Label className="text-sm">Access Mode</Label>
                            <RadioGroup
                              value={linkSettings.previewMode}
                              onValueChange={(value) => handleUpdateLinkSetting("previewMode", value)}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="preview" id="preview" />
                                <Label htmlFor="preview" className="text-sm font-normal">
                                  Preview in browser
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="download" id="download" />
                                <Label htmlFor="download" className="text-sm font-normal">
                                  Force download
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>

                          <Separator />

                          {/* Watermark */}
                          <div className="flex items-center justify-between">
                            <Label htmlFor="watermark-toggle" className="text-sm">Watermark</Label>
                            <Switch
                              id="watermark-toggle"
                              checked={linkSettings.watermarkEnabled}
                              onCheckedChange={(checked) => handleUpdateLinkSetting("watermarkEnabled", checked)}
                            />
                          </div>

                          {/* Require Email */}
                          <div className="flex items-center justify-between">
                            <Label htmlFor="email-toggle" className="text-sm">Require Email</Label>
                            <Switch
                              id="email-toggle"
                              checked={linkSettings.requireEmail}
                              onCheckedChange={(checked) => handleUpdateLinkSetting("requireEmail", checked)}
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
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
                    <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm">Link Settings</h4>
                            <p className="text-xs text-muted-foreground">
                              Regenerate link to apply new settings
                            </p>
                          </div>

                          <Separator />

                          {/* Same settings as above */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="password-toggle-2" className="text-sm">Password Protection</Label>
                              <Switch
                                id="password-toggle-2"
                                checked={linkSettings.passwordProtected}
                                onCheckedChange={(checked) => handleUpdateLinkSetting("passwordProtected", checked)}
                              />
                            </div>
                            {linkSettings.passwordProtected && (
                              <Input
                                type="password"
                                placeholder="Enter password"
                                value={linkSettings.password}
                                onChange={(e) => handleUpdateLinkSetting("password", e.target.value)}
                              />
                            )}
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <Label htmlFor="expiration-2" className="text-sm">Link Expiration (Hours)</Label>
                            <Input
                              id="expiration-2"
                              type="number"
                              min="1"
                              max="168"
                              value={linkSettings.expirationHours}
                              onChange={(e) => handleUpdateLinkSetting("expirationHours", e.target.value)}
                            />
                          </div>

                          <Separator />

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="download-limit-toggle-2" className="text-sm">Download Limit</Label>
                              <Switch
                                id="download-limit-toggle-2"
                                checked={linkSettings.downloadLimit}
                                onCheckedChange={(checked) => handleUpdateLinkSetting("downloadLimit", checked)}
                              />
                            </div>
                            {linkSettings.downloadLimit && (
                              <Select
                                value={linkSettings.maxDownloads}
                                onValueChange={(value) => handleUpdateLinkSetting("maxDownloads", value)}
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
                            )}
                          </div>

                          <Separator />

                          <div className="space-y-3">
                            <Label className="text-sm">Access Mode</Label>
                            <RadioGroup
                              value={linkSettings.previewMode}
                              onValueChange={(value) => handleUpdateLinkSetting("previewMode", value)}
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="preview" id="preview-2" />
                                <Label htmlFor="preview-2" className="text-sm font-normal">
                                  Preview in browser
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="download" id="download-2" />
                                <Label htmlFor="download-2" className="text-sm font-normal">
                                  Force download
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>

                          <Separator />

                          <div className="flex items-center justify-between">
                            <Label htmlFor="watermark-toggle-2" className="text-sm">Watermark</Label>
                            <Switch
                              id="watermark-toggle-2"
                              checked={linkSettings.watermarkEnabled}
                              onCheckedChange={(checked) => handleUpdateLinkSetting("watermarkEnabled", checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="email-toggle-2" className="text-sm">Require Email</Label>
                            <Switch
                              id="email-toggle-2"
                              checked={linkSettings.requireEmail}
                              onCheckedChange={(checked) => handleUpdateLinkSetting("requireEmail", checked)}
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {qrDataUrl && (
                    <div className="flex flex-col items-center space-y-3">
                      <img src={qrDataUrl} alt="Share QR" className="w-48 h-48 border rounded" />
                      <Button onClick={downloadQR} size="sm">
                        <Download className="h-4 w-4 mr-2" /> Download QR
                      </Button>
                    </div>
                  )}

                  {/* Active settings summary */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <Calendar className="h-3 w-3 mr-1" />
                      {linkSettings.expirationHours}h
                    </Badge>
                    {linkSettings.passwordProtected && (
                      <Badge variant="secondary">
                        <Lock className="h-3 w-3 mr-1" />
                        Protected
                      </Badge>
                    )}
                    {linkSettings.downloadLimit && (
                      <Badge variant="secondary">
                        <Download className="h-3 w-3 mr-1" />
                        {linkSettings.maxDownloads} max
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {linkSettings.previewMode === "preview" ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
