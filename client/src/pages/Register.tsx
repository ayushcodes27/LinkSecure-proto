import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

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
      const resp = await fetch("/api/auth/register", {
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

  const getFieldStatus = (field: string) => {
    const value = formData[field as keyof typeof formData];
    if (!value) return null;
    return errors[field] ? 'error' : 'success';
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <Shield className="h-8 w-8 text-primary animate-float" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LinkSecure
            </span>
          </Link>
        </div>

        <Card className="bg-gradient-card border-0 shadow-strong hover-lift transition-all duration-300">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Start securing your files with enterprise-grade protection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      required
                      className={`transition-all duration-200 focus:shadow-soft pr-8 ${
                        errors.firstName ? 'border-destructive focus:border-destructive' : ''
                      }`}
                      aria-invalid={!!errors.firstName}
                      aria-describedby={errors.firstName ? "firstName-error" : undefined}
                    />
                    {formData.firstName && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getFieldStatus('firstName') === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : getFieldStatus('firstName') === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {errors.firstName && (
                    <p id="firstName-error" className="text-sm text-destructive animate-slide-up">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      required
                      className={`transition-all duration-200 focus:shadow-soft pr-8 ${
                        errors.lastName ? 'border-destructive focus:border-destructive' : ''
                      }`}
                      aria-invalid={!!errors.lastName}
                      aria-describedby={errors.lastName ? "lastName-error" : undefined}
                    />
                    {formData.lastName && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getFieldStatus('lastName') === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : getFieldStatus('lastName') === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {errors.lastName && (
                    <p id="lastName-error" className="text-sm text-destructive animate-slide-up">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                    className={`transition-all duration-200 focus:shadow-soft pr-8 ${
                      errors.email ? 'border-destructive focus:border-destructive' : ''
                    }`}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {formData.email && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {getFieldStatus('email') === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : getFieldStatus('email') === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : null}
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive animate-slide-up">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    required
                    className={`pr-16 transition-all duration-200 focus:shadow-soft ${
                      errors.password ? 'border-destructive focus:border-destructive' : ''
                    }`}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <div className="absolute right-0 top-0 flex items-center h-full">
                    {formData.password && (
                      <div className="pr-2">
                        {getFieldStatus('password') === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : getFieldStatus('password') === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-full px-3 py-2 hover:bg-transparent transition-all duration-200"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      )}
                    </Button>
                  </div>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive animate-slide-up">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    required
                    className={`pr-16 transition-all duration-200 focus:shadow-soft ${
                      errors.confirmPassword ? 'border-destructive focus:border-destructive' : ''
                    }`}
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  />
                  <div className="absolute right-0 top-0 flex items-center h-full">
                    {formData.confirmPassword && (
                      <div className="pr-2">
                        {getFieldStatus('confirmPassword') === 'error' ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : getFieldStatus('confirmPassword') === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-full px-3 py-2 hover:bg-transparent transition-all duration-200"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      )}
                    </Button>
                  </div>
                </div>
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="text-sm text-destructive animate-slide-up">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                  className="focus-ring"
                />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline transition-colors">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-sm text-destructive animate-slide-up">
                  {errors.agreeToTerms}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 ripple"
                disabled={isLoading || Object.keys(errors).length > 0}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="spinner w-4 h-4"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Theme Toggle */}
        <div className="flex justify-center mt-6">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default Register;
