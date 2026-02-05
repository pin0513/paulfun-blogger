import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse<unknown>>) => {
        if (error.response?.status === 401) {
          this.clearToken();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.accessToken = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", token);
    }
  }

  clearToken() {
    this.accessToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
  }

  initializeToken() {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        this.accessToken = token;
      }
    }
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  async upload<T>(url: string, file: File, fieldName = "file"): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await this.client.post<T>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
