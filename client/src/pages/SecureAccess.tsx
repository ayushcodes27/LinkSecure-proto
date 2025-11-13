import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Download, 
  Eye, 
  Clock, 
  AlertCircle, 
  Loader2,
  FileText,
  Image,
  Film,
  Archive
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecureFileInfo {
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiresAt: string;
  accessCount: number;
  maxAccessCount?: number;
  isActive: boolean;
  policies?: {
    passwordProtected: boolean;
    requireEmail: boolean;
    watermarkEnabled: boolean;
    allowPreview: boolean;
  };
}

const SecureAccess = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [fileInfo, setFileInfo] = useState<SecureFileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [showWatermark, setShowWatermark] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchFileInfo();
    }
  }, [token]);

  const fetchFileInfo = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/secure/${token}/info`);
      
      if (response.ok) {
        const result = await response.json();
        setFileInfo(result.data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Invalid or expired link');
      }
    } catch (error) {
      console.error('Error fetching file info:', error);
      setError('Failed to load file information');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return regex.test(value);
  };

  const handleDownload = async () => {
    if (!token) return;
    
    setDownloading(true);
    try {
      if (fileInfo?.policies?.requireEmail) {
        if (!email) {
          setEmailError('Email is required');
          setDownloading(false);
          return;
        }
        if (!validateEmail(email)) {
          setEmailError('Please enter a valid email');
          setDownloading(false);
          return;
        }
      }

      const response = await fetch(`http://localhost:5000/api/secure/${token}/download`, {
        headers: {
          ...(fileInfo?.policies?.requireEmail ? { 'x-visitor-email': email } : {}),
          ...(fileInfo?.policies?.passwordProtected && password ? { 'x-secure-password': password } : {}),
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileInfo?.fileName || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Download Started",
          description: `Downloading ${fileInfo?.fileName}`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Download failed');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Error",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleView = async () => {
    if (!token) return;
    
    try {
      if (fileInfo?.policies?.requireEmail) {
        if (!email) {
          setEmailError('Email is required');
          return;
        }
        if (!validateEmail(email)) {
          setEmailError('Please enter a valid email');
          return;
        }
      }

      const response = await fetch(`http://localhost:5000/api/secure/${token}`, {
        headers: {
          ...(fileInfo?.policies?.requireEmail ? { 'x-visitor-email': email } : {}),
          ...(fileInfo?.policies?.passwordProtected && password ? { 'x-secure-password': password } : {}),
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const wm = response.headers.get('X-LinkSecure-Watermark') === 'true';
        if (wm) {
          setViewerUrl(url);
          setShowViewer(true);
          setShowWatermark(true);
        } else {
          window.open(url, '_blank');
        }
        
        toast({
          title: "File Opened",
          description: `Viewing ${fileInfo?.fileName}`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to open file');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      toast({
        title: "View Error",
        description: error instanceof Error ? error.message : "Failed to open file",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (mimeType.includes('image')) {
      return <Image className="h-8 w-8 text-blue-500" />;
    } else if (mimeType.includes('video')) {
      return <Film className="h-8 w-8 text-purple-500" />;
    } else {
      return <Archive className="h-8 w-8 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading secure file...</p>
        </div>
      </div>
    );
  }

  if (error || !fileInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              {error || 'The secure link is invalid or has expired'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/')} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expired = isExpired(fileInfo.expiresAt);
  const canAccess = fileInfo.isActive && !expired && 
    (!fileInfo.maxAccessCount || fileInfo.accessCount < fileInfo.maxAccessCount);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary mr-3" />
            {getFileIcon(fileInfo.mimeType)}
          </div>
          <CardTitle className="text-2xl">Secure File Access</CardTitle>
          <CardDescription>
            {fileInfo.fileName}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* File Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">File Size:</span>
              <p className="text-muted-foreground">{formatFileSize(fileInfo.fileSize)}</p>
            </div>
            <div>
              <span className="font-medium">File Type:</span>
              <p className="text-muted-foreground">{fileInfo.mimeType}</p>
            </div>
            <div>
              <span className="font-medium">Access Count:</span>
              <p className="text-muted-foreground">
                {fileInfo.accessCount}
                {fileInfo.maxAccessCount && ` / ${fileInfo.maxAccessCount}`}
              </p>
            </div>
            <div>
              <span className="font-medium">Expires:</span>
              <p className="text-muted-foreground">{formatDate(fileInfo.expiresAt)}</p>
            </div>
          </div>

          {/* Access Requirements */}
          {(fileInfo.policies?.requireEmail || fileInfo.policies?.passwordProtected) && (
            <div className="grid grid-cols-2 gap-4">
              {fileInfo.policies?.requireEmail && (
                <div className="space-y-2">
                  <span className="font-medium">Email</span>
                  <input
                    className="w-full border rounded px-3 py-2 bg-background"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                  />
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                </div>
              )}
              {fileInfo.policies?.passwordProtected && (
                <div className="space-y-2">
                  <span className="font-medium">Password</span>
                  <input
                    className="w-full border rounded px-3 py-2 bg-background"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Status Badges */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant={canAccess ? "default" : "destructive"}>
              {canAccess ? "Active" : "Inactive"}
            </Badge>
            {expired && (
              <Badge variant="destructive">Expired</Badge>
            )}
            {fileInfo.maxAccessCount && fileInfo.accessCount >= fileInfo.maxAccessCount && (
              <Badge variant="destructive">Access Limit Reached</Badge>
            )}
          </div>

          {/* Time Remaining */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{getTimeRemaining(fileInfo.expiresAt)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleView}
              disabled={!canAccess}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View File
            </Button>
            <Button
              onClick={handleDownload}
              disabled={!canAccess || downloading}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300 flex items-center gap-2"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download
            </Button>
          </div>

          {!canAccess && (
            <div className="text-center text-sm text-muted-foreground">
              <p>This secure link is no longer accessible.</p>
              <p>Please contact the file owner for a new link.</p>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Inline Viewer Modal for Watermarked View */}
      {showViewer && viewerUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={() => { setShowViewer(false); setShowWatermark(false); if (viewerUrl) { URL.revokeObjectURL(viewerUrl); setViewerUrl(null); } }}>
          <div className="relative w-[90vw] h-[90vh] bg-background rounded shadow-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {fileInfo?.mimeType.includes('image') ? (
              <img src={viewerUrl} alt={fileInfo?.fileName} className="w-full h-full object-contain" />
            ) : (
              <object data={viewerUrl} type={fileInfo?.mimeType} className="w-full h-full">
                <p className="p-4 text-center">Preview not available. Please download the file.</p>
              </object>
            )}
            {showWatermark && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20 select-none" style={{ transform: 'rotate(-20deg)' }}>
                <div className="text-2xl font-bold text-white text-center whitespace-pre-wrap">
                  {(email || 'Visitor') + ' \u2022 ' + new Date().toLocaleString()}
                </div>
              </div>
            )}
            <button className="absolute top-2 right-2 bg-background border rounded px-3 py-1" onClick={() => { setShowViewer(false); setShowWatermark(false); if (viewerUrl) { URL.revokeObjectURL(viewerUrl); setViewerUrl(null); } }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureAccess;
