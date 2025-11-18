import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, User, Eye, EyeOff, Shield, Lock, Zap, Database } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import InteractiveGlobe from "@/components/InteractiveGlobe";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const validateField = (field: string, value: string | boolean) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'firstName':
        if (!value || (value as string).trim().length < 2) {
          newErrors.firstName = "First name must be at least 2 characters";
        } else {
          delete newErrors.firstName;
        }
        break;
      case 'lastName':
        if (!value || (value as string).trim().length < 2) {
          newErrors.lastName = "Last name must be at least 2 characters";
        } else {
          delete newErrors.lastName;
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value || !emailRegex.test(value as string)) {
          newErrors.email = "Please enter a valid email address";
        } else {
          delete newErrors.email;
        }
        break;
      case 'password':
        if (!value || (value as string).length < 8) {
          newErrors.password = "Password must be at least 8 characters";
        } else if (!(value as string).match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
          newErrors.password = "Password must contain uppercase, lowercase, and number";
        } else {
          delete newErrors.password;
        }
        break;
      case 'confirmPassword':
        if (value !== formData.password) {
          newErrors.confirmPassword = "Passwords do not match";
        } else {
          delete newErrors.confirmPassword;
        }
        break;
      case 'agreeToTerms':
        if (!value) {
          newErrors.agreeToTerms = "You must agree to the terms and conditions";
        } else {
          delete newErrors.agreeToTerms;
        }
        break;
    }

    setErrors(newErrors);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    Object.keys(formData).forEach(field => {
      validateField(field, formData[field as keyof typeof formData]);
    });

    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);

    try {
      const resp = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.message || "Registration failed");
      }

      toast({
        title: "Registration successful",
        description: data.message || "Please check your email to verify your account.",
        duration: 6000,
      });
      navigate("/login");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
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
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create an account</h1>
              <p className="text-slate-600 dark:text-slate-300">Start sharing files securely in minutes</p>
            </div>
            <ThemeToggle />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className={`pl-10 h-11 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.firstName ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                {errors.firstName && (
                  <p className="text-sm text-red-500 dark:text-red-400">{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className={`pl-10 h-11 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.lastName ? 'border-red-500' : ''}`}
                    required
                  />
                </div>
                {errors.lastName && (
                  <p className="text-sm text-red-500 dark:text-red-400">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`pl-10 h-11 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : ''}`}
                  required
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.email}</p>
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
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className={`pl-10 pr-10 h-11 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.password ? 'border-red-500' : ''}`}
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
              {errors.password && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className={`pl-10 pr-10 h-11 dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 dark:text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                className="mt-1"
              />
              <Label
                htmlFor="terms"
                className="cursor-pointer text-slate-700 dark:text-slate-300 leading-relaxed text-sm"
              >
                I agree to the{" "}
                <Link to="/terms" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-500 dark:text-red-400">{errors.agreeToTerms}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/50 h-11 transition-all duration-200"
              disabled={isLoading || Object.keys(errors).length > 0}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
