import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Video, VideoOff, Mic, MicOff, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { startInterview, endInterview } from '@/lib/api';
import { FaceDetection } from '@mediapipe/face_detection';
import { Camera } from '@mediapipe/camera_utils';

export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [aiMessage, setAiMessage] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [integrityFlags, setIntegrityFlags] = useState([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [candidateResponse, setCandidateResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [lastFaceWarning, setLastFaceWarning] = useState(0);
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  
  const recognitionRef = useRef(null);
  const containerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const MAX_FULLSCREEN_EXITS = 3;
  const FACE_WARNING_INTERVAL = 5000; // 5 seconds between warnings
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds
  const AI_RESPONSE_TIMEOUT = 45000; // 45 seconds timeout for AI response
  
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const faceDetectionRef = useRef(null);
  const cameraRef = useRef(null);

  const INTERVIEW_DURATION = 25 * 60; // 25 minutes in seconds

  useEffect(() => {
    initializeMedia();
    setupSpeechRecognition();
    setupFullscreenMonitoring();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (interviewStarted) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          if (prev >= INTERVIEW_DURATION) {
            handleEndInterview();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interviewStarted]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Initialize face detection
      await initializeFaceDetection();
      
      toast.success('Camera and microphone initialized');
    } catch (error) {
      toast.error('Failed to access camera/microphone');
      console.error('Media error:', error);
    }
  };

  const initializeFaceDetection = async () => {
    try {
      const faceDetection = new FaceDetection({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
        }
      });

      faceDetection.setOptions({
        model: 'short',
        minDetectionConfidence: 0.5
      });

      faceDetection.onResults((results) => {
        const hasDetections = results.detections && results.detections.length > 0;
        
        // Update face detection status immediately
        setFaceDetected(hasDetections);
        
        if (interviewStarted) {
          if (hasDetections) {
            // Check for multiple faces
            if (results.detections.length > 1) {
              addIntegrityFlag('multiple_faces', 'Multiple faces detected in frame');
              toast.error('⚠️ Multiple faces detected! Only candidate should be visible.');
            }
          } else {
            // No face detected - warn user
            const now = Date.now();
            if (now - lastFaceWarning > FACE_WARNING_INTERVAL) {
              addIntegrityFlag('no_face', 'Candidate face not visible');
              toast.error('⚠️ Your face is not visible! Please ensure you are in front of the camera.');
              setLastFaceWarning(now);
            }
          }
        }
      });

      await faceDetection.initialize();
      faceDetectionRef.current = faceDetection;

      // Start camera for face detection with proper timing
      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (faceDetectionRef.current && videoRef.current && videoRef.current.readyState === 4) {
              try {
                await faceDetectionRef.current.send({ image: videoRef.current });
              } catch (e) {
                // Silently handle frame processing errors
              }
            }
          },
          width: 640,
          height: 480
        });
        await camera.start();
        cameraRef.current = camera;
        console.log('Face detection started successfully');
      }
    } catch (error) {
      console.error('Face detection initialization error:', error);
      toast.error('Face detection initialization failed');
    }
  };

  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setRecognitionActive(true);
      toast.success('🎤 Listening...');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setCandidateResponse(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setRecognitionActive(false);
      setIsListening(false);
      
      if (event.error === 'no-speech') {
        toast.error('No speech detected. Please speak clearly.');
      } else if (event.error === 'not-allowed') {
        toast.error('Microphone access denied.');
      } else {
        toast.error('Speech recognition error. Please try again.');
      }
    };

    recognition.onend = () => {
      setRecognitionActive(false);
      if (isListening) {
        // Restart if still in listening mode
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not available in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast.info('Voice input stopped');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice input');
      }
    }
  };

  const setupFullscreenMonitoring = () => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && interviewStarted) {
        // User exited fullscreen
        const newExits = fullscreenExits + 1;
        setFullscreenExits(newExits);

        if (newExits >= MAX_FULLSCREEN_EXITS) {
          // Failed integrity check
          toast.error('🚫 Interview terminated: Exceeded fullscreen exit limit');
          addIntegrityFlag('fullscreen_violation', 'Exceeded maximum fullscreen exits (3)');
          
          // Mark as unfit
          if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
              type: 'integrity_violation',
              reason: 'Exceeded fullscreen exit limit',
              action: 'terminate'
            }));
          }

          // End interview
          setTimeout(() => {
            handleEndInterview(true); // true = integrity violation
          }, 2000);
        } else {
          // Warning
          const remainingChances = MAX_FULLSCREEN_EXITS - newExits;
          toast.error(`⚠️ WARNING: Do not exit fullscreen! ${remainingChances} ${remainingChances === 1 ? 'chance' : 'chances'} remaining.`);
          addIntegrityFlag('fullscreen_exit', `Fullscreen exit #${newExits}`);
          
          // Send to backend
          if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
              type: 'integrity_flag',
              flag_type: 'fullscreen_exit',
              description: `User exited fullscreen (${newExits}/${MAX_FULLSCREEN_EXITS})`
            }));
          }

          // Re-enter fullscreen
          enterFullscreen();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  };

  const enterFullscreen = () => {
    const elem = containerRef.current || document.documentElement;
    
    try {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen request failed:', error);
      toast.error('Unable to enter fullscreen mode');
    }
  };

  const exitFullscreen = () => {
    // Only exit if actually in fullscreen
    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
      return; // Not in fullscreen, nothing to do
    }

    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } catch (error) {
      console.error('Exit fullscreen failed:', error);
    }
  };

  const addIntegrityFlag = (type, description) => {
    const flag = { type, description, timestamp: new Date().toISOString() };
    setIntegrityFlags(prev => {
      // Avoid duplicate flags within 5 seconds
      const recent = prev.filter(f => 
        f.type === type && 
        new Date() - new Date(f.timestamp) < 5000
      );
      if (recent.length === 0) {
        return [...prev, flag];
      }
      return prev;
    });
  };

  const initializeWebSocket = () => {
    const wsUrl = process.env.REACT_APP_BACKEND_URL.replace('http', 'ws') + `/api/interview/${id}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      toast.success('Connected to AI interviewer');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'ai_message') {
        setAiMessage(data.content);
        setTranscript(prev => [...prev, { speaker: 'AI', message: data.content, time: formatTime(timeElapsed) }]);
        
        // Speak the message
        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(data.content);
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        }
      } else if (data.type === 'evaluation') {
        navigate(`/evaluation/${id}`);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Connection error');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };
    
    wsRef.current = ws;
  };

  const sendCandidateResponse = () => {
    if (!candidateResponse.trim() || !wsRef.current) return;
    
    const response = candidateResponse.trim();
    
    // Add to transcript
    setTranscript(prev => [...prev, { speaker: 'Candidate', message: response, time: formatTime(timeElapsed) }]);
    
    // Send to backend
    wsRef.current.send(JSON.stringify({ 
      type: 'candidate_response',
      content: response 
    }));
    
    // Clear input
    setCandidateResponse('');
    toast.success('Response sent');
  };

  const handleStartInterview = async () => {
    try {
      await startInterview(id);
      setInterviewStarted(true);
      initializeWebSocket();
      
      // Enter fullscreen
      enterFullscreen();
      
      toast.success('Interview started in secure mode');
      toast.info('⚠️ Do not exit fullscreen during the interview!');
    } catch (error) {
      toast.error('Failed to start interview');
    }
  };

  const handleEndInterview = async (integrityViolation = false) => {
    try {
      // Stop voice recognition
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }

      // Send end message
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ 
          type: 'end_interview',
          integrity_violation: integrityViolation,
          fullscreen_exits: fullscreenExits
        }));
      }
      
      await endInterview(id);
      
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Exit fullscreen
      exitFullscreen();
      
      if (integrityViolation) {
        toast.error('Interview ended due to integrity violation');
      } else {
        toast.success('Interview completed');
      }
      
      setTimeout(() => navigate(`/evaluation/${id}`), 1500);
    } catch (error) {
      toast.error('Failed to end interview');
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks()[0].enabled = !videoEnabled;
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks()[0].enabled = !audioEnabled;
      setAudioEnabled(!audioEnabled);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (cameraRef.current) {
      cameraRef.current.stop();
    }
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    exitFullscreen();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => INTERVIEW_DURATION - timeElapsed;

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Live Interview</h1>
            <p className="text-slate-400 font-mono text-sm">Interview ID: {id}</p>
            {fullscreenExits > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="destructive" className="animate-pulse">
                  ⚠️ Fullscreen Exits: {fullscreenExits}/{MAX_FULLSCREEN_EXITS}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Timer */}
            <Card className="bg-slate-800 border-slate-700 px-4 py-2">
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5" />
                <span className="font-mono text-xl">{formatTime(getRemainingTime())}</span>
              </div>
            </Card>
            
            {/* Integrity Status */}
            <Card className="bg-slate-800 border-slate-700 px-4 py-2" data-testid="integrity-status">
              <div className="flex items-center gap-2">
                {integrityFlags.length === 0 ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-emerald-500 font-medium">All Clear</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="text-amber-500 font-medium">{integrityFlags.length} Flags</span>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-black border-slate-700 overflow-hidden" data-testid="video-container">
              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  data-testid="video-feed"
                />
                
                {/* Face Detection Indicator */}
                <div className="absolute top-4 right-4">
                  <Badge className={faceDetected ? 'bg-emerald-500' : 'bg-rose-500'}>
                    {faceDetected ? 'Face Detected' : 'No Face'}
                  </Badge>
                </div>

                {/* Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      size="lg"
                      variant={videoEnabled ? 'default' : 'destructive'}
                      onClick={toggleVideo}
                      className="rounded-full w-14 h-14"
                      data-testid="toggle-video-btn"
                    >
                      {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                    </Button>
                    <Button
                      size="lg"
                      variant={audioEnabled ? 'default' : 'destructive'}
                      onClick={toggleAudio}
                      className="rounded-full w-14 h-14"
                      data-testid="toggle-audio-btn"
                    >
                      {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* AI Question Display */}
            {aiMessage && (
              <Card className="bg-slate-800 border-slate-700 p-6" data-testid="ai-question-display">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">AI</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-lg leading-relaxed">{aiMessage}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Candidate Response Input */}
            {interviewStarted && (
              <Card className="bg-slate-800 border-slate-700 p-6" data-testid="response-input-card">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">You</span>
                    </div>
                    <div className="flex-1">
                      <div className="relative">
                        <Textarea
                          value={candidateResponse}
                          onChange={(e) => setCandidateResponse(e.target.value)}
                          placeholder="Speak or type your response here..."
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 min-h-[100px]"
                          data-testid="candidate-response-input"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              sendCandidateResponse();
                            }
                          }}
                        />
                        {recognitionActive && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-red-500 animate-pulse">
                              🎤 Recording...
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={toggleVoiceInput}
                            variant={isListening ? "destructive" : "secondary"}
                            size="sm"
                            className="gap-2"
                            data-testid="voice-input-btn"
                          >
                            <Mic className="w-4 h-4" />
                            {isListening ? 'Stop Voice' : 'Start Voice'}
                          </Button>
                          <span className="text-xs text-slate-400">or press Ctrl+Enter to send</span>
                        </div>
                        <Button
                          onClick={sendCandidateResponse}
                          disabled={!candidateResponse.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700"
                          data-testid="send-response-btn"
                        >
                          Send Response
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Start/End Button */}
            {!interviewStarted ? (
              <Button
                size="lg"
                onClick={handleStartInterview}
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg"
                data-testid="start-interview-btn"
              >
                Start Interview
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleEndInterview}
                variant="destructive"
                className="w-full h-14 text-lg"
                data-testid="end-interview-btn"
              >
                End Interview
              </Button>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Transcript */}
            <Card className="bg-slate-800 border-slate-700" data-testid="transcript-card">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-bold text-white">Interview Transcript</h3>
              </div>
              <div className="p-4 h-80 overflow-y-auto space-y-3">
                {transcript.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">Transcript will appear here...</p>
                ) : (
                  transcript.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">{item.time}</span>
                        <Badge variant="outline" className="text-xs">{item.speaker}</Badge>
                      </div>
                      <p className="text-sm text-slate-300">{item.message}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Integrity Flags */}
            <Card className="bg-slate-800 border-slate-700" data-testid="integrity-flags-card">
              <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-bold text-white">Integrity Monitoring</h3>
              </div>
              <div className="p-4 h-64 overflow-y-auto space-y-2">
                {integrityFlags.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No issues detected</p>
                  </div>
                ) : (
                  integrityFlags.map((flag, idx) => (
                    <div key={idx} className="flex gap-2 items-start p-2 bg-amber-500/10 rounded border border-amber-500/20">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-xs font-mono text-slate-500">
                          {new Date(flag.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-sm text-amber-200">{flag.description}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}