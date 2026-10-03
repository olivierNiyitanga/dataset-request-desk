import { apiSlice } from "./ApiSlice";

const healthApi = apiSlice.injectEndpoints({ endpoints: (builder) => ({ getHealth: builder.query<{ status: "ok" | "unhealthy" }, void>({ query: () => ({ url: "../health", responseHandler: "json" }) }) }) });
export const { useGetHealthQuery } = healthApi;