import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { uploadResume, uploadJD, setupInterview } from '@/lib/api';

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    job_title: '',
    candidate_name: '',
    candidate_email: '',
    jd_text: '',
    resume_text: ''
  });

  const handleFileUpload = async (file, type) => {
    try {
      setLoading(true);
      let result;
      if (type === 'resume') {
        result = await uploadResume(file);
        setFormData(prev => ({ ...prev, resume_text: result.text }));
        toast.success('Resume uploaded successfully');
      } else {
        result = await uploadJD(file);
        setFormData(prev => ({ ...prev, jd_text: result.text }));
        toast.success('Job description uploaded successfully');
      }
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.job_title || !formData.candidate_name || !formData.candidate_email) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const result = await setupInterview(formData);
      
      // Store complete result in localStorage for pre-interview page
      localStorage.setItem(`interview_${result.interview_id}`, JSON.stringify(result));
      
      toast.success('Interview setup complete!');
      navigate(`/pre-interview/${result.interview_id}`);
    } catch (error) {
      toast.error('Setup failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="mb-6"
          data-testid="back-to-home-btn"
        >
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
        </Button>

        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-3xl font-bold">Setup New Interview</CardTitle>
            <CardDescription className="text-base">Provide job description and candidate information</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="job_title" className="text-base font-semibold">Job Title *</Label>
                <Input
                  id="job_title"
                  data-testid="job-title-input"
                  placeholder="e.g. Senior Software Engineer"
                  value={formData.job_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                  className="h-11"
                  required
                />
              </div>

              {/* Candidate Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="candidate_name" className="text-base font-semibold">Candidate Name *</Label>
                  <Input
                    id="candidate_name"
                    data-testid="candidate-name-input"
                    placeholder="Full name"
                    value={formData.candidate_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, candidate_name: e.target.value }))}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidate_email" className="text-base font-semibold">Candidate Email *</Label>
                  <Input
                    id="candidate_email"
                    data-testid="candidate-email-input"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.candidate_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, candidate_email: e.target.value }))}
                    className="h-11"
                    required
                  />
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Job Description</Label>
                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text" data-testid="jd-text-tab">Paste Text</TabsTrigger>
                    <TabsTrigger value="upload" data-testid="jd-upload-tab">Upload File</TabsTrigger>
                  </TabsList>
                  <TabsContent value="text" className="space-y-2">
                    <Textarea
                      data-testid="jd-text-input"
                      placeholder="Paste job description here..."
                      value={formData.jd_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, jd_text: e.target.value }))}
                      rows={6}
                      className="resize-none"
                    />
                  </TabsContent>
                  <TabsContent value="upload">
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
                      <input
                        type="file"
                        id="jd-file"
                        accept=".pdf,.docx"
                        onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'jd')}
                        className="hidden"
                        data-testid="jd-file-input"
                      />
                      <label htmlFor="jd-file" className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                        <div className="text-sm font-medium text-slate-700">Click to upload or drag and drop</div>
                        <div className="text-xs text-slate-500 mt-1">PDF or DOCX (MAX. 10MB)</div>
                      </label>
                    </div>
                    {formData.jd_text && (
                      <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm text-emerald-900">File uploaded successfully</span>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Resume */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Candidate Resume</Label>
                <Tabs defaultValue="text" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text" data-testid="resume-text-tab">Paste Text</TabsTrigger>
                    <TabsTrigger value="upload" data-testid="resume-upload-tab">Upload File</TabsTrigger>
                  </TabsList>
                  <TabsContent value="text" className="space-y-2">
                    <Textarea
                      data-testid="resume-text-input"
                      placeholder="Paste resume here..."
                      value={formData.resume_text}
                      onChange={(e) => setFormData(prev => ({ ...prev, resume_text: e.target.value }))}
                      rows={6}
                      className="resize-none"
                    />
                  </TabsContent>
                  <TabsContent value="upload">
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
                      <input
                        type="file"
                        id="resume-file"
                        accept=".pdf,.docx"
                        onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'resume')}
                        className="hidden"
                        data-testid="resume-file-input"
                      />
                      <label htmlFor="resume-file" className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                        <div className="text-sm font-medium text-slate-700">Click to upload or drag and drop</div>
                        <div className="text-xs text-slate-500 mt-1">PDF or DOCX (MAX. 10MB)</div>
                      </label>
                    </div>
                    {formData.resume_text && (
                      <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm text-emerald-900">File uploaded successfully</span>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/')} 
                  className="flex-1"
                  data-testid="cancel-btn"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  disabled={loading}
                  data-testid="setup-interview-btn"
                >
                  {loading ? 'Setting up...' : 'Setup Interview'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}