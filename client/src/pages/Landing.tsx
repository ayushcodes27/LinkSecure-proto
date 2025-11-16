import { Button } from "@/components/ui/button";
import { Shield, Zap, Globe, Users, ArrowRight, CheckCircle2, Upload, FolderLock, Link2 } from "lucide-react";
import { Link } from "react-router-dom";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import ThemeToggle from "@/components/ThemeToggle";

const Landing = () => {
  const features = [
    {
      icon: Shield,
      title: "Secure",
      description: "End-to-end encryption for all your files"
    },
    {
      icon: Zap,
      title: "Fast",
      description: "Lightning-fast uploads and downloads"
    },
    {
      icon: Globe,
      title: "Universal",
      description: "Share any file type, anywhere"
    },
    {
      icon: Users,
      title: "Collaborate",
      description: "Easy team sharing and access control"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 border-border">
        <div className="container mx-auto px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20">
                  <Shield className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
              </div>
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  LinkSecure
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button 
                asChild
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container mx-auto px-6 lg:px-8 py-20 lg:py-28 overflow-hidden">
        {/* Pattern Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 dark:opacity-10" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(37, 99, 235) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
            opacity: 0.15
          }}></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5"></div>
        
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 dark:bg-primary/20 rounded-full border border-primary/20">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-primary text-sm font-medium">Trusted by 100,000+ users</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-foreground">
            Securely Share Your Files,<br />Anytime, Anywhere
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience secure file sharing made simple. Share documents, images, and videos with confidence. Your files, your control, complete privacy.
          </p>
          
          <div className="pt-4">
            <Button 
              size="lg" 
              asChild
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link to="/register">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="text-center space-y-3 group">
              <div className="relative inline-flex mx-auto">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center ring-1 ring-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-muted/30 py-20 mt-12">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">How LinkSecure Works</h2>
            <p className="text-lg text-muted-foreground">Three simple steps to secure file sharing</p>
          </div>

          <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">1. Upload Your Files</h3>
              <p className="text-muted-foreground">
                Drag and drop any file type - documents, images, videos, or compressed files. We support unlimited file formats with fast upload speeds.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                <FolderLock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">2. Secure & Encrypt</h3>
              <p className="text-muted-foreground">
                Your files are automatically encrypted with military-grade 256-bit encryption. Set passwords, expiration dates, and download limits for extra security.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                <Link2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">3. Share Instantly</h3>
              <p className="text-muted-foreground">
                Get a secure link in seconds. Share via email, message, or embed. Track who accessed your files and revoke access anytime you want.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section with Image */}
      <section className="py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Bank-Level Security You Can Trust</h2>
              <p className="text-lg text-muted-foreground">
                LinkSecure uses the same encryption standards as major financial institutions. Your files are protected with end-to-end encryption, ensuring only you and your intended recipients can access them.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">256-bit AES encryption</p>
                    <p className="text-muted-foreground">Military-grade security for all your files</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">Zero-knowledge architecture</p>
                    <p className="text-muted-foreground">We can't access your files, even if we wanted to</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">Advanced access controls</p>
                    <p className="text-muted-foreground">Password protection, expiration dates, and download limits</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-primary/10 rounded-2xl blur-3xl opacity-50"></div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1597781914467-a5b93258e748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWN1cmUlMjBkYXRhJTIwZW5jcnlwdGlvbnxlbnwxfHx8fDE3NjMyODc1NDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Secure Encryption"
                className="relative rounded-2xl shadow-xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Collaboration Section with Image */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-tl from-primary/20 to-primary/10 rounded-2xl blur-3xl opacity-50"></div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1739298061707-cefee19941b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbiUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NjMxNjgxMzN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Team Collaboration"
                className="relative rounded-2xl shadow-xl w-full h-auto"
              />
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Collaborate With Your Team Seamlessly</h2>
              <p className="text-lg text-muted-foreground">
                Share files with individuals or entire teams. Create shared folders, manage permissions, and track file activity in real-time. Perfect for remote teams and distributed workflows.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">Team workspaces</p>
                    <p className="text-muted-foreground">Organize files by projects and teams</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">Real-time activity tracking</p>
                    <p className="text-muted-foreground">See who viewed, downloaded, or shared files</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">Granular permissions</p>
                    <p className="text-muted-foreground">Control who can view, edit, or share files</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fast Sharing Section with Image */}
      <section className="py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Lightning-Fast File Sharing</h2>
              <p className="text-lg text-muted-foreground">
                Our global CDN ensures your files are delivered at blazing speeds, no matter where you or your recipients are located. Share large files without the wait.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">No file size limits</p>
                    <p className="text-muted-foreground">Share files of any size on premium plans</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">Global CDN network</p>
                    <p className="text-muted-foreground">Fast downloads from anywhere in the world</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">Resume interrupted uploads</p>
                    <p className="text-muted-foreground">Never lose progress on large file transfers</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-primary/10 rounded-2xl blur-3xl opacity-50"></div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1533279443086-d1c19a186416?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWxlJTIwc2hhcmluZyUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzYzMjg3NTQ0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Fast File Sharing"
                className="relative rounded-2xl shadow-xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6 p-12 rounded-3xl bg-gradient-to-br from-primary to-primary/80 shadow-strong">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground">
            Ready to Get Started?
          </h2>
          <p className="text-primary-foreground/90 text-lg">
            Join LinkSecure today and experience secure file sharing like never before. Start with our free plan and upgrade as you grow.
          </p>
          <Button 
            size="lg" 
            asChild
            className="bg-background text-primary hover:bg-background/90 shadow-lg"
          >
            <Link to="/register">
              Sign Up Free
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm border-border py-12">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="relative p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
              </div>
              <span className="font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                LinkSecure
              </span>
            </div>
            
            <div className="flex items-center gap-8 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Features</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
            
            <p className="text-muted-foreground">
              © 2024 LinkSecure
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
