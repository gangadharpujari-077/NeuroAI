import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, TrendingUp, Briefcase, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { getInterview } from '@/lib/api';

export default function PreInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [interviewData, setInterviewData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get interview data from localStorage first (from setup page)
      const setupData = localStorage.getItem(`interview_${id}`);
      if (setupData) {
        const parsed = JSON.parse(setupData);
        setAnalysisData(parsed.role_fit_analysis);
        setInterviewData(parsed);
      } else {
        // Fallback: fetch from API
        const result = await getInterview(id);
        setInterviewData(result);
        
        // If no analysis in result, show error
        if (!result.role_fit_analysis) {
          toast.error('Analysis data not available');
        }
      }
    } catch (error) {
      toast.error('Failed to load interview data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Analyzing role fit...</p>
        </div>
      </div>
    );
  }

  // Mock analysis data (in real scenario, this would come from backend)
  const analysis = {
    match_score: 85,
    skill_match_level: 'high',
    strengths: [
      'Strong technical background in required technologies',
      'Relevant project experience',
      'Good communication skills demonstrated in resume'
    ],
    areas_to_probe: [
      'Depth of experience with specific frameworks',
      'Team collaboration and leadership',
      'Problem-solving approach'
    ]
  };

  const getMatchColor = (level) => {
    if (level === 'high') return 'bg-emerald-500';
    if (level === 'medium') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Pre-Interview Analysis</h1>
          <p className="text-lg text-slate-600">AI-powered role fit assessment</p>
        </div>

        {/* Match Score */}
        <Card className="mb-6 border-slate-200 shadow-lg" data-testid="match-score-card">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
              Overall Match Score
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <Progress value={analysis.match_score} className="h-4 mb-2" />
                <div className="flex justify-between text-sm text-slate-600">
                  <span>0%</span>
                  <span className="font-semibold text-slate-900">{analysis.match_score}% Match</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-indigo-600">{analysis.match_score}</div>
                <Badge className={`mt-2 ${getMatchColor(analysis.skill_match_level)}`}>
                  {analysis.skill_match_level.toUpperCase()} FIT
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Strengths */}
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-200 bg-emerald-50">
              <CardTitle className="text-xl flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-5 h-5" />
                Identified Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Areas to Probe */}
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-200 bg-amber-50">
              <CardTitle className="text-xl flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-5 h-5" />
                Areas to Probe
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {analysis.areas_to_probe.map((area, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Interview Details */}
        <Card className="mb-8 border-slate-200 shadow-lg">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-xl flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Interview Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Interview ID</div>
                <div className="font-mono text-slate-900">{id}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Status</div>
                <Badge variant="outline" className="border-slate-300">Scheduled</Badge>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Duration</div>
                <div className="text-slate-900">25 minutes</div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Format</div>
                <div className="text-slate-900">Live Video + AI Questioning</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/history')} 
            className="flex-1"
            data-testid="back-to-history-btn"
          >
            Back to History
          </Button>
          <Button 
            onClick={() => navigate(`/interview/${id}`)} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            data-testid="start-interview-now-btn"
          >
            Start Interview <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}