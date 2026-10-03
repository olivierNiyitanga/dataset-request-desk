import { apiSlice } from "./ApiSlice";
import type { AuthUser } from "./AuthSlice";

export type RequestStatus = "submitted" | "accepted" | "rejected" | "in_progress" | "delivered";
export interface DatasetRequest {
    id: number; client: AuthUser; task_name: string; episodes_requested: number; deadline: string; notes: string | null;
    rejection_reason: string | null; status: RequestStatus; created_at: string; updated_at: string;
    assigned_episode_count: number; status_history: Array<{ id: number; old_status: RequestStatus; new_status: RequestStatus; changed_by: number; changed_at: string }>;
}
export interface RequestListResponse { items: DatasetRequest[]; page: number; page_size: number; total: number; pages: number }
export interface RequestFilters { page?: number; page_size?: number; status?: RequestStatus; task_name?: string }

const requestApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getRequests: builder.query<RequestListResponse, RequestFilters | void>({ query: (filters) => ({ url: "requests", params: filters ?? {} }), providesTags: ["Request"] }),
        getRequest: builder.query<DatasetRequest, number>({ query: (requestId) => `requests/${requestId}`, providesTags: ["Request"] }),
        createRequest: builder.mutation<DatasetRequest, { task_name: string; episodes_requested: number; deadline: string; notes?: string | null }>({ query: (body) => ({ url: "requests", method: "POST", body }), invalidatesTags: ["Request"] }),
        updateRequestStatus: builder.mutation<DatasetRequest, { requestId: number; status: RequestStatus }>({ query: ({ requestId, status }) => ({ url: `requests/${requestId}/status`, method: "PATCH", body: { status } }), invalidatesTags: ["Request"] }),
        acceptRequest: builder.mutation<DatasetRequest, number>({ query: (requestId) => ({ url: `requests/${requestId}/accept`, method: "POST" }), invalidatesTags: ["Request"] }),
        rejectRequest: builder.mutation<DatasetRequest, { requestId: number; reason: string }>({ query: ({ requestId, reason }) => ({ url: `requests/${requestId}/reject`, method: "POST", body: { reason } }), invalidatesTags: ["Request"] }),
    }),
});

export const { useGetRequestsQuery, useGetRequestQuery, useCreateRequestMutation, useUpdateRequestStatusMutation, useAcceptRequestMutation, useRejectRequestMutation } = requestApi;