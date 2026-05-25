import { apiClient } from "@/lib/api";
import type { AiAnalysis, AiAnalysisListResponse } from "@/lib/types";

export const aiAnalysisApi = {
  getById: (id: string) =>
    apiClient.get<AiAnalysis>(`/api/ai-actions/analysis/${id}`),

  listForSource: (source_type: string, source_id: string, analysis_type?: string) => {
    const p = new URLSearchParams({ source_type, source_id });
    if (analysis_type) p.set("analysis_type", analysis_type);
    return apiClient.get<AiAnalysis[]>(`/api/ai-actions/analysis?${p}`);
  },

  listForServer: (server_id: string, analysis_type?: string) => {
    const p = new URLSearchParams({ server_id });
    if (analysis_type) p.set("analysis_type", analysis_type);
    return apiClient.get<AiAnalysis[]>(`/api/ai-actions/analysis?${p}`);
  },

  // Paginated list — passing `page` flips the backend into the paginated shape
  // and enriches each row with `server_hostname`.
  list: (filters?: {
    analysis_type?: string;
    source_type?: string;
    server_id?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    page_size?: number;
  }) => {
    const p = new URLSearchParams();
    if (filters?.analysis_type && filters.analysis_type !== "all") p.set("analysis_type", filters.analysis_type);
    if (filters?.source_type && filters.source_type !== "all") p.set("source_type", filters.source_type);
    if (filters?.server_id) p.set("server_id", filters.server_id);
    if (filters?.from_date) p.set("from_date", filters.from_date);
    if (filters?.to_date) p.set("to_date", filters.to_date);
    p.set("page", String(filters?.page ?? 1));
    p.set("page_size", String(filters?.page_size ?? 25));
    return apiClient.get<AiAnalysisListResponse>(`/api/ai-actions/analysis?${p.toString()}`);
  },
};
