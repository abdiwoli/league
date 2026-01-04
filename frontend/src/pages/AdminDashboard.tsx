import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, RefreshCw, Save } from 'lucide-react';
import React, { useState } from 'react';
import api from '../lib/api';

export const AdminDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [newTeam, setNewTeam] = useState('');

    // Queries
    const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/teams').then(r => r.data) });
    const { data: matches } = useQuery({ queryKey: ['matches'], queryFn: () => api.get('/matches').then(r => r.data) });

    // Mutations
    const createTeam = useMutation({
        mutationFn: (name: string) => api.post('/teams', { name }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
    });

    const generateSchedule = useMutation({
        mutationFn: () => api.post('/matches/schedule'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['league-table'] });
        }
    });

    const clearLeague = useMutation({
        mutationFn: () => api.delete('/matches'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['league-table'] });
        }
    });

    const updateResult = useMutation({
        mutationFn: (data: any) => api.patch(`/matches/${data.id}`, { homeScore: data.h, awayScore: data.a }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['league-table'] });
        }
    });

    // Local state for editing matches
    const [editingScores, setEditingScores] = useState<Record<string, { h: number, a: number }>>({});

    const handleScoreChange = (matchId: string, type: 'h' | 'a', val: string) => {
        const num = parseInt(val) || 0;
        setEditingScores(prev => ({
            ...prev,
            [matchId]: { ...prev[matchId], [type]: num }
        }));
    };

    const saveScore = (matchId: string) => {
        const scores = editingScores[matchId];
        if (scores) {
            updateResult.mutate({ id: matchId, h: scores.h, a: scores.a });
            // Clear edit state
            const next = { ...editingScores };
            delete next[matchId];
            setEditingScores(next);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">Admin Dashboard</h1>
                <div className="space-x-2">
                    <button
                        onClick={() => { if (confirm('Reset all matches?')) clearLeague.mutate(); }}
                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
                    >
                        Reset League
                    </button>
                    <button
                        onClick={() => generateSchedule.mutate()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-md text-sm font-medium transition-all flex items-center inline-flex"
                    >
                        <Calendar size={16} className="mr-2" /> Generate Schedule
                    </button>
                </div>
            </div>

            {/* Team Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass p-6 rounded-2xl">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Plus size={18} className="mr-2 text-primary-500" /> Manage Teams
                    </h2>

                    <div className="flex gap-2 mb-6">
                        <input
                            value={newTeam}
                            onChange={e => setNewTeam(e.target.value)}
                            placeholder="Enter team name..."
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-500 outline-none"
                            disabled={teams?.length >= 4}
                        />
                        <button
                            onClick={() => { if (newTeam) { createTeam.mutate(newTeam); setNewTeam(''); } }}
                            disabled={!newTeam || teams?.length >= 4}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-50"
                        >
                            Add
                        </button>
                    </div>

                    <div className="space-y-2">
                        {teams?.map((t: any) => (
                            <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <span className="font-medium">{t.name}</span>
                                <span className="text-xs text-gray-400 font-mono">{t.id.slice(0, 6)}...</span>
                            </div>
                        ))}
                        {teams?.length === 0 && <p className="text-gray-400 text-sm text-center">No teams yet.</p>}
                    </div>
                </div>

                {/* Recent Matches / Quick Edit */}
                <div className="glass p-6 rounded-2xl">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <RefreshCw size={18} className="mr-2 text-primary-500" /> Enter Results
                    </h2>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {matches?.filter((m: any) => m.status !== 'PLAYED' || editingScores[m.id]).slice(0, 10).map((m: any) => (
                            <div key={m.id} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                <div className="flex justify-between text-xs text-gray-500 mb-2">
                                    <span>MD {m.matchday}</span>
                                    <span>{m.status}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 text-right text-sm font-medium">{m.homeTeam.name}</div>

                                    <div className="flex items-center gap-1">
                                        <input
                                            className="w-10 h-8 text-center border rounded bg-gray-50 font-bold"
                                            type="number"
                                            value={editingScores[m.id]?.h ?? m.homeScore ?? ''}
                                            onChange={e => handleScoreChange(m.id, 'h', e.target.value)}
                                            placeholder="-"
                                        />
                                        <span className="text-gray-400">:</span>
                                        <input
                                            className="w-10 h-8 text-center border rounded bg-gray-50 font-bold"
                                            type="number"
                                            value={editingScores[m.id]?.a ?? m.awayScore ?? ''}
                                            onChange={e => handleScoreChange(m.id, 'a', e.target.value)}
                                            placeholder="-"
                                        />
                                    </div>

                                    <div className="flex-1 text-left text-sm font-medium">{m.awayTeam.name}</div>

                                    {(editingScores[m.id] !== undefined) && (
                                        <button onClick={() => saveScore(m.id)} className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600">
                                            <Save size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(!matches || matches.length === 0) && <p className="text-gray-400 text-sm text-center">No matches to edit.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};
