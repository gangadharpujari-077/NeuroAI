import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const uploadJD = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload/job-description', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const setupInterview = async (data) => {
  const response = await api.post('/interview/setup', data);
  return response.data;
};

export const getInterview = async (id) => {
  const response = await api.get(`/interview/${id}`);
  return response.data;
};

export const startInterview = async (id) => {
  const response = await api.post(`/interview/${id}/start`);
  return response.data;
};

export const endInterview = async (id) => {
  const response = await api.post(`/interview/${id}/end`);
  return response.data;
};

export const getInterviews = async () => {
  const response = await api.get('/interviews');
  return response.data;
};