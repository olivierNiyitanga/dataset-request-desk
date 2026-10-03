import { apiSlice } from "./ApiSlice";

export interface AnalyticsResponse { date_range: { from_date: string; to_date: string }; episodes_per_day_per_robot: Array<{ date: string; robot_id: string | null; count: number }>; requests_by_status: Array<{ status: string; count: number }>; median_submitted_to_delivered_seconds: number | null; top_good_tasks: Array<{ task_name: string; count: number }> }
const analyticsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getAnalytics: builder.query<AnalyticsResponse, { from_date: string; to_date: string }>({ query: (params) => ({ url: "analytics", params }), providesTags: ["Analytics"] }),
    }),
});
export const { useGetAnalyticsQuery } = analyticsApi;