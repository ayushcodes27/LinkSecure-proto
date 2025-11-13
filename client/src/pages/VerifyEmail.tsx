import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const resp = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await resp.json();

      if (resp.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setStatus("error");
        setMessage(data.message || "Verification failed");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred during verification");
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const email = prompt("Please enter your email address:");
      if (!email) {
        setResendLoading(false);
        return;
      }

      const resp = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await resp.json();

      if (resp.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <Shield className="h-8 w-8 text-primary animate-float" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LinkSecure
            </span>
          </Link>
        </div>

        <Card className="backdrop-blur-glass border-glass shadow-glass">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {status === "verifying" && (
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              )}
              {status === "success" && (
                <CheckCircle className="h-16 w-16 text-green-500" />
              )}
              {status === "error" && (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {status === "verifying" && "Verifying Email"}
              {status === "success" && "Email Verified!"}
              {status === "error" && "Verification Failed"}
            </CardTitle>
            <CardDescription>
              {status === "verifying" && "Please wait while we verify your email address..."}
              {status === "success" && "Your email has been successfully verified."}
              {status === "error" && message}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {status === "success" && (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  Redirecting to login page in 3 seconds...
                </p>
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full"
                >
                  Go to Login
                </Button>
              </>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <Button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full"
                  variant="outline"
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full"
                  variant="secondary"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          Need help?{" "}
          <Link to="/" className="text-primary hover:underline">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
