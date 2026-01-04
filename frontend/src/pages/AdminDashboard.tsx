import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Edit2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import api from '../lib/api';

export const AdminDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [newTeam, setNewTeam] = useState('');
    const [rounds, setRounds] = useState(1);
    const [daysBetweenMatches, setDaysBetweenMatches] = useState(3);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editingTeamName, setEditingTeamName] = useState('');

    // Queries
    const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/teams').then(r => r.data) });
    const { data: matches } = useQuery({ queryKey: ['matches'], queryFn: () => api.get('/matches').then(r => r.data) });

    // Mutations
    const createTeam = useMutation({
        mutationFn: (name: string) => api.post('/teams', { name }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
    });

    const deleteTeam = useMutation({
        mutationFn: (id: string) => api.delete(`/teams/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['league-table'] });
        }
    });

    const updateTeam = useMutation({
        mutationFn: (data: { id: string, name: string }) => api.put(`/teams/${data.id}`, { name: data.name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            queryClient.invalidateQueries({ queryKey: ['matches'] });
        }
    });

    const generateSchedule = useMutation({
        mutationFn: (params: { rounds: number, daysBetweenMatches: number }) =>
            api.post('/matches/schedule', params),
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
            const next = { ...editingScores };
            delete next[matchId];
            setEditingScores(next);
        }
    };

    const startEditingTeam = (team: any) => {
        setEditingTeamId(team.id);
        setEditingTeamName(team.name);
    };

    const saveTeamName = () => {
        if (editingTeamId && editingTeamName) {
            updateTeam.mutate({ id: editingTeamId, name: editingTeamName });
            setEditingTeamId(null);
        }
    };

    return (
        <div className="space-y-8 pb-20 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">Admin Dashboard</h1>
                    <p className="text-gray-500">Manage teams, generating schedules, and enter results</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => { if (confirm('Reset all matches? This will empty the league.')) clearLeague.mutate(); }}
                        className="px-4 py-2 border-2 border-red-100 text-red-600 rounded-xl hover:bg-red-50 text-sm font-semibold transition-all"
                    >
                        Reset Results
                    </button>
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center px-3 py-1 bg-gray-50 rounded-lg">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mr-2">Rounds</span>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={rounds}
                                onChange={e => setRounds(parseInt(e.target.value) || 1)}
                                className="w-8 bg-transparent font-bold text-center outline-none"
                            />
                        </div>
                        <div className="flex items-center px-3 py-1 bg-gray-50 rounded-lg">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mr-2">Freq (Days)</span>
                            <input
                                type="number"
                                min="1"
                                max="14"
                                value={daysBetweenMatches}
                                onChange={e => setDaysBetweenMatches(parseInt(e.target.value) || 3)}
                                className="w-8 bg-transparent font-bold text-center outline-none"
                            />
                        </div>
                        <button
                            onClick={() => generateSchedule.mutate({ rounds, daysBetweenMatches })}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-bold text-sm flex items-center shadow-lg shadow-primary-500/20"
                        >
                            <Calendar size={16} className="mr-2" />
                            {generateSchedule.isPending ? 'Generating...' : 'New Schedule'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Team Management */}
                <div className="lg:col-span-1 glass p-6 rounded-2xl flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <Plus size={18} className="mr-2 text-primary-500" /> Manage Teams
                    </h2>

                    <div className="flex gap-2 mb-6">
                        <input
                            value={newTeam}
                            onChange={e => setNewTeam(e.target.value)}
                            placeholder="Team name..."
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                        />
                        <button
                            onClick={() => { if (newTeam) { createTeam.mutate(newTeam); setNewTeam(''); } }}
                            disabled={!newTeam || createTeam.isPending}
                            className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50"
                        >
                            Add
                        </button>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
                        {teams?.map((t: any) => (
                            <div key={t.id} className="flex flex-col p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-center">
                                    {editingTeamId === t.id ? (
                                        <input
                                            autoFocus
                                            className="flex-1 font-bold outline-none border-b-2 border-primary-500 bg-transparent"
                                            value={editingTeamName}
                                            onChange={e => setEditingTeamName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && saveTeamName()}
                                            onBlur={saveTeamName}
                                        />
                                    ) : (
                                        <span className="font-bold text-gray-800">{t.name}</span>
                                    )}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => startEditingTeam(t)}
                                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => { if (confirm(`Delete ${t.name}?`)) deleteTeam.mutate(t.id); }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono mt-1 flex justify-between">
                                    <span>ID: {t.id.slice(0, 8)}</span>
                                    {/* Additional stats could go here */}
                                </div>
                            </div>
                        ))}
                        {teams?.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-gray-400 text-sm">No teams added yet.</p>
                                <p className="text-[10px] text-gray-500 mt-1">Add teams to start building your league</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Score Entry Section */}
                <div className="lg:col-span-2 glass p-6 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center">
                            <RefreshCw size={18} className="mr-2 text-primary-500" /> Enter Results
                        </h2>
                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">
                            {matches?.filter((m: any) => m.status === 'SCHEDULED')?.length || 0} Pending Matches
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
                        {matches?.filter((m: any) => m.status !== 'PLAYED' || editingScores[m.id]).slice(0, 20).map((m: any) => (
                            <div key={m.id} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-primary-200 transition-all group">
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-3 border-b border-gray-50 pb-2">
                                    <span className="uppercase tracking-wider">Matchday {m.matchday}</span>
                                    <span>{new Date(m.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 text-right text-sm font-bold text-gray-700 truncate">{m.homeTeam.name}</div>

                                    <div className="flex items-center gap-1.5">
                                        <input
                                            className="w-12 h-10 text-center border-2 border-gray-100 rounded-xl bg-gray-50 font-black text-lg focus:border-primary-500 focus:bg-white outline-none transition-all"
                                            type="number"
                                            value={editingScores[m.id]?.h ?? m.homeScore ?? ''}
                                            onChange={e => handleScoreChange(m.id, 'h', e.target.value)}
                                            placeholder="-"
                                        />
                                        <span className="text-gray-300 font-black">:</span>
                                        <input
                                            className="w-12 h-10 text-center border-2 border-gray-100 rounded-xl bg-gray-50 font-black text-lg focus:border-primary-500 focus:bg-white outline-none transition-all"
                                            type="number"
                                            value={editingScores[m.id]?.a ?? m.awayScore ?? ''}
                                            onChange={e => handleScoreChange(m.id, 'a', e.target.value)}
                                            placeholder="-"
                                        />
                                    </div>

                                    <div className="flex-1 text-left text-sm font-bold text-gray-700 truncate">{m.awayTeam.name}</div>
                                </div>

                                {editingScores[m.id] && (
                                    <button
                                        onClick={() => saveScore(m.id)}
                                        className="w-full mt-3 py-2 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 flex items-center justify-center transition-all animate-bounce-in"
                                    >
                                        <Save size={14} className="mr-2" /> Save Result
                                    </button>
                                )}
                            </div>
                        ))}
                        {(!matches || matches.length === 0) && (
                            <div className="col-span-full py-20 text-center">
                                <div className="p-4 bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="text-gray-300" />
                                </div>
                                <h3 className="text-gray-500 font-bold">No matches scheduled</h3>
                                <p className="text-gray-400 text-sm mt-1">Generate a schedule to start tracking results</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
