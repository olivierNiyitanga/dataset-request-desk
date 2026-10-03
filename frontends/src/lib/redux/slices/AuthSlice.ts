import { apiSlice } from "./ApiSlice";

export interface AuthUser {
    id: number;
    email: string;
    name: string | null;
    organisation: string | null;
    role: "admin" | "operator" | "client";
    is_active: boolean;
    created_at: string;
}

const authApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getCurrentUser: builder.query<AuthUser, void>({ query: () => "auth/me", providesTags: ["User"] }),
        getClientRoleCheck: builder.query<AuthUser, void>({ query: () => "auth/role-check/client" }),
        getOperatorRoleCheck: builder.query<AuthUser, void>({ query: () => "auth/role-check/operator" }),
        getAdminRoleCheck: builder.query<AuthUser, void>({ query: () => "auth/role-check/admin" }),
        getOperatorOrAdminRoleCheck: builder.query<AuthUser, void>({ query: () => "auth/role-check/operator-or-admin" }),
    }),
});

export const {
    useGetCurrentUserQuery,
    useLazyGetCurrentUserQuery,
    useGetClientRoleCheckQuery,
    useGetOperatorRoleCheckQuery,
    useGetAdminRoleCheckQuery,
    useGetOperatorOrAdminRoleCheckQuery,
} = authApi;