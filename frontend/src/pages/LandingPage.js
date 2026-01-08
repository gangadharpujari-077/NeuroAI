import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Video, Shield, Brain, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-200 ${
        scrolled ? 'bg-white/80 backdrop-blur-lg shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">Veritas AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors">How it Works</a>
            <Button onClick={() => navigate('/history')} variant="ghost" data-testid="history-nav-btn">History</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-900">AI-Powered Interview Platform</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Integrity in Every
              <span className="block text-indigo-600">Interaction</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
              Experience the future of remote interviews with AI-powered questioning, real-time integrity monitoring, and comprehensive candidate evaluation.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/setup')} 
                className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
                data-testid="start-interview-btn"
              >
                Start Interview <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/history')} 
                className="h-12 px-8 border-2 border-slate-300 hover:border-slate-400 rounded-lg"
                data-testid="view-history-btn"
              >
                View History
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src="https://images.pexels.com/photos/1181533/pexels-photo-1181533.jpeg" 
                alt="AI Interview Platform" 
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">98%</div>
                  <div className="text-sm text-slate-600">Accuracy Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Powerful Features</h2>
            <p className="text-lg text-slate-600">Everything you need for professional AI interviews</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Live Video Interviews</h3>
              <p className="text-slate-600 leading-relaxed">
                Conduct real-time video interviews with AI-powered questioning that adapts to candidate responses.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-rose-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Integrity Monitoring</h3>
              <p className="text-slate-600 leading-relaxed">
                Advanced face detection and eye tracking to ensure interview integrity and authenticity.
              </p>
            </div>
            <div className="bg-white rounded-xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Evaluation</h3>
              <p className="text-slate-600 leading-relaxed">
                Comprehensive post-interview reports with role fit analysis and detailed recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-600">Simple 4-step process</p>
          </div>
          <div className="space-y-8">
            {[
              { num: '01', title: 'Upload Job Description & Resume', desc: 'Provide the role requirements and candidate information' },
              { num: '02', title: 'AI Analyzes Role Fit', desc: 'Our AI evaluates candidate suitability before the interview' },
              { num: '03', title: 'Conduct Live Interview', desc: '25-minute video interview with real-time AI questioning' },
              { num: '04', title: 'Get Evaluation Report', desc: 'Comprehensive analysis with integrity scoring and recommendations' }
            ].map((step, idx) => (
              <div key={idx} className="flex gap-6 items-start group">
                <div className="w-16 h-16 flex-shrink-0 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-mono text-xl font-bold group-hover:scale-110 transition-transform">
                  {step.num}
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Hiring?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Start conducting professional AI interviews today
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/setup')} 
            className="h-14 px-12 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg shadow-xl text-lg font-semibold"
            data-testid="cta-start-btn"
          >
            Get Started Now <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-indigo-400" />
            <span className="text-xl font-bold text-white">Veritas AI</span>
          </div>
          <p className="text-sm">Integrity in Every Interaction</p>
        </div>
      </footer>
    </div>
  );
}