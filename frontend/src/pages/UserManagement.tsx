import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Loader2, Shield, Trash2, UserCheck } from 'lucide-react';
import React from 'react';
import api from '../lib/api';

interface User {
    id: string;
    email: string;
    role: 'ADMIN' | 'VIEWER';
    isBlocked: boolean;
}

export const UserManagement: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: () => api.get('/auth/users').then(res => res.data),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
            api.put(`/auth/users/${id}`, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/auth/users/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary-500" /></div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            </div>

            <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users?.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                        }`}>
                                        {user.isBlocked ? 'Blocked' : 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium space-x-3">
                                    <button
                                        onClick={() => updateMutation.mutate({
                                            id: user.id,
                                            data: { role: user.role === 'ADMIN' ? 'VIEWER' : 'ADMIN' }
                                        })}
                                        className="text-primary-600 hover:text-primary-900 transition-colors"
                                        title={user.role === 'ADMIN' ? 'Demote to Viewer' : 'Promote to Admin'}
                                    >
                                        <Shield size={18} />
                                    </button>
                                    <button
                                        onClick={() => updateMutation.mutate({
                                            id: user.id,
                                            data: { isBlocked: !user.isBlocked }
                                        })}
                                        className={user.isBlocked ? "text-green-600 hover:text-green-900" : "text-amber-600 hover:text-amber-900"}
                                        title={user.isBlocked ? 'Unblock User' : 'Block User'}
                                    >
                                        {user.isBlocked ? <UserCheck size={18} /> : <Ban size={18} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this user?')) {
                                                deleteMutation.mutate(user.id);
                                            }
                                        }}
                                        className="text-red-600 hover:text-red-900 transition-colors"
                                        title="Delete User"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
