import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordPromptModal } from "@/components/PasswordPromptModal";
import { 
  Shield, 
  Download, 
  Loader2,
  Lock,
  AlertCircle,
  FileText,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

const ShortLinkAccess = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const contentUrl = `${backendUrl}/api/links/${shortCode}/content`;

  useEffect(() => {
    attemptAccess();
  }, [shortCode]);

  const attemptAccess = async () => {
    if (!shortCode) return;
    
    setLoading(true);
    setError(null);

    try {
      // Check file access status (use a special query param to avoid downloading)
      const checkUrl = `${contentUrl}?check=true`;
      const response = await fetch(checkUrl, {
        method: 'GET',
      });

      if (response.ok) {
        // Public file, no password needed - get file info from headers
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'File';
        setFileName(filename);
        
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          const sizeInMB = (parseInt(contentLength) / (1024 * 1024)).toFixed(2);
          setFileSize(`${sizeInMB} MB`);
        }
        
        setLoading(false);
        return;
      }

      if (response.status === 401) {
        // Password required - read JSON response
        try {
          const data = await response.json();
          setRequiresPassword(true);
          setFileName(data.fileName || 'Protected File');
          setLoading(false);
          return;
        } catch (e) {
          // Fallback if JSON parsing fails
          setRequiresPassword(true);
          setFileName('Protected File');
          setLoading(false);
          return;
        }
      }

      if (response.status === 404) {
        setError('File not found or link has expired');
        setLoading(false);
      } else if (response.status === 410) {
        const data = await response.json().catch(() => ({}));
        setError(data.message || 'This link has been revoked or has expired');
        setLoading(false);
      } else {
        setError('Failed to access file');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error accessing file:', err);
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!shortCode) return;
    
    setPasswordError("");

    try {
      // Verify password and get JWT token
      const verifyResponse = await fetch(apiUrl(`/api/v1/links/verify/${shortCode}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json();
        throw new Error(data.message || 'Invalid password');
      }

      const verifyData = await verifyResponse.json();
      const token = verifyData.downloadToken;
      
      setDownloadToken(token);
      setRequiresPassword(false);
      
      // Fetch file info with token using check parameter
      const infoResponse = await fetch(`${contentUrl}?token=${token}&check=true`, {
        method: 'GET',
      });
      
      if (infoResponse.ok) {
        const data = await infoResponse.json();
        setFileName(data.fileName || 'File');
        
        if (data.fileSize) {
          const sizeInMB = (parseInt(data.fileSize) / (1024 * 1024)).toFixed(2);
          setFileSize(`${sizeInMB} MB`);
        }
      }

      toast({
        title: "Access granted",
        description: "Loading file preview...",
      });
    } catch (err: any) {
      setPasswordError(err.message);
      throw err; // Re-throw to let PasswordPromptModal handle it
    }
  };

  const handleDownload = () => {
    const finalFileUrl = downloadToken 
      ? `${contentUrl}?token=${downloadToken}&download=1` 
      : `${contentUrl}?download=1`;
    
    window.open(finalFileUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-[400px]">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Accessing secure file...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-[400px]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={() => navigate('/')}
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show password modal if required
  if (requiresPassword) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-[400px]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Password Required</CardTitle>
              </div>
              <CardDescription>
                This file is password protected. Enter the password to view it.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <PasswordPromptModal
          isOpen={requiresPassword}
          onClose={() => navigate('/')}
          onSubmit={handlePasswordSubmit}
          fileName={fileName}
          error={passwordError}
        />
      </>
    );
  }

  // Success! Show the file viewer with iframe
  const finalFileUrl = downloadToken 
    ? `${contentUrl}?token=${downloadToken}` 
    : contentUrl;

  console.log('🔍 ShortLinkAccess - Rendering viewer:', {
    shortCode,
    hasToken: !!downloadToken,
    finalFileUrl,
    requiresPassword
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header bar with file info and download button */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">{fileName}</h1>
            {fileSize && (
              <p className="text-xs text-muted-foreground">{fileSize}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            Close
          </Button>
        </div>
      </div>

      {/* File preview iframe */}
      <div className="flex-1 relative">
        <iframe
          key={finalFileUrl} 
          src={finalFileUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="File Preview"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>

      {/* Optional: Footer with powered by LinkSecure */}
      <div className="px-6 py-2 border-t bg-card/30 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Secured by LinkSecure</span>
        </div>
      </div>
    </div>
  );
};

export default ShortLinkAccess;
