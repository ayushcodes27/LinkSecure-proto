import { Button } from "./ui/button";
import { Shield, Zap, Globe, Users, Lock, ArrowRight, CheckCircle2, Upload, FolderLock, Link2 } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface LandingPageProps {
  onNavigate: (page: 'landing' | 'login' | 'signup') => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-2 rounded-xl">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <span className="text-slate-900">LinkSecure</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => onNavigate('login')}>
                Login
              </Button>
              <Button 
                onClick={() => onNavigate('signup')}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-blue-700">Trusted by 100,000+ users</span>
          </div>
          
          <h1 className="text-slate-900">
            Securely Share Your Files,<br />Anytime, Anywhere
          </h1>
          
          <p className="text-slate-600 max-w-2xl mx-auto">
            Experience secure file sharing made simple. Share documents, images, and videos with confidence. Your files, your control, complete privacy.
          </p>
          
          <div className="pt-4">
            <Button 
              size="lg" 
              onClick={() => onNavigate('signup')} 
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-slate-900">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-50 py-20 mt-12">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-slate-900 mb-4">How LinkSecure Works</h2>
            <p className="text-slate-600">Three simple steps to secure file sharing</p>
          </div>

          <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-slate-900">1. Upload Your Files</h3>
              <p className="text-slate-600">
                Drag and drop any file type - documents, images, videos, or compressed files. We support unlimited file formats with fast upload speeds.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center">
                <FolderLock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-slate-900">2. Secure & Encrypt</h3>
              <p className="text-slate-600">
                Your files are automatically encrypted with military-grade 256-bit encryption. Set passwords, expiration dates, and download limits for extra security.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center">
                <Link2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-slate-900">3. Share Instantly</h3>
              <p className="text-slate-600">
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
              <h2 className="text-slate-900">Bank-Level Security You Can Trust</h2>
              <p className="text-slate-600">
                LinkSecure uses the same encryption standards as major financial institutions. Your files are protected with end-to-end encryption, ensuring only you and your intended recipients can access them.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-900">256-bit AES encryption</p>
                    <p className="text-slate-600">Military-grade security for all your files</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-900">Zero-knowledge architecture</p>
                    <p className="text-slate-600">We can't access your files, even if we wanted to</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-900">Advanced access controls</p>
                    <p className="text-slate-600">Password protection, expiration dates, and download limits</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-2xl blur-3xl opacity-20"></div>
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
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-tl from-blue-500 to-cyan-400 rounded-2xl blur-3xl opacity-20"></div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1739298061707-cefee19941b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbiUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NjMxNjgxMzN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Team Collaboration"
                className="relative rounded-2xl shadow-xl w-full h-auto"
              />
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <h2 className="text-slate-900">Collaborate With Your Team Seamlessly</h2>
              <p className="text-slate-600">
                Share files with individuals or entire teams. Create shared folders, manage permissions, and track file activity in real-time. Perfect for remote teams and distributed workflows.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-900">Team workspaces</p>
                    <p className="text-slate-600">Organize files by projects and teams</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-900">Real-time activity tracking</p>
                    <p className="text-slate-600">See who viewed, downloaded, or shared files</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-900">Granular permissions</p>
                    <p className="text-slate-600">Control who can view, edit, or share files</p>
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
              <h2 className="text-slate-900">Lightning-Fast File Sharing</h2>
              <p className="text-slate-600">
                Our global CDN ensures your files are delivered at blazing speeds, no matter where you or your recipients are located. Share large files without the wait.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-900">No file size limits</p>
                    <p className="text-slate-600">Share files of any size on premium plans</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-900">Global CDN network</p>
                    <p className="text-slate-600">Fast downloads from anywhere in the world</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-900">Resume interrupted uploads</p>
                    <p className="text-slate-600">Never lose progress on large file transfers</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-2xl blur-3xl opacity-20"></div>
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
        <div className="max-w-3xl mx-auto text-center space-y-6 p-12 rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500">
          <h2 className="text-white">
            Ready to Get Started?
          </h2>
          <p className="text-blue-50">
            Join LinkSecure today and experience secure file sharing like never before. Start with our free plan and upgrade as you grow.
          </p>
          <Button 
            size="lg" 
            onClick={() => onNavigate('signup')} 
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            Sign Up Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50 py-12">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-2 rounded-xl">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <span className="text-slate-900">LinkSecure</span>
            </div>
            
            <div className="flex items-center gap-8 text-slate-600">
              <a href="#" className="hover:text-slate-900 transition-colors">About</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Features</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
            </div>
            
            <p className="text-slate-500">
              © 2024 LinkSecure
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}