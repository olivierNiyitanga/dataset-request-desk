import { apiSlice } from "./ApiSlice";

export interface Assignment { id: number; request_id: number; episode_id: number; assigned_at: string; assigned_by: number; episode: Record<string, unknown> }
export interface AssignmentListResponse { items: Assignment[]; page: number; page_size: number; total: number; pages: number }
export interface AssignmentBatchResponse { request_id: number; assigned_count: number; episodes_requested: number; assigned_episode_ids: number[] }

const assignmentApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getAssignments: builder.query<AssignmentListResponse, { requestId: number; page?: number; page_size?: number }>({ query: ({ requestId, ...params }) => ({ url: `requests/${requestId}/assignments`, params }), providesTags: ["Assignment"] }),
        assignEpisodes: builder.mutation<AssignmentBatchResponse, { requestId: number; episode_ids: number[] }>({ query: ({ requestId, episode_ids }) => ({ url: `requests/${requestId}/assignments`, method: "POST", body: { episode_ids } }), invalidatesTags: ["Assignment", "Request", "Episode"] }),
        removeAssignment: builder.mutation<void, { requestId: number; episodeId: number }>({ query: ({ requestId, episodeId }) => ({ url: `requests/${requestId}/assignments/${episodeId}`, method: "DELETE" }), invalidatesTags: ["Assignment", "Request", "Episode"] }),
    }),
});

export const { useGetAssignmentsQuery, useAssignEpisodesMutation, useRemoveAssignmentMutation } = assignmentApi;