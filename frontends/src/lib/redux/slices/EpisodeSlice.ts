import { apiSlice } from "./ApiSlice";

export type EpisodeQuality = "good" | "usable" | "bad";
export interface Episode {
    id: number;
    episode_id: string;
    robot_id: string | null;
    task_name: string | null;
    recorded_at: string | null;
    duration_seconds: number | null;
    operator_name: string | null;
    quality: EpisodeQuality | null;
    assignment: { id: number; request_id: number; assigned_at: string; assigned_by: number } | null;
}
export interface EpisodeListResponse { items: Episode[]; page: number; page_size: number; total: number; pages: number }
export interface EpisodeFilters { page?: number; page_size?: number; task?: string; task_name?: string; quality?: EpisodeQuality; robot_id?: string; unassigned_only?: boolean; assignable_only?: boolean }

const episodeApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getEpisodes: builder.query<EpisodeListResponse, EpisodeFilters | void>({
            query: (filters) => ({ url: "episodes", params: filters ?? {} }),
            providesTags: ["Episode"],
        }),
        getEpisodeTaskNames: builder.query<string[], void>({
            query: () => "episodes/tasks",
            providesTags: ["Episode"],
        }),
        getEpisode: builder.query<Episode, number>({ query: (episodeId) => `episodes/${episodeId}`, providesTags: ["Episode"] }),
        importEpisodes: builder.mutation<ImportReport, File>({
            query: (file) => { const body = new FormData(); body.append("file", file); return { url: "episodes/import", method: "POST", body }; },
            invalidatesTags: ["Episode"],
        }),
    }),
});

export interface ImportReport {
    filename: string;
    total_rows: number;
    imported: number;
    skipped: number;
    summary: Record<string, number>;
    errors: Array<{ row: number; episode_id: string | null; reason: string }>;
}

export const getImportReportSummary = (report: ImportReport) => {
    const alreadyExisting = report.summary.duplicate_episode_id ?? 0;
    const duplicatesInsideFile = report.summary.duplicate_episode_id_in_file ?? 0;

    return {
        rowsProcessed: report.total_rows,
        newEpisodesImported: report.imported,
        alreadyExisting,
        duplicatesInsideFile,
        invalidRows: Math.max(0, report.skipped - alreadyExisting - duplicatesInsideFile),
    };
};

export const isDuplicateImportError = (reason: string) =>
    reason === "duplicate_episode_id" || reason === "duplicate_episode_id_in_file";

export const { useGetEpisodesQuery, useGetEpisodeQuery, useGetEpisodeTaskNamesQuery, useImportEpisodesMutation } = episodeApi;
