import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Edit2, Image as ImageIcon, Plus, RefreshCw, Save, Trash2, Trophy, User } from 'lucide-react';
import React, { useState } from 'react';
import { MatchStatsModal } from '../components/MatchStatsModal';
import api, { getImageUrl } from '../lib/api';

export const AdminDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [newTeam, setNewTeam] = useState('');
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editingTeamName, setEditingTeamName] = useState('');

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Schedule Generation State
    const [scheduleWeeks, setScheduleWeeks] = useState(4);

    // Player State
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerNumber, setNewPlayerNumber] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');

    // Stats Modal State
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);

    // Filtering State
    const [filterMatchday, setFilterMatchday] = useState<string>('all');

    // Queries
    const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/teams').then(r => r.data) });
    const { data: matches } = useQuery({ queryKey: ['matches'], queryFn: () => api.get('/matches').then(r => r.data) });
    const { data: players } = useQuery({ queryKey: ['players'], queryFn: () => api.get('/players').then(r => r.data) });

    // Mutations
    const uploadLogo = useMutation({
        mutationFn: async (file: File) => {
            console.log('[DEBUG] Uploading logo...', file.name);
            const formData = new FormData();
            formData.append('logo', file);
            const { data } = await api.post('/teams/upload-logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log('[DEBUG] Logo uploaded:', data.url);
            return data.url;
        },
        onError: (err: any) => console.error('[DEBUG] Logo upload failed:', err)
    });

    const createTeam = useMutation({
        mutationFn: async (data: { name: string, logoUrl?: string }) => {
            console.log('[DEBUG] Sending createTeam request:', data);
            return api.post('/teams', data);
        },
        onSuccess: () => {
            console.log('[DEBUG] Team created successfully');
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            setNewTeam('');
            setSelectedFile(null);
            setLogoPreview(null);
        },
        onError: (err: any) => {
            console.error('[DEBUG] Team creation failed:', err);
            alert('Failed to create team: ' + (err.response?.data?.message || err.message));
        }
    });

    const handleCreateTeam = async () => {
        if (!newTeam) return;
        try {
            let logoUrl = '';
            if (selectedFile) {
                logoUrl = await uploadLogo.mutateAsync(selectedFile);
            }
            createTeam.mutate({ name: newTeam, logoUrl });
        } catch (error) {
            console.error('[DEBUG] handleCreateTeam error:', error);
        }
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


    const clearLeague = useMutation({
        mutationFn: () => api.delete('/matches'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['league-table'] });
        }
    });

    const deleteAllTeams = useMutation({
        mutationFn: () => api.delete('/teams'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
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

    const generateSchedule = useMutation({
        mutationFn: (weeks: number) => api.post('/matches/schedule', { weeks }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            alert('Schedule generated successfully!');
        },
        onError: (err: any) => {
            alert('Failed to generate schedule: ' + (err.response?.data?.message || err.message));
        }
    });

    const createPlayer = useMutation({
        mutationFn: (data: any) => api.post('/players', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['players'] });
            queryClient.invalidateQueries({ queryKey: ['teams'] }); // Refresh teams to get updated player lists if nested
            setNewPlayerName('');
            setNewPlayerNumber('');
        },
        onError: (err: any) => {
            alert('Failed to create player: ' + (err.response?.data?.message || err.message));
        }
    });

    const deletePlayer = useMutation({
        mutationFn: (id: string) => api.delete(`/players/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['players'] });
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

    // Group matches by Matchday, then filter if needed
    const groupedMatches = matches?.reduce((acc: any, m: any) => {
        if (filterMatchday !== 'all' && m.matchday.toString() !== filterMatchday) return acc;
        (acc[m.matchday] = acc[m.matchday] || []).push(m);
        return acc;
    }, {});

    const matchdays = (matches ? [...new Set(matches.map((m: any) => m.matchday.toString()))] : []) as string[];
    matchdays.sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <div className="space-y-10 pb-20 max-w-7xl mx-auto px-4">
            {/* Header section */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Admin <span className="text-primary-600 underline decoration-primary-200">Panel</span></h1>
                    <p className="text-gray-500 mt-2 font-medium">Configure Team Respect League, manage teams, and track live results.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => { if (confirm('Reset all matches? This will empty the league.')) clearLeague.mutate(); }}
                        className="px-5 py-2.5 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 text-sm font-bold transition-all border border-red-100"
                    >
                        Reset League
                    </button>
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 px-4 py-2.5">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                            League Management Active
                        </p>
                    </div>
                </div>
            </header>

            {/* Schedule Generation Section */}
            <section className="glass p-8 rounded-[2.5rem] border-2 border-white shadow-2xl shadow-gray-200/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-gray-800 mb-2 flex items-center">
                            <Calendar size={24} className="mr-3 text-primary-500" />
                            Match Schedule Generator
                        </h2>
                        <p className="text-gray-500 font-medium">
                            Generate Friday/Saturday matches with automatic home/away rotation
                        </p>
                        {matches && matches.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-3">
                                <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold border border-blue-100">
                                    📅 {matches.length} Total Matches
                                </div>
                                <div className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-bold border border-green-100">
                                    ✅ {matches.filter((m: any) => m.status === 'PLAYED').length} Played
                                </div>
                                <div className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-sm font-bold border border-orange-100">
                                    ⏳ {matches.filter((m: any) => m.status === 'SCHEDULED').length} Scheduled
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-bold text-gray-600">Weeks:</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={scheduleWeeks}
                                onChange={(e) => setScheduleWeeks(parseInt(e.target.value) || 1)}
                                className="w-20 px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-bold text-center"
                            />
                        </div>
                        <button
                            onClick={() => {
                                if (teams?.length !== 3) {
                                    alert('You need exactly 3 teams to generate the schedule!');
                                    return;
                                }
                                if (matches?.length > 0) {
                                    if (!confirm('This will clear existing matches and generate a new schedule. Continue?')) return;
                                }
                                generateSchedule.mutate(scheduleWeeks);
                            }}
                            disabled={generateSchedule.isPending || teams?.length !== 3}
                            className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-black hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {generateSchedule.isPending ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Calendar size={18} />
                                    <span>Generate Schedule</span>
                                </>
                            )}
                        </button>
                        {teams?.length !== 3 && (
                            <p className="text-xs text-red-500 font-bold text-center">
                                ⚠️ Requires exactly 3 teams
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Team Management Sidebar */}
                <aside className="lg:col-span-1 space-y-8">
                    <section className="glass p-6 rounded-[2.5rem] border-2 border-white shadow-2xl shadow-gray-200/40">
                        <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center">
                            <Plus size={20} className="mr-2 text-primary-500" /> New Team
                        </h2>

                        <div className="space-y-4">
                            {/* Simplified Logo Upload */}
                            <div className="flex items-center gap-3 mb-4">
                                <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl hover:border-primary-200 text-gray-500 hover:text-primary-600 transition-all font-bold text-sm">
                                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                    {selectedFile ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-white border border-gray-100 overflow-hidden">
                                                <img src={logoPreview!} className="w-full h-full object-cover" />
                                            </div>
                                            <span className="truncate max-w-[100px]">{selectedFile.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <ImageIcon size={18} />
                                            <span>Add Logo</span>
                                        </>
                                    )}
                                </label>
                                {selectedFile && (
                                    <button
                                        onClick={() => { setSelectedFile(null); setLogoPreview(null); }}
                                        className="p-3 text-red-400 hover:text-red-600"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>

                            <input
                                value={newTeam}
                                onChange={e => setNewTeam(e.target.value)}
                                placeholder="Team Name"
                                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-bold text-gray-800"
                                onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                            />

                            <button
                                onClick={handleCreateTeam}
                                disabled={!newTeam || createTeam.isPending || uploadLogo.isPending}
                                className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {createTeam.isPending || uploadLogo.isPending ? (
                                    <>
                                        <RefreshCw size={18} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Register Team</span>
                                )}
                            </button>
                        </div>
                    </section>

                    {/* Player Management Section */}
                    <section className="glass p-6 rounded-[2.5rem] border-2 border-white shadow-2xl shadow-gray-200/40 mb-10">
                        <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center">
                            <User size={20} className="mr-2 text-primary-500" /> Player Registry
                        </h2>

                        <div className="space-y-4 mb-8">
                            <div className="space-y-3">
                                <input
                                    value={newPlayerName}
                                    onChange={e => setNewPlayerName(e.target.value)}
                                    placeholder="Player Name"
                                    className="w-full px-5 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none font-bold text-sm"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={newPlayerNumber}
                                        onChange={e => setNewPlayerNumber(e.target.value)}
                                        placeholder="#"
                                        className="w-20 px-5 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none font-bold text-sm text-center"
                                    />
                                    <select
                                        value={selectedTeamId}
                                        onChange={e => setSelectedTeamId(e.target.value)}
                                        className="flex-1 px-5 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none font-bold text-sm appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Team</option>
                                        {teams?.map((t: any) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={() => {
                                        if (newPlayerName && newPlayerNumber && selectedTeamId) {
                                            createPlayer.mutate({
                                                name: newPlayerName,
                                                number: parseInt(newPlayerNumber),
                                                teamId: selectedTeamId
                                            });
                                        }
                                    }}
                                    disabled={!newPlayerName || !newPlayerNumber || !selectedTeamId || createPlayer.isPending}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg disabled:opacity-50"
                                >
                                    {createPlayer.isPending ? 'Adding...' : 'Add Player'}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {teams?.map((team: any) => {
                                const teamPlayers = players?.filter((p: any) => p.teamId === team.id) || [];
                                return (
                                    <div key={team.id} className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                                {team.logoUrl ? <img src={getImageUrl(team.logoUrl)!} className="w-6 h-6 object-contain flex-shrink-0" /> : null}
                                                {team.name}
                                            </h3>
                                            <span className="text-xs font-black bg-white px-2 py-1 rounded-md text-gray-400 border border-gray-100">
                                                {teamPlayers.length}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {teamPlayers.length > 0 ? (
                                                teamPlayers.map((player: any) => (
                                                    <div key={player.id} className="flex items-center justify-between group">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-gray-300 w-5 text-center">{player.number}</span>
                                                            <span className="text-sm font-bold text-gray-600">{player.name}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => { if (confirm('Remove player?')) deletePlayer.mutate(player.id); }}
                                                            className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-center text-gray-400 font-medium py-2">No players</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="glass p-6 rounded-[2.5rem] border-2 border-white shadow-2xl shadow-gray-200/40">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-gray-800">Team Registry</h2>
                            {teams && teams.length > 0 && (
                                <button
                                    onClick={() => { if (confirm('Delete ALL teams? This will clear everything!')) deleteAllTeams.mutate(); }}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Reset All Teams"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {teams?.map((t: any) => (
                                <div key={t.id} className="flex flex-col p-4 bg-white/50 rounded-2xl border border-gray-50 hover:border-primary-100 transition-all group">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 overflow-hidden flex-shrink-0">
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
                        <div className="flex items-center gap-4">
                            {/* Matchday Filter */}
                            <div className="flex items-center gap-2 bg-white border-2 border-gray-100 rounded-xl px-3 py-1.5 shadow-sm">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filter:</span>
                                <select
                                    value={filterMatchday}
                                    onChange={(e) => setFilterMatchday(e.target.value)}
                                    className="text-xs font-black text-primary-600 outline-none bg-transparent cursor-pointer"
                                >
                                    <option value="all">All Matchdays</option>
                                    {matchdays.map((md: string) => (
                                        <option key={md} value={md}>Matchday {md}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="text-xs font-black px-4 py-2 bg-primary-50 text-primary-600 rounded-full border border-primary-100 flex items-center">
                                <RefreshCw size={12} className="mr-2 animate-spin-slow" />
                                {matches?.filter((m: any) => m.status === 'SCHEDULED')?.length || 0} Open
                            </div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        {groupedMatches && Object.entries(groupedMatches).map(([matchday, dayMatches]: [string, any]) => {
                            const firstMatch = dayMatches[0];
                            const matchDate = new Date(firstMatch.date);
                            const dayOfWeek = matchDate.toLocaleDateString('en-US', { weekday: 'long' });
                            const dateStr = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                            return (
                                <section key={matchday} className="space-y-6">
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-100 to-gray-100"></div>
                                        <div className="text-center">
                                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-[0.2em]">
                                                {dayOfWeek}
                                            </h3>
                                            <p className="text-xs font-bold text-gray-400 mt-1">
                                                Matchday {matchday} • {dateStr}
                                            </p>
                                        </div>
                                        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gray-100 to-gray-100"></div>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        {dayMatches.map((m: any) => (
                                            <div key={m.id} className="relative group overflow-hidden p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-primary-500/5 hover:-translate-y-1 transition-all">
                                                <div className="flex items-center justify-between gap-6">
                                                    {/* Home Team */}
                                                    <div className="flex-1 flex flex-col items-center gap-3">
                                                        <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center p-3 border border-gray-100 shadow-inner overflow-hidden flex-shrink-0">
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
                                                        <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center p-3 border border-gray-100 shadow-inner overflow-hidden flex-shrink-0">
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

                                                {/* Player Stats Button */}
                                                {!editingScores[m.id] && m.status === 'PLAYED' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedMatch(m);
                                                            setStatsModalOpen(true);
                                                        }}
                                                        className="w-full mt-4 py-3 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-black text-sm hover:border-gray-900 hover:bg-gray-900 hover:text-white flex items-center justify-center transition-all shadow-sm hover:shadow-md"
                                                    >
                                                        <Trophy size={16} className="mr-2" /> Record Stats
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}

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

            {/* Stats Modal */}
            <MatchStatsModal
                isOpen={statsModalOpen}
                onClose={() => {
                    setStatsModalOpen(false);
                    setSelectedMatch(null);
                }}
                match={selectedMatch}
            />
        </div>
    );
};
