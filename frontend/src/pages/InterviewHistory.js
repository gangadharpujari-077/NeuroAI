import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getInterviews } from '@/lib/api';

export default function InterviewHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      const data = await getInterviews();
      setInterviews(data);
    } catch (error) {
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Calendar className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
      scheduled: 'bg-slate-100 text-slate-800 border-slate-200'
    };
    return variants[status] || variants.scheduled;
  };

  const filteredInterviews = interviews.filter(interview =>
    interview.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="mb-6"
          data-testid="back-to-home-btn"
        >
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
        </Button>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Interview History</h1>
            <p className="text-lg text-slate-600">View all past and scheduled interviews</p>
          </div>
          <Button 
            onClick={() => navigate('/setup')} 
            className="bg-indigo-600 hover:bg-indigo-700"
            data-testid="new-interview-btn"
          >
            New Interview
          </Button>
        </div>

        {/* Search */}
        <Card className="mb-6 border-slate-200 shadow-lg">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by interview ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
                data-testid="search-interviews-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Interviews List */}
        {filteredInterviews.length === 0 ? (
          <Card className="border-slate-200 shadow-lg">
            <CardContent className="py-16 text-center">
              <XCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No interviews found</h3>
              <p className="text-slate-600 mb-6">Get started by scheduling your first interview</p>
              <Button 
                onClick={() => navigate('/setup')} 
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Schedule Interview
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInterviews.map((interview) => (
              <Card 
                key={interview.id} 
                className="border-slate-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => {
                  if (interview.status === 'completed') {
                    navigate(`/evaluation/${interview.id}`);
                  } else if (interview.status === 'in_progress') {
                    navigate(`/interview/${interview.id}`);
                  } else {
                    navigate(`/pre-interview/${interview.id}`);
                  }
                }}
                data-testid={`interview-card-${interview.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(interview.status)}
                        <h3 className="text-xl font-bold text-slate-900">Interview {interview.id.slice(0, 8)}</h3>
                        <Badge className={getStatusBadge(interview.status)}>
                          {interview.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div>Created: {new Date(interview.created_at).toLocaleString()}</div>
                        {interview.start_time && (
                          <div>Started: {new Date(interview.start_time).toLocaleString()}</div>
                        )}
                        {interview.end_time && (
                          <div>Completed: {new Date(interview.end_time).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}