import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Edit2, Image as ImageIcon, Plus, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import React, { useState } from 'react';
import api, { getImageUrl } from '../lib/api';

export const AdminDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [newTeam, setNewTeam] = useState('');
    const [rounds, setRounds] = useState(1);
    const [daysBetweenMatches, setDaysBetweenMatches] = useState(3);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editingTeamName, setEditingTeamName] = useState('');

    // Logo Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Queries
    const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/teams').then(r => r.data) });
    const { data: matches } = useQuery({ queryKey: ['matches'], queryFn: () => api.get('/matches').then(r => r.data) });

    // Mutations
    const uploadLogo = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('logo', file);
            const { data } = await api.post('/teams/upload-logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return data.url;
        }
    });

    const createTeam = useMutation({
        mutationFn: async (data: { name: string, logoUrl?: string }) => api.post('/teams', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            setNewTeam('');
            setSelectedFile(null);
            setLogoPreview(null);
        }
    });

    const handleCreateTeam = async () => {
        if (!newTeam) return;
        let logoUrl = '';
        if (selectedFile) {
            logoUrl = await uploadLogo.mutateAsync(selectedFile);
        }
        createTeam.mutate({ name: newTeam, logoUrl });
    };

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
        const num = val === '' ? 0 : parseInt(val);
        setEditingScores(prev => ({
            ...prev,
            [matchId]: { ...prev[matchId], [type]: num }
        }));
    };

    const saveScore = (matchId: string) => {
        const scores = editingScores[matchId];
        if (scores !== undefined) {
            updateResult.mutate({ id: matchId, h: scores.h, a: scores.a });
            const next = { ...editingScores };
            delete next[matchId];
            setEditingScores(next);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setLogoPreview(URL.createObjectURL(file));
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

    // Group matches by Matchday
    const groupedMatches = matches?.reduce((acc: any, m: any) => {
        (acc[m.matchday] = acc[m.matchday] || []).push(m);
        return acc;
    }, {});

    return (
        <div className="space-y-10 pb-20 max-w-7xl mx-auto px-4">
            {/* Header section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Admin <span className="text-primary-600 underline decoration-primary-200">Panel</span></h1>
                    <p className="text-gray-500 mt-2 font-medium">Configure your league, manage teams, and track live results.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => { if (confirm('Reset all matches? This will empty the league.')) clearLeague.mutate(); }}
                        className="px-5 py-2.5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 text-sm font-bold transition-all border border-red-100"
                    >
                        Reset League
                    </button>
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100">
                        <div className="flex items-center px-4 py-1.5 bg-gray-50 rounded-xl">
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest mr-3">Rounds</span>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={rounds}
                                onChange={e => setRounds(parseInt(e.target.value) || 1)}
                                className="w-8 bg-transparent font-black text-gray-800 text-center outline-none"
                            />
                        </div>
                        <div className="flex items-center px-4 py-1.5 bg-gray-50 rounded-xl">
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest mr-3">Days</span>
                            <input
                                type="number"
                                min="1"
                                max="14"
                                value={daysBetweenMatches}
                                onChange={e => setDaysBetweenMatches(parseInt(e.target.value) || 3)}
                                className="w-8 bg-transparent font-black text-gray-800 text-center outline-none"
                            />
                        </div>
                        <button
                            onClick={() => generateSchedule.mutate({ rounds, daysBetweenMatches })}
                            className="bg-gray-900 text-white px-6 py-2.5 rounded-xl hover:bg-black font-bold text-sm flex items-center shadow-lg transition-all active:scale-95"
                        >
                            <Calendar size={18} className="mr-2" />
                            {generateSchedule.isPending ? 'Generating...' : 'New Schedule'}
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Team Management Sidebar */}
                <aside className="lg:col-span-1 space-y-8">
                    <section className="glass p-6 rounded-[2.5rem] border-2 border-white shadow-2xl shadow-gray-200/40">
                        <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center">
                            <Plus size={20} className="mr-2 text-primary-500" /> New Team
                        </h2>

                        <div className="space-y-4">
                            {/* Logo Upload Placeholder */}
                            <div className="group relative w-32 h-32 mx-auto mb-6">
                                <div className="w-full h-full rounded-3xl bg-gray-50 border-4 border-dashed border-gray-100 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary-200">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon size={32} className="text-gray-300" />
                                    )}
                                </div>
                                <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/20 rounded-3xl transition-all opacity-0 hover:opacity-100">
                                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                    <Upload size={24} className="text-white" />
                                </label>
                            </div>

                            <input
                                value={newTeam}
                                onChange={e => setNewTeam(e.target.value)}
                                placeholder="Team Name"
                                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-bold text-gray-800"
                            />

                            <button
                                onClick={handleCreateTeam}
                                disabled={!newTeam || createTeam.isPending || uploadLogo.isPending}
                                className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center"
                            >
                                {createTeam.isPending || uploadLogo.isPending ? 'Working...' : 'Register Team'}
                            </button>
                        </div>
                    </section>

                    <section className="glass p-6 rounded-[2.5rem] border-2 border-white shadow-2xl shadow-gray-200/40">
                        <h2 className="text-xl font-black text-gray-800 mb-6">Registry</h2>
                        <div className="space-y-3">
                            {teams?.map((t: any) => (
                                <div key={t.id} className="flex flex-col p-4 bg-white/50 rounded-2xl border border-gray-50 hover:border-primary-100 transition-all group">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 overflow-hidden">
                                                {t.logoUrl ? <img src={getImageUrl(t.logoUrl)!} alt="" className="w-full h-full object-cover" /> : 'T'}
                                            </div>
                                            {editingTeamId === t.id ? (
                                                <input
                                                    autoFocus
                                                    className="font-bold outline-none border-b-2 border-primary-500 bg-transparent"
                                                    value={editingTeamName}
                                                    onChange={e => setEditingTeamName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && saveTeamName()}
                                                    onBlur={saveTeamName}
                                                />
                                            ) : (
                                                <span className="font-bold text-gray-800">{t.name}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEditingTeam(t)}
                                                className="p-1.5 text-gray-400 hover:text-primary-600"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => { if (confirm(`Delete ${t.name}?`)) deleteTeam.mutate(t.id); }}
                                                className="p-1.5 text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>

                {/* Main Results Entry - THE WONDERFUL TABLE */}
                <main className="lg:col-span-3 space-y-10">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-black text-gray-800 flex items-center">
                            <span className="w-2 h-8 bg-primary-500 rounded-full mr-3"></span>
                            Result Entry
                        </h2>
                        <div className="text-xs font-black px-4 py-2 bg-primary-50 text-primary-600 rounded-full border border-primary-100 flex items-center">
                            <RefreshCw size={12} className="mr-2 animate-spin-slow" />
                            {matches?.filter((m: any) => m.status === 'SCHEDULED')?.length || 0} Open Fixtures
                        </div>
                    </div>

                    <div className="space-y-12">
                        {groupedMatches && Object.entries(groupedMatches).map(([matchday, dayMatches]: [string, any]) => (
                            <section key={matchday} className="space-y-6">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-100 to-gray-100"></div>
                                    <h3 className="text-lg font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
                                        Matchday <span className="text-gray-900 ml-2">{matchday}</span>
                                    </h3>
                                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-100 to-gray-100"></div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {dayMatches.map((m: any) => (
                                        <div key={m.id} className="relative group overflow-hidden p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-primary-500/5 hover:-translate-y-1 transition-all">
                                            <div className="flex items-center justify-between gap-6">
                                                {/* Home Team */}
                                                <div className="flex-1 flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center p-3 border border-gray-100 shadow-inner overflow-hidden">
                                                        {m.homeTeam.logoUrl ? (
                                                            <img src={getImageUrl(m.homeTeam.logoUrl)!} alt="" className="w-full h-full object-contain" />
                                                        ) : (
                                                            <ImageIcon className="text-gray-200" size={24} />
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-black text-gray-800 text-center uppercase tracking-tight truncate w-full">{m.homeTeam.name}</span>
                                                </div>

                                                {/* Score Inputs */}
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            className="w-16 h-16 text-center border-4 border-gray-50 rounded-[1.5rem] bg-gray-50 font-black text-2xl focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-50 outline-none transition-all shadow-inner"
                                                            type="number"
                                                            min="0"
                                                            value={editingScores[m.id]?.h ?? m.homeScore ?? ''}
                                                            onChange={e => handleScoreChange(m.id, 'h', e.target.value)}
                                                            placeholder="-"
                                                        />
                                                        <span className="text-gray-200 font-black text-2xl">:</span>
                                                        <input
                                                            className="w-16 h-16 text-center border-4 border-gray-50 rounded-[1.5rem] bg-gray-50 font-black text-2xl focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-50 outline-none transition-all shadow-inner"
                                                            type="number"
                                                            min="0"
                                                            value={editingScores[m.id]?.a ?? m.awayScore ?? ''}
                                                            onChange={e => handleScoreChange(m.id, 'a', e.target.value)}
                                                            placeholder="-"
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                </div>

                                                {/* Away Team */}
                                                <div className="flex-1 flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center p-3 border border-gray-100 shadow-inner overflow-hidden">
                                                        {m.awayTeam.logoUrl ? (
                                                            <img src={getImageUrl(m.awayTeam.logoUrl)!} alt="" className="w-full h-full object-contain" />
                                                        ) : (
                                                            <ImageIcon className="text-gray-200" size={24} />
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-black text-gray-800 text-center uppercase tracking-tight truncate w-full">{m.awayTeam.name}</span>
                                                </div>
                                            </div>

                                            {/* Surgical Save Button */}
                                            {editingScores[m.id] && (
                                                <button
                                                    onClick={() => saveScore(m.id)}
                                                    className="w-full mt-6 py-3 bg-primary-600 text-white rounded-2xl font-black text-sm hover:bg-primary-700 flex items-center justify-center transition-all animate-in slide-in-from-bottom-2"
                                                >
                                                    <Save size={16} className="mr-2" /> Push Result
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}

                        {(!matches || matches.length === 0) && (
                            <div className="py-32 text-center glass rounded-[3rem] border-2 border-dashed border-gray-100">
                                <div className="p-8 bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                                    <Calendar className="text-gray-200" size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-400">The Pitch is Empty</h3>
                                <p className="text-gray-400 mt-2 font-medium">Add teams and generate a schedule to start managing results.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
