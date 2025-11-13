import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, FileText, BarChart3, Users, ArrowRight, Lock, Eye, Download } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-security.jpg";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useState } from "react";

const Landing = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary animate-float" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LinkSecure
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild variant="default" className="bg-gradient-primary hover:shadow-glow transition-all duration-300 ripple">
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container mx-auto px-4 py-20">
          <div className={`grid lg:grid-cols-2 gap-12 items-center transition-all duration-1000 ${isVisible ? 'animate-fade-in' : 'opacity-0'}`}>
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Secure File Sharing
                <span className="block gradient-text-animated">
                  Made Simple
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed animate-slide-up">
                Share files with enterprise-grade security, real-time analytics, and complete control.
                Perfect for businesses that prioritize data protection.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
                <Button size="lg" className="bg-gradient-primary hover:shadow-glow transition-all duration-300 ripple group">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" className="border-primary/20 hover:bg-primary/5 ripple">
                  View Demo
                </Button>
              </div>
            </div>
            <div className="relative animate-slide-in-right">
              <img
                src={heroImage}
                alt="Secure file sharing platform interface"
                className="w-full h-auto rounded-2xl shadow-strong hover-lift"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold">Enterprise-Grade Security Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Advanced security controls and analytics to keep your data protected and give you complete visibility.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-6 bg-gradient-card border-0 shadow-soft hover:shadow-medium transition-all duration-300 group hover-lift animate-slide-up">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 animate-pulse-glow">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Password Protection</h3>
                <p className="text-muted-foreground">
                  Secure your files with custom passwords and expiration dates.
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-0 shadow-soft hover:shadow-medium transition-all duration-300 group hover-lift animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="space-y-4">
                <div className="h-12 w-12 bg-gradient-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 animate-pulse-glow">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Real-time Analytics</h3>
                <p className="text-muted-foreground">
                  Track views, engagement, and user behavior with detailed heatmaps.
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-0 shadow-soft hover:shadow-medium transition-all duration-300 group hover-lift animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="space-y-4">
                <div className="h-12 w-12 bg-gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 animate-pulse-glow">
                  <Download className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Download Limits</h3>
                <p className="text-muted-foreground">
                  Control access with download limits and usage restrictions.
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-card border-0 shadow-soft hover:shadow-medium transition-all duration-300 group hover-lift animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="space-y-4">
                <div className="h-12 w-12 bg-gradient-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 animate-pulse-glow">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Role Management</h3>
                <p className="text-muted-foreground">
                  Advanced RBAC system for team collaboration and access control.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8 animate-scale-in">
            <h2 className="text-4xl font-bold">Ready to Secure Your Files?</h2>
            <p className="text-xl opacity-90">
              Join thousands of businesses that trust LinkSecure for their file sharing needs.
            </p>
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 ripple">
              Start Your Free Trial
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold bg-gradient-primary bg-clip-text text-transparent">
                LinkSecure
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 LinkSecure. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
