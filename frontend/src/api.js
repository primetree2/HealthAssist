import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// 1. Get or create a unique Session ID for this browser tab
let sessionId = sessionStorage.getItem('sessionId');
if (!sessionId) {
  sessionId = uuidv4();
  sessionStorage.setItem('sessionId', sessionId);
}

// 2. Create a central axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
});

// 3. Automatically add the Session ID to every request header
apiClient.interceptors.request.use(config => {
  config.headers['X-Session-ID'] = sessionId;
  return config;
});

export default apiClient;