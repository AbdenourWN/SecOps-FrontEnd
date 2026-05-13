import { apiClient } from "@/lib/api";
import type { AiAnalysis } from "@/lib/types";

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
};
