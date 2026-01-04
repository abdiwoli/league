import { useMutation } from '@tanstack/react-query';
import { Check, Loader2, Lock } from 'lucide-react';
import React, { useState } from 'react';
import api from '../lib/api';

export const ProfileSettings: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const mutation = useMutation({
        mutationFn: (data: any) => api.post('/auth/change-password', data),
        onSuccess: () => {
            setSuccess('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setError('');
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Error updating password');
            setSuccess('');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        mutation.mutate({ currentPassword, newPassword });
    };

    return (
        <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>

            <div className="glass p-8 rounded-2xl space-y-6">
                <div className="flex items-center space-x-4 pb-6 border-b border-gray-100">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <Lock size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">Change Password</h2>
                        <p className="text-gray-500 text-sm">Ensure your account is using a long, random password to stay secure.</p>
                    </div>
                </div>

                {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">⚠️ {error}</div>}
                {success && <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm flex items-center">
                    <Check size={18} className="mr-2" /> {success}
                </div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Current Password</label>
                        <input
                            type="password"
                            required
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">New Password</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-primary-500/30 active:scale-[0.98] transition-all disabled:opacity-70 flex justify-center items-center"
                    >
                        {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};
