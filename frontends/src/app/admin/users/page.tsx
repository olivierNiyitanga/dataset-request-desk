'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateUserMutation, useGetUsersQuery, useUpdateUserActiveMutation, useUpdateUserRoleMutation, type UserRole as BackendUserRole } from '@/lib/redux/slices/UserSlice';

type UserRole = 'Admin' | 'Operator' | 'Client';
type UserStatus = 'Active' | 'Inactive';

interface PlatformUser {
    id: number;
    name: string;
    email: string;
    organization: string;
    role: UserRole;
    status: UserStatus;
    lastActive: string;
}

export default function AdminUsersPage() {
    const { data: backendUsers, isLoading, isError } = useGetUsersQuery();
    const [createUserRequest, { isLoading: isCreating }] = useCreateUserMutation();
    const [updateUserRole] = useUpdateUserRoleMutation();
    const [updateUserActive] = useUpdateUserActiveMutation();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All roles');
    const [statusFilter, setStatusFilter] = useState('All status');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', organization: '', password: '', role: 'Client' as UserRole });
    const users: PlatformUser[] = (backendUsers ?? []).map((user) => ({
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        organization: user.organisation || '—',
        role: `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` as UserRole,
        status: user.is_active ? 'Active' : 'Inactive',
        lastActive: new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));
    const visibleUsers = useMemo(() => users.filter((user) => `${user.name} ${user.email} ${user.organization}`.toLowerCase().includes(search.trim().toLowerCase()) && (roleFilter === 'All roles' || user.role === roleFilter) && (statusFilter === 'All status' || user.status === statusFilter)), [users, search, roleFilter, statusFilter]);

    const createUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            await createUserRequest({ email: newUser.email, password: newUser.password, name: newUser.name, organisation: newUser.organization, role: newUser.role.toLowerCase() as BackendUserRole }).unwrap();
            toast.success('User created successfully.');
            setNewUser({ name: '', email: '', organization: '', password: '', role: 'Client' });
            setIsCreateOpen(false);
        } catch {
            toast.error('Unable to create user.');
        }
    };

    const updateUser = async (userId: number, update: Partial<PlatformUser>) => {
        try {
            if (update.role) await updateUserRole({ userId, role: update.role.toLowerCase() as BackendUserRole }).unwrap();
            if (update.status) await updateUserActive({ userId, is_active: update.status === 'Active' }).unwrap();
        } catch {
            toast.error('Unable to update user.');
        }
    };

    if (isLoading) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-slate-500">Loading users...</div>;
    if (isError) return <div className="mx-auto max-w-[1440px] px-5 py-6 text-xs text-rose-600">Unable to load users.</div>;

    return (
        <div className="mx-auto min-h-[calc(100vh-54px)] max-w-[1440px] px-5 py-6 sm:px-6 lg:px-[26px]">
            <div className="mb-5 flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-950">User Management</h2><p className="mt-1 text-[10px] text-slate-500">Create, deactivate, and manage roles for platform users.</p></div><button type="button" onClick={() => setIsCreateOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-slate-900 px-3 text-[9px] font-semibold text-white hover:bg-slate-700"><Plus size={12} /> Create User</button></div>

            <section className="mb-3 flex flex-col gap-2 rounded-[10px] border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                <label className="flex h-[34px] min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-slate-200 px-2.5"><Search size={13} className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." aria-label="Search users" className="min-w-0 flex-1 border-0 bg-transparent text-[9px] outline-none placeholder:text-slate-400" /></label>
                <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role" className="h-[34px] rounded-[8px] border border-slate-200 bg-white px-2.5 text-[9px]"><option>All roles</option><option>Admin</option><option>Operator</option><option>Client</option></select>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status" className="h-[34px] rounded-[8px] border border-slate-200 bg-white px-2.5 text-[9px]"><option>All status</option><option>Active</option><option>Inactive</option></select>
            </section>

            <section className="overflow-x-auto rounded-[11px] border border-slate-200 bg-white"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50"><tr>{['User', 'Organisation', 'Role', 'Status', 'Last Active', 'Action'].map((label) => <th key={label} className="px-4 py-3 text-[8px] font-medium uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>
                {visibleUsers.map((user) => <tr key={user.id} className="border-t border-slate-100 text-[9px] text-slate-700"><td className="px-4 py-3"><p className="font-semibold text-slate-900">{user.name}</p><p className="mt-0.5 text-[8px] text-slate-500">{user.email}</p></td><td className="px-4 py-3.5">{user.organization}</td><td className="px-4 py-3.5">{editingId === user.id ? <select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value as UserRole })} aria-label={`Role for ${user.name}`} className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[8px]"><option>Admin</option><option>Operator</option><option>Client</option></select> : <span className={`rounded-full px-2 py-1 text-[8px] font-medium ${user.role === 'Admin' ? 'bg-violet-50 text-violet-700' : user.role === 'Operator' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{user.role}</span>}</td><td className="px-4 py-3.5">{editingId === user.id ? <select value={user.status} onChange={(event) => updateUser(user.id, { status: event.target.value as UserStatus })} aria-label={`Status for ${user.name}`} className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[8px]"><option>Active</option><option>Inactive</option></select> : <span className={`rounded-full px-2 py-1 text-[8px] font-medium ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{user.status}</span>}</td><td className="px-4 py-3.5">{user.lastActive}</td><td className="px-4 py-3.5 text-right"><button type="button" onClick={() => setEditingId(editingId === user.id ? null : user.id)} className="font-medium text-slate-900 hover:text-blue-600">{editingId === user.id ? 'Done' : 'Edit'}</button></td></tr>)}
                {visibleUsers.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[9px] text-slate-500">No users match these filters.</td></tr>}
            </tbody></table></section>

            {isCreateOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="create-user-title" className="w-full max-w-[440px] rounded-[14px] border border-slate-200 bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h3 id="create-user-title" className="text-[13px] font-semibold text-slate-900">Create User</h3><p className="mt-1 text-[9px] text-slate-500">Add a platform account and assign a role.</p></div><button type="button" aria-label="Close" onClick={() => setIsCreateOpen(false)} className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100"><X size={15} /></button></header><form onSubmit={createUser} className="space-y-3.5 p-5"><label className="block text-[9px] font-medium text-slate-700">Name<input required value={newUser.name} onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))} className="mt-1 block h-9 w-full rounded-[7px] border border-slate-200 px-2.5 text-[10px] outline-none focus:border-blue-500" /></label><label className="block text-[9px] font-medium text-slate-700">Email<input required type="email" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} className="mt-1 block h-9 w-full rounded-[7px] border border-slate-200 px-2.5 text-[10px] outline-none focus:border-blue-500" /></label><label className="block text-[9px] font-medium text-slate-700">Password<input required minLength={8} type="password" value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} className="mt-1 block h-9 w-full rounded-[7px] border border-slate-200 px-2.5 text-[10px] outline-none focus:border-blue-500" /></label><label className="block text-[9px] font-medium text-slate-700">Organisation<input required value={newUser.organization} onChange={(event) => setNewUser((current) => ({ ...current, organization: event.target.value }))} className="mt-1 block h-9 w-full rounded-[7px] border border-slate-200 px-2.5 text-[10px] outline-none focus:border-blue-500" /></label><label className="block text-[9px] font-medium text-slate-700">Role<select value={newUser.role} onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as UserRole }))} className="mt-1 block h-9 w-full rounded-[7px] border border-slate-200 bg-white px-2.5 text-[10px]"><option>Client</option><option>Operator</option><option>Admin</option></select></label><div className="flex justify-end gap-2 pt-1"><button type="button" onClick={() => setIsCreateOpen(false)} className="h-8 rounded-[7px] border border-slate-200 px-3 text-[9px] font-medium">Cancel</button><button type="submit" disabled={isCreating} className="h-8 rounded-[7px] bg-slate-900 px-3 text-[9px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{isCreating ? 'Creating...' : 'Create User'}</button></div></form></section></div>}
        </div>
    );
}