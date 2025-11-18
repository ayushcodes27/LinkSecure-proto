import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Eye, EyeOff, Shield, Clock, Users, Lock, Zap, Database } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import InteractiveGlobe from "@/components/InteractiveGlobe";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requiresVerification, setRequiresVerification] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Rotating tagline
  const taglines = [
    "End-to-end encrypted file sharing for professionals.",
    "Your Data, Your Key. Zero-Knowledge Protected.",
    "Geo-Fenced Access. Compliant Sharing.",
    "Real-Time Revocation. Instant Control."
  ];
  const [currentTagline, setCurrentTagline] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value && !validatePassword(value)) {
      setPasswordError("Password must be at least 6 characters");
    } else {
      setPasswordError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setEmailError("");
    setPasswordError("");

    // Validate inputs
    let hasError = false;
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }
    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 6 characters");
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      const body: any = { email, password };
      if (requires2FA && twoFactorCode) {
        body.twoFactorCode = twoFactorCode;
      }

      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      // Handle email verification requirement
      if (data.requiresVerification) {
        setRequiresVerification(true);
        toast({
          title: "Email verification required",
          description: data.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Handle 2FA requirement
      if (data.requires2FA) {
        setRequires2FA(true);
        toast({
          title: "Two-factor authentication",
          description: data.message,
        });
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data?.message || "Login failed");
      }

      // Persist token for later requests (basic approach)
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      toast({
        title: "Login successful",
        description: "Welcome back to LinkSecure!",
      });
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast({
        title: "Login failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch(apiUrl("/api/auth/resend-verification"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
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
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to resend verification email",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Left Side - Branding & Globe */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
        {/* Logo - Top Left */}
        <div className="absolute top-8 left-8 z-10">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-3 rounded-2xl bg-slate-800/50 backdrop-blur-sm ring-1 ring-blue-500/30 border border-blue-500/20">
                <Shield className="w-8 h-8 text-blue-400 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
              </div>
            </div>
            <div>
              <span className="text-white text-xl font-bold tracking-tight">LinkSecure</span>
              <div className="h-px w-full bg-gradient-to-r from-blue-500/50 to-transparent mt-1" />
            </div>
          </Link>
        </div>
        
        {/* Tagline - Above Globe */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center space-y-4 max-w-lg px-8">
          <h1 className="text-3xl font-bold text-white leading-tight">
            Security that moves at your speed.
          </h1>
          <div className="min-h-[3rem] flex items-center justify-center overflow-hidden">
            <p key={currentTagline} className="text-base text-slate-200 animate-in fade-in duration-500 leading-relaxed">
              {taglines[currentTagline]}
            </p>
          </div>
        </div>
        
        {/* 3D Hex-Grid Globe - Positioned at bottom center, partially cut off */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 w-[600px] h-[600px] pointer-events-auto">
          <InteractiveGlobe />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Back to Home - Top Right */}
        <Link
          to="/"
          className="absolute top-6 right-6 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          ← Back to Home
        </Link>
        
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <Link to="/" className="lg:hidden flex items-center justify-center space-x-3 mb-8 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20">
                <Shield className="w-6 h-6 text-primary transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                LinkSecure
              </span>
            </div>
          </Link>

          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
              <p className="text-slate-600 dark:text-slate-300">Enter your credentials to access your account</p>
            </div>
            <ThemeToggle />
          </div>

          {requiresVerification && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Your email address needs to be verified before you can log in.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                className="w-full"
              >
                Resend Verification Email
              </Button>
            </div>
          )}

          {requires2FA && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                A verification code has been sent to your email.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={requires2FA}
                  className={`pl-10 h-11 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${emailError ? 'border-red-500' : ''}`}
                  required
                />
              </div>
              {emailError && (
                <p className="text-sm text-red-500 dark:text-red-400">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={requires2FA}
                  className={`pl-10 pr-10 h-11 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${passwordError ? 'border-red-500' : ''}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-red-500 dark:text-red-400">{passwordError}</p>
              )}
            </div>

            {requires2FA && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">Verification Code</Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="h-11 dark:bg-slate-900 dark:border-slate-700"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter the 6-digit code sent to your email
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label
                  htmlFor="remember"
                  className="cursor-pointer text-slate-700 dark:text-slate-300"
                >
                  Remember me
                </Label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/50 h-11 transition-all duration-200"
              disabled={isLoading || !!emailError || !!passwordError}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
