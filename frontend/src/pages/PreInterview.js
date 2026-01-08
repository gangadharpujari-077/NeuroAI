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

  if (!analysisData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <p className="text-slate-900 text-xl font-semibold mb-2">Analysis Not Available</p>
          <p className="text-slate-600 mb-4">Unable to load role fit analysis</p>
          <Button onClick={() => navigate('/setup')}>Go Back to Setup</Button>
        </div>
      </div>
    );
  }

  // Use REAL analysis data from AI
  const analysis = {
    match_score: analysisData.match_score || 0,
    skill_match_level: analysisData.skill_match_level || 'low',
    experience_relevance: analysisData.experience_relevance || 'Analysis not available',
    project_alignment: analysisData.project_alignment || 'Analysis not available',
    analysis_summary: analysisData.analysis_summary || 'Analysis not available'
  };

  // Parse strengths and weaknesses from the analysis text
  const strengths = [];
  const areas_to_probe = [];

  // Extract key points from analysis_summary and experience_relevance
  if (analysis.match_score >= 70) {
    if (analysis.experience_relevance) {
      const sentences = analysis.experience_relevance.split(/[.!?]+/).filter(s => s.trim());
      sentences.slice(0, 3).forEach(s => {
        if (s.trim() && !s.toLowerCase().includes('not') && !s.toLowerCase().includes('lack')) {
          strengths.push(s.trim());
        }
      });
    }
  } else {
    if (analysis.experience_relevance) {
      const sentences = analysis.experience_relevance.split(/[.!?]+/).filter(s => s.trim());
      sentences.slice(0, 3).forEach(s => {
        if (s.trim()) {
          areas_to_probe.push(s.trim());
        }
      });
    }
  }

  // Extract from project_alignment
  if (analysis.project_alignment) {
    const sentences = analysis.project_alignment.split(/[.!?]+/).filter(s => s.trim());
    if (analysis.match_score >= 70) {
      sentences.slice(0, 2).forEach(s => {
        if (s.trim() && !s.toLowerCase().includes('not') && !s.toLowerCase().includes('lack')) {
          strengths.push(s.trim());
        }
      });
    } else {
      sentences.slice(0, 2).forEach(s => {
        if (s.trim()) {
          areas_to_probe.push(s.trim());
        }
      });
    }
  }

  // Fallback messages
  if (strengths.length === 0 && analysis.match_score >= 70) {
    strengths.push('Candidate shows good alignment with role requirements');
    strengths.push('Relevant experience for this position');
  }

  if (areas_to_probe.length === 0) {
    areas_to_probe.push('Clarify specific experience and achievements');
    areas_to_probe.push('Verify skills match with role expectations');
  }

  const getMatchColor = (level) => {
    if (level === 'high') return 'bg-emerald-500';
    if (level === 'medium') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const MINIMUM_MATCH_THRESHOLD = 35;
  const isBelowThreshold = analysis.match_score < MINIMUM_MATCH_THRESHOLD;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Pre-Interview Analysis</h1>
          <p className="text-lg text-slate-600">AI-powered role fit assessment</p>
        </div>

        {/* Low Match Warning Banner */}
        {isBelowThreshold && (
          <Card className="mb-6 border-rose-300 bg-rose-50 shadow-xl" data-testid="low-match-warning">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-rose-900 mb-2">
                    Interview Not Recommended - Low Role Fit
                  </h3>
                  <p className="text-rose-800 text-base leading-relaxed mb-4">
                    The candidate's profile shows a match score of <strong>{analysis.match_score}%</strong>, which is significantly below our threshold of {MINIMUM_MATCH_THRESHOLD}%. 
                    Proceeding with this interview would not be an effective use of time for either party.
                  </p>
                  <div className="bg-rose-100 border border-rose-200 rounded-lg p-4 mb-4">
                    <p className="text-rose-900 font-semibold mb-2">📋 Our Recommendation:</p>
                    <p className="text-rose-800 text-sm leading-relaxed">
                      {analysis.analysis_summary}
                    </p>
                  </div>
                  <p className="text-rose-800 font-medium">
                    💡 <strong>Suggestion:</strong> This candidate may be better suited for different roles that align with their background and experience.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                {analysis.match_score >= 70 ? 'Identified Strengths' : 'Key Observations'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {strengths.length > 0 ? (
                <ul className="space-y-3">
                  {strengths.map((strength, idx) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600">{analysis.analysis_summary}</p>
              )}
            </CardContent>
          </Card>

          {/* Areas to Probe */}
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-200 bg-amber-50">
              <CardTitle className="text-xl flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-5 h-5" />
                {analysis.match_score >= 70 ? 'Areas to Probe' : 'Areas of Concern'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {areas_to_probe.map((area, idx) => (
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
          
          {isBelowThreshold ? (
            <div className="flex-1 space-y-2">
              <Button 
                disabled
                className="w-full bg-slate-400 cursor-not-allowed"
                data-testid="start-interview-disabled-btn"
              >
                Interview Blocked - Low Match Score
              </Button>
              <p className="text-sm text-center text-slate-600">
                Consider other candidates or different role for this profile
              </p>
            </div>
          ) : (
            <Button 
              onClick={() => navigate(`/interview/${id}`)} 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              data-testid="start-interview-now-btn"
            >
              Start Interview <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}