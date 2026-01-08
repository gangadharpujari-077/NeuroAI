import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Download, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getInterview } from '@/lib/api';

export default function EvaluationReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await getInterview(id);
      setData(result);
    } catch (error) {
      toast.error('Failed to load evaluation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Generating evaluation report...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.evaluation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <p className="text-slate-900 text-xl font-semibold mb-2">Evaluation Not Available</p>
          <p className="text-slate-600 mb-4">The interview evaluation has not been generated yet</p>
          <Button onClick={() => navigate('/history')}>Go to History</Button>
        </div>
      </div>
    );
  }

  // Use REAL evaluation data from backend
  const evaluation = {
    overall_score: data.evaluation.overall_score || 0,
    recommendation: data.evaluation.recommendation || 'Pending',
    role_fit: data.evaluation.role_fit || {
      skill_alignment: 0,
      experience_relevance: 0,
      project_applicability: 0
    },
    performance: data.evaluation.performance || {
      communication_clarity: 0,
      depth_of_understanding: 0,
      consistency_with_resume: 0
    },
    behavioral_observations: data.evaluation.behavioral_observations || {
      confidence_indicators: 'Not assessed',
      nervousness_patterns: 'Not assessed',
      responsiveness: 'Not assessed'
    },
    integrity_score: data.evaluation.integrity_score || {
      score: 100,
      suspicious_moments: data.integrity_flags || []
    },
    strengths: data.evaluation.strengths || ['Assessment pending'],
    weaknesses: data.evaluation.weaknesses || ['Assessment pending']
  };

  const getRecommendationColor = (rec) => {
    if (rec === 'Strong fit') return 'bg-emerald-500';
    if (rec === 'Moderate fit') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const ScoreCard = ({ title, score, color = 'indigo' }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <span className="text-sm font-bold text-slate-900">{score}%</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/history')} 
          className="mb-6"
          data-testid="back-to-history-btn"
        >
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to History
        </Button>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Interview Evaluation Report</h1>
            <p className="text-lg text-slate-600 font-mono">Interview ID: {id}</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="download-report-btn">
            <Download className="mr-2 w-4 h-4" /> Download PDF
          </Button>
        </div>

        {/* Overall Score */}
        <Card className="mb-6 border-slate-200 shadow-xl grain-texture" data-testid="overall-score-card">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle className="text-2xl">Overall Assessment</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-indigo-600 mb-2">{evaluation.overall_score}</div>
                <div className="text-sm text-slate-600">Overall Score</div>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-2">Recommendation</div>
                  <Badge className={`${getRecommendationColor(evaluation.recommendation)} text-lg px-4 py-1`}>
                    {evaluation.recommendation.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-2">Integrity Score</div>
                  <div className="flex items-center gap-3">
                    <Progress value={evaluation.integrity_score.score} className="flex-1 h-3" />
                    <span className="font-bold text-slate-900">{evaluation.integrity_score.score}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Scores */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Role Fit */}
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-200 bg-slate-50">
              <CardTitle className="text-xl">Role Fit Assessment</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <ScoreCard title="Skill Alignment" score={evaluation.role_fit.skill_alignment} />
              <ScoreCard title="Experience Relevance" score={evaluation.role_fit.experience_relevance} />
              <ScoreCard title="Project Applicability" score={evaluation.role_fit.project_applicability} />
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-200 bg-slate-50">
              <CardTitle className="text-xl">Interview Performance</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <ScoreCard title="Communication Clarity" score={evaluation.performance.communication_clarity} />
              <ScoreCard title="Depth of Understanding" score={evaluation.performance.depth_of_understanding} />
              <ScoreCard title="Resume Consistency" score={evaluation.performance.consistency_with_resume} />
            </CardContent>
          </Card>
        </div>

        {/* Behavioral Observations */}
        <Card className="mb-6 border-slate-200 shadow-lg">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle className="text-xl">Behavioral Observations</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-slate-600 mb-2">Confidence</div>
                <Badge variant="outline" className="border-slate-300">
                  {evaluation.behavioral_observations.confidence_indicators}
                </Badge>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium text-slate-600 mb-2">Observations</div>
                <p className="text-slate-700">{evaluation.behavioral_observations.nervousness_patterns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Strengths */}
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-200 bg-emerald-50">
              <CardTitle className="text-xl flex items-center gap-2 text-emerald-900">
                <TrendingUp className="w-5 h-5" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {evaluation.strengths.map((strength, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Weaknesses */}
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="border-b border-slate-200 bg-amber-50">
              <CardTitle className="text-xl flex items-center gap-2 text-amber-900">
                <TrendingDown className="w-5 h-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {evaluation.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Integrity Flags */}
        {evaluation.integrity_score.suspicious_moments.length > 0 && (
          <Card className="mb-6 border-rose-200 shadow-lg">
            <CardHeader className="border-b border-rose-200 bg-rose-50">
              <CardTitle className="text-xl flex items-center gap-2 text-rose-900">
                <AlertTriangle className="w-5 h-5" />
                Integrity Alerts ({evaluation.integrity_score.suspicious_moments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {evaluation.integrity_score.suspicious_moments.map((moment, idx) => (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-rose-50 rounded border border-rose-200">
                    <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-mono text-slate-500 mb-1">
                        {new Date(moment.timestamp).toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-slate-900">{moment.flag_type}</div>
                      <div className="text-sm text-slate-600">{moment.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/history')} 
            className="flex-1"
            data-testid="view-all-interviews-btn"
          >
            View All Interviews
          </Button>
          <Button 
            onClick={() => navigate('/setup')} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            data-testid="new-interview-btn"
          >
            Schedule New Interview
          </Button>
        </div>
      </div>
    </div>
  );
}