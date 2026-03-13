import axios from 'axios';
import { getCreds, setCreds, resetCreds } from './keychainFunctions.js';
import { assets } from '../assets.js';
import { authEvents } from './authEvents.js';

const { url } = assets;

const axiosAuthGuard = axios.create({
  baseURL: url,
  timeout: 300000,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosAuthGuard.interceptors.request.use(
  async (config) => {
    const creds = await getCreds();
    if (creds && creds.accessToken) {
      config.headers.Authorization = `Bearer ${creds.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosAuthGuard.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount >= 3) {
          return Promise.reject(error);
      }
      originalRequest._retryCount += 1;
      const delay = new Promise(resolve => setTimeout(resolve, 5000));
      return delay.then(() => axiosAuthGuard(originalRequest));
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosAuthGuard(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }


      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const creds = await getCreds(); 
        if (!creds?.refreshToken) {
            throw new Error("No refresh token");
        }


        const res = await axios.post(`${url}/api/user/refresh`, {
          refreshToken: creds.refreshToken
        });

        if (res.data.success) {
          const { newAccessToken, newRefreshToken } = res.data;

          await setCreds({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          });

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          

          processQueue(null, newAccessToken);

          return axiosAuthGuard(originalRequest);
        } else {
          throw new Error("Refresh failed: success false");
        }
      } catch (refreshError) {

        processQueue(refreshError, null);
        await resetCreds();
        authEvents.emit('FORCE_RELOAD');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    } else if (error.response?.status === 401 && originalRequest._retry) {
      await resetCreds();
      authEvents.emit('FORCE_RELOAD');
    }

    return Promise.reject(error);
  }
);

export default axiosAuthGuard;


/*import axios from 'axios';
import { getCreds, setCreds, resetCreds } from './keychainFunctions.js';
import {assets} from '../assets.js';
import {authEvents} from './authEvents.js';

const {url} = assets;

const axiosAuthGuard = axios.create({
  baseURL: url,
  timeout: 10000,
});

axiosAuthGuard.interceptors.request.use(
  async (config) => {
    const creds = await getCreds();
    if (creds && creds.accessToken) {
      config.headers.Authorization = `Bearer ${creds.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


axiosAuthGuard.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      // Inițializăm contorul
      originalRequest._retryCount = originalRequest._retryCount || 0;

      // Limita de 3 încercări
      if (originalRequest._retryCount >= 3) {
          return Promise.reject(error);
      }

      // Incrementăm
      originalRequest._retryCount += 1;

      // Așteptăm 5 secunde
      const delay = new Promise(resolve => setTimeout(resolve, 5000));

      // Reîncercăm
      return delay.then(() => axiosAuthGuard(originalRequest));
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const creds = await getCreds(); 
        if (!creds?.refreshToken) {
            await resetCreds();
            authEvents.emit('FORCE_RELOAD');
            throw new Error("No refresh token");
        }

        const res = await axios.post(`${url}/api/user/refresh`, {
          refreshToken: creds.refreshToken
        });
        

        if (res.data.success) {
          const { newAccessToken, newRefreshToken } = res.data;

          await setCreds({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          });

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosAuthGuard(originalRequest);
        }
      } catch (refreshError) {
        await resetCreds();
        authEvents.emit('FORCE_RELOAD');
        return Promise.reject(refreshError);
      }
    } else if(error.response?.status === 401 && originalRequest._retry){
      await resetCreds();
      authEvents.emit('FORCE_RELOAD');
    }

    return Promise.reject(error);
  }
);

export default axiosAuthGuard;*/