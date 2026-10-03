import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getSession } from "next-auth/react";

export const apiSlice = createApi({
    reducerPath: "api",
    baseQuery: fetchBaseQuery({
        baseUrl: `${(
            process.env.NEXT_PUBLIC_API_URL ||
            (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "")
        ).replace(/\/$/, "")}/api`,
        prepareHeaders: async (headers) => {
            const session = await getSession();
            if (session?.user.token) {
                headers.set("Authorization", `Bearer ${session.user.token}`);
            }
            return headers;
        },
    }),
    tagTypes: ["User", "Request", "Episode", "Assignment", "Analytics"],
    endpoints: () => ({}),
});
