import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import InterviewSetup from '@/pages/InterviewSetup';
import PreInterview from '@/pages/PreInterview';
import InterviewRoom from '@/pages/InterviewRoom';
import EvaluationReport from '@/pages/EvaluationReport';
import InterviewHistory from '@/pages/InterviewHistory';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/setup" element={<InterviewSetup />} />
          <Route path="/pre-interview/:id" element={<PreInterview />} />
          <Route path="/interview/:id" element={<InterviewRoom />} />
          <Route path="/evaluation/:id" element={<EvaluationReport />} />
          <Route path="/history" element={<InterviewHistory />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;