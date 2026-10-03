import { apiSlice } from "./ApiSlice";
import type { AuthUser } from "./AuthSlice";

export type UserRole = AuthUser["role"];
export interface CreateUserRequest {
    email: string;
    password: string;
    role: UserRole;
    name?: string | null;
    organisation?: string | null;
}

const userApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getUsers: builder.query<AuthUser[], void>({ query: () => "users", providesTags: ["User"] }),
        createUser: builder.mutation<AuthUser, CreateUserRequest>({
            query: (body) => ({ url: "users", method: "POST", body }),
            invalidatesTags: ["User"],
        }),
        updateUserRole: builder.mutation<AuthUser, { userId: number; role: UserRole }>({
            query: ({ userId, role }) => ({ url: `users/${userId}/role`, method: "PATCH", body: { role } }),
            invalidatesTags: ["User"],
        }),
        updateUserActive: builder.mutation<AuthUser, { userId: number; is_active: boolean }>({
            query: ({ userId, is_active }) => ({ url: `users/${userId}/active`, method: "PATCH", body: { is_active } }),
            invalidatesTags: ["User"],
        }),
    }),
});

export const { useGetUsersQuery, useCreateUserMutation, useUpdateUserRoleMutation, useUpdateUserActiveMutation } = userApi;