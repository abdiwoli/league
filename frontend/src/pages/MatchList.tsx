import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { addDays, format, parseISO, startOfToday } from 'date-fns';
import { Calendar, CheckCircle, Clock, Info, RefreshCw, Settings2 } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getImageUrl } from '../lib/api';

export const MatchList: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const queryClient = useQueryClient();

    const { data: matches, isLoading } = useQuery({
        queryKey: ['matches'],
        queryFn: async () => {
            const res = await api.get('/matches');
            return res.data;
        }
    });

    // Scheduling Form State
    const [showAdminControls, setShowAdminControls] = useState(false);
    const [rounds, setRounds] = useState(1);
    const [gapDays, setGapDays] = useState(1);
    const [playDays, setPlayDays] = useState(2);
    const [restDays, setRestDays] = useState(1);
    const [startDate, setStartDate] = useState(format(addDays(startOfToday(), 1), 'yyyy-MM-dd'));
    const [offDays, setOffDays] = useState<number[]>([]); // 0=Sun, 6=Sat

    const generateSchedule = useMutation({
        mutationFn: async () => {
            return api.post('/matches/schedule', {
                rounds,
                daysBetweenMatches: gapDays,
                startDate,
                offDays,
                playDays,
                restDays
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['league-table'] });
            setShowAdminControls(false);
            alert('Schedule generated successfully!');
        },
        onError: (err: any) => {
            alert('Generation failed: ' + (err.response?.data?.message || err.message));
        }
    });

    const toggleOffDay = (day: number) => {
        setOffDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <RefreshCw className="animate-spin text-primary-500" size={32} />
            <p className="text-gray-500 font-medium">Preparing the pitch...</p>
        </div>
    );

    // Grouping Logic: Round -> Date
    const roundsMap: Record<number, Record<string, any[]>> = {};
    matches?.forEach((m: any) => {
        if (!roundsMap[m.round]) roundsMap[m.round] = {};
        const dateKey = format(parseISO(m.date), 'yyyy-MM-dd');
        if (!roundsMap[m.round][dateKey]) roundsMap[m.round][dateKey] = [];
        roundsMap[m.round][dateKey].push(m);
    });

    const sortedRounds = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="space-y-10 pb-20 max-w-6xl mx-auto px-4">
            {/* Header & Admin Trigger */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Match <span className="text-primary-600">Schedule</span></h1>
                    <p className="text-gray-500 mt-2 font-medium">Official fixtures and results for Season 2026.</p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setShowAdminControls(!showAdminControls)}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95",
                            showAdminControls ? "bg-gray-100 text-gray-600" : "bg-gray-900 text-white hover:bg-black"
                        )}
                    >
                        <Settings2 size={18} />
                        {showAdminControls ? 'Close Config' : 'Generate Schedule'}
                    </button>
                )}
            </div>

            {/* Admin Scheduling Panel */}
            {isAdmin && showAdminControls && (
                <div className="glass p-8 rounded-[2.5rem] border-2 border-primary-100 shadow-2xl shadow-primary-500/5 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Sequence Start</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" size={18} />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-50 rounded-2xl focus:bg-white focus:border-primary-500 outline-none font-bold text-gray-800 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Rounds & Gaps</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl border-2 border-gray-50 focus-within:border-primary-500 transition-all">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rounds</span>
                                    <input
                                        type="number" min="1" max="10"
                                        value={rounds}
                                        onChange={e => setRounds(parseInt(e.target.value) || 1)}
                                        className="w-full bg-transparent font-black text-gray-800 outline-none text-xl"
                                    />
                                </div>
                                <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl border-2 border-gray-50 focus-within:border-primary-500 transition-all">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gaps (Days)</span>
                                    <input
                                        type="number" min="1" max="14"
                                        value={gapDays}
                                        onChange={e => setGapDays(parseInt(e.target.value) || 1)}
                                        className="w-full bg-transparent font-black text-gray-800 outline-none text-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Play / Rest Pattern</label>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 flex items-center bg-gray-50 rounded-2xl border-2 border-gray-50 px-4 py-3.5">
                                    <span className="text-sm font-bold text-gray-400 mr-3">Play</span>
                                    <input
                                        type="number" min="1" max="10"
                                        value={playDays}
                                        onChange={e => setPlayDays(parseInt(e.target.value) || 1)}
                                        className="w-full bg-transparent font-black text-gray-800 outline-none"
                                    />
                                </div>
                                <div className="flex-1 flex items-center bg-gray-50 rounded-2xl border-2 border-gray-50 px-4 py-3.5">
                                    <span className="text-sm font-bold text-gray-400 mr-3">Rest</span>
                                    <input
                                        type="number" min="0" max="10"
                                        value={restDays}
                                        onChange={e => setRestDays(parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent font-black text-gray-800 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Off Days</label>
                            <div className="flex flex-wrap gap-2">
                                {dayNames.map((name, i) => (
                                    <button
                                        key={name}
                                        onClick={() => toggleOffDay(i)}
                                        className={clsx(
                                            "w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-black transition-all border-2",
                                            offDays.includes(i)
                                                ? "bg-red-50 border-red-200 text-red-600 shadow-sm"
                                                : "bg-white border-gray-100 text-gray-400 hover:border-primary-200"
                                        )}
                                    >
                                        {name[0]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                        <div className="flex items-center gap-3 text-gray-400">
                            <Info size={16} />
                            <p className="text-xs font-medium">This will clear all current matches and results.</p>
                        </div>
                        <button
                            onClick={() => { if (confirm('Generate new schedule? Current results will be lost!')) generateSchedule.mutate(); }}
                            disabled={generateSchedule.isPending}
                            className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {generateSchedule.isPending ? <RefreshCw className="animate-spin" size={18} /> : <span>Confirm & Generate</span>}
                        </button>
                    </div>
                </div>
            )}

            {/* Matches Display Grouped by Round */}
            <div className="space-y-16">
                {sortedRounds.map((roundNum, idx) => (
                    <section
                        key={roundNum}
                        className={clsx(
                            "rounded-[3rem] p-4 md:p-10 border-2 transition-all",
                            idx % 2 === 0
                                ? "bg-white border-gray-50 shadow-xl shadow-gray-200/50"
                                : "bg-primary-50/30 border-primary-50"
                        )}
                    >
                        <div className="flex items-center gap-6 mb-10 px-4">
                            <div className="w-16 h-16 rounded-3xl bg-primary-600 text-white flex flex-col items-center justify-center shadow-lg shadow-primary-500/20">
                                <span className="text-[10px] font-black uppercase opacity-70">Round</span>
                                <span className="text-2xl font-black">{roundNum}</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Stage {roundNum}</h2>
                                <p className="text-sm font-medium text-gray-500">Scheduled fixtures for this round.</p>
                            </div>
                        </div>

                        <div className="space-y-12">
                            {Object.entries(roundsMap[roundNum]).sort().map(([dateKey, dayMatches]) => (
                                <div key={dateKey} className="space-y-6">
                                    {/* Day Header with Separator */}
                                    <div className="flex items-center gap-6">
                                        <div className="w-fit flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border-2 border-gray-50 shadow-sm">
                                            <Clock size={14} className="text-primary-500" />
                                            <span className="text-sm font-black text-gray-800 uppercase tracking-widest">
                                                {format(parseISO(dateKey), 'EEEE, MMMM do')}
                                            </span>
                                        </div>
                                        <div className="h-0.5 flex-1 bg-gradient-to-r from-gray-100 to-transparent"></div>
                                    </div>

                                    {/* Matches for this day */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-2">
                                        {dayMatches.map((m: any) => (
                                            <div key={m.id} className="bg-white border-2 border-gray-50 p-6 rounded-[2rem] hover:border-primary-200 transition-all group hover:shadow-lg">
                                                <div className="flex items-center justify-between gap-4">
                                                    {/* Home Team */}
                                                    <div className="flex-1 flex flex-col items-center gap-3 overflow-hidden">
                                                        <div className="w-24 h-24 rounded-[2rem] bg-gray-50 flex items-center justify-center p-3 border-2 border-gray-100 overflow-hidden shadow-inner group-hover:border-primary-100 transition-all">
                                                            {m.homeTeam.logoUrl ? (
                                                                <img src={getImageUrl(m.homeTeam.logoUrl)!} alt="" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                                            ) : (
                                                                <div className="text-xl font-black text-gray-300">T</div>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-black text-gray-700 uppercase tracking-tight truncate w-full text-center">{m.homeTeam.name}</span>
                                                    </div>

                                                    {/* Score or VS */}
                                                    <div className="flex flex-col items-center gap-2">
                                                        {m.status === 'PLAYED' ? (
                                                            <div className="bg-gray-900 px-4 py-2 rounded-2xl text-xl font-black text-white shadow-xl shadow-gray-200 ring-4 ring-gray-100">
                                                                {m.homeScore} - {m.awayScore}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] font-black text-gray-400 bg-gray-100 px-4 py-2 rounded-xl border-2 border-gray-50 tracking-[0.3em] font-mono">
                                                                VS
                                                            </div>
                                                        )}
                                                        {m.status === 'PLAYED' && (
                                                            <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase tracking-widest">
                                                                <CheckCircle size={10} /> Full Time
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Away Team */}
                                                    <div className="flex-1 flex flex-col items-center gap-3 overflow-hidden">
                                                        <div className="w-24 h-24 rounded-[2rem] bg-gray-50 flex items-center justify-center p-3 border-2 border-gray-100 overflow-hidden shadow-inner group-hover:border-primary-100 transition-all">
                                                            {m.awayTeam.logoUrl ? (
                                                                <img src={getImageUrl(m.awayTeam.logoUrl)!} alt="" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                                            ) : (
                                                                <div className="text-xl font-black text-gray-300">T</div>
                                                            )}
                                                        </div>
                                                        <span className="text-sm font-black text-gray-700 uppercase tracking-tight truncate w-full text-center">{m.awayTeam.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {(!matches || matches.length === 0) && (
                <div className="py-40 text-center glass rounded-[4rem] border-4 border-dashed border-gray-100">
                    <div className="p-10 bg-gray-50 rounded-full w-28 h-28 flex items-center justify-center mx-auto mb-8">
                        <Calendar className="text-gray-200" size={40} />
                    </div>
                    <h3 className="text-3xl font-black text-gray-300">The Season Hasn't Started</h3>
                    <p className="text-gray-400 mt-3 font-medium text-lg">
                        {isAdmin ? 'Use the config panel above to generate the first round of matches.' : 'Fixture details will appear here once the admin generates the schedule.'}
                    </p>
                </div>
            )}
        </div>
    );
};
