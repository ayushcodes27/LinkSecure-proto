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
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

const ShortLinkAccess = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");

  useEffect(() => {
    attemptAccess();
  }, [shortCode]);

  const attemptAccess = async () => {
    if (!shortCode) return;
    
    setLoading(true);
    setError(null);

    try {
      // Try to access the file directly from backend
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/s/${shortCode}`, {
        method: 'GET',
        redirect: 'manual' // Don't follow redirects
      });

      if (response.status === 401) {
        // Password required
        const data = await response.json();
        setRequiresPassword(true);
        setFileName(data.fileName || 'Protected File');
        setLoading(false);
        return;
      }

      if (response.type === 'opaqueredirect' || response.status === 0) {
        // Backend tried to redirect - this means password is required
        setRequiresPassword(true);
        setFileName('Protected File');
        setLoading(false);
        return;
      }

      if (response.ok) {
        // No password required - download directly
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'download';
        
        downloadBlob(blob, filename);
        
        toast({
          title: "Success",
          description: "File downloaded successfully",
        });
        
        setLoading(false);
      } else if (response.status === 404) {
        setError('File not found or link has expired');
        setLoading(false);
      } else if (response.status === 410) {
        setError('This link has expired');
        setLoading(false);
      } else {
        // Check if response is JSON (error) or if password is required
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          if (data.requiresPassword) {
            setRequiresPassword(true);
            setFileName(data.fileName || 'Protected File');
          } else {
            setError(data.message || 'Failed to access file');
          }
        } else {
          setError('Failed to access file');
        }
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
      // Step 1: Verify password and get JWT token
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

      // Step 2: Download file with token
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const downloadResponse = await fetch(`${backendUrl}/s/${shortCode}?token=${token}`, {
        method: 'GET',
      });

      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob();
        const contentDisposition = downloadResponse.headers.get('content-disposition');
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || fileName || 'download';
        
        downloadBlob(blob, filename);
        
        toast({
          title: "Success",
          description: "File downloaded successfully",
        });
      } else {
        const data = await downloadResponse.json();
        throw new Error(data.message || 'Download failed');
      }
    } catch (err: any) {
      setPasswordError(err.message);
      throw err; // Re-throw to let PasswordPromptModal handle it
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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

  if (downloadToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-[400px]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <CardTitle>Download Complete</CardTitle>
            </div>
            <CardDescription>Your file has been downloaded successfully.</CardDescription>
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

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-[400px]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Secure File Access</CardTitle>
            </div>
            <CardDescription>
              Preparing your secure download...
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
};

export default ShortLinkAccess;
