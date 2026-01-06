import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { addDays, format, parseISO, startOfToday } from 'date-fns';
import { Calendar, CheckCircle, Clock, RefreshCw, Settings2, Sliders, Zap } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getImageUrl } from '../lib/api';

type ScheduleMode = 'WEEKEND_DOUBLE' | 'TRADITIONAL' | 'CUSTOM';

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

    const { data: teams } = useQuery({
        queryKey: ['teams'],
        queryFn: async () => {
            const res = await api.get('/teams');
            return res.data;
        }
    });

    /* ---------------- Admin state ---------------- */
    const [showAdminControls, setShowAdminControls] = useState(false);
    const [mode, setMode] = useState<ScheduleMode>('WEEKEND_DOUBLE');
    const [rounds, setRounds] = useState(2);
    const [startDate, setStartDate] = useState(
        format(addDays(startOfToday(), 1), 'yyyy-MM-dd')
    );

    // Weekend Double & Traditional mode settings
    const [daysBetweenRounds, setDaysBetweenRounds] = useState(5);

    // Traditional mode settings
    const [matchDaysPerRound, setMatchDaysPerRound] = useState(2);

    // Custom mode settings
    const [gapDays, setGapDays] = useState(1);
    const [playDays, setPlayDays] = useState(2);
    const [restDays, setRestDays] = useState(1);

    const [offDays, setOffDays] = useState<number[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    const generateSchedule = useMutation({
        mutationFn: async () => {
            const payload: any = {
                mode,
                rounds,
                startDate,
                offDays
            };

            if (mode === 'WEEKEND_DOUBLE') {
                payload.daysBetweenRounds = daysBetweenRounds;
            } else if (mode === 'TRADITIONAL') {
                payload.daysBetweenRounds = daysBetweenRounds;
                payload.matchDaysPerRound = matchDaysPerRound;
            } else if (mode === 'CUSTOM') {
                payload.daysBetweenMatches = gapDays;
                payload.playDays = playDays;
                payload.restDays = restDays;
            }

            return api.post('/matches/schedule', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['league-table'] });
            setShowAdminControls(false);
            alert('Schedule generated successfully!');
        },
        onError: (error: any) => {
            alert(`Error: ${error.response?.data?.message || 'Failed to generate schedule'}`);
        }
    });

    const toggleOffDay = (day: number) => {
        setOffDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    // Calculate preview dates
    const previewDates = useMemo(() => {
        if (!teams || teams.length < 2) return [];

        const numTeams = teams.length;
        const matchesPerRound = mode === 'WEEKEND_DOUBLE'
            ? (numTeams * (numTeams - 1)) // Double round-robin: each team plays all others twice
            : Math.floor(numTeams * (numTeams - 1) / 2); // Single round-robin

        const preview: Array<{ round: number; dates: string[]; matchCount: number }> = [];
        let currentDate = parseISO(startDate);

        for (let r = 0; r < rounds; r++) {
            if (mode === 'WEEKEND_DOUBLE') {
                const friday = currentDate;
                const saturday = addDays(friday, 1);
                preview.push({
                    round: r + 1,
                    dates: [format(friday, 'EEE MMM d'), format(saturday, 'EEE MMM d')],
                    matchCount: matchesPerRound
                });
                currentDate = addDays(saturday, daysBetweenRounds);
            } else if (mode === 'TRADITIONAL') {
                const dates: string[] = [];
                for (let d = 0; d < matchDaysPerRound; d++) {
                    dates.push(format(addDays(currentDate, d), 'EEE MMM d'));
                }
                preview.push({
                    round: r + 1,
                    dates,
                    matchCount: matchesPerRound
                });
                currentDate = addDays(currentDate, matchDaysPerRound + daysBetweenRounds);
            } else {
                preview.push({
                    round: r + 1,
                    dates: ['Custom pattern'],
                    matchCount: matchesPerRound
                });
            }
        }

        return preview;
    }, [teams, mode, rounds, startDate, daysBetweenRounds, matchDaysPerRound]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCw className="animate-spin text-primary-500" size={36} />
            </div>
        );
    }

    /* ---------------- Group matches ---------------- */
    const roundsMap: Record<number, Record<string, any[]>> = {};
    matches?.forEach((m: any) => {
        if (!roundsMap[m.round]) roundsMap[m.round] = {};
        const dateKey = format(parseISO(m.date), 'yyyy-MM-dd');
        if (!roundsMap[m.round][dateKey]) roundsMap[m.round][dateKey] = [];
        roundsMap[m.round][dateKey].push(m);
    });

    const sortedRounds = Object.keys(roundsMap)
        .map(Number)
        .sort((a, b) => a - b);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="max-w-7xl mx-auto px-4 pb-20 space-y-10">
            {/* ---------------- Header ---------------- */}
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900">
                        Match <span className="text-primary-600">Schedule</span>
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Official fixtures and results
                    </p>
                </div>

                {isAdmin && (
                    <button
                        onClick={() => setShowAdminControls(!showAdminControls)}
                        className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-colors"
                    >
                        <Settings2 size={18} />
                        {showAdminControls ? 'Close' : 'Generate'}
                    </button>
                )}
            </div>

            {/* ---------------- Admin Panel ---------------- */}
            {isAdmin && showAdminControls && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-3xl p-8 space-y-6">
                    {/* Mode Selector */}
                    <div>
                        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                            🎯 Scheduling Mode
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => setMode('WEEKEND_DOUBLE')}
                                className={clsx(
                                    'p-6 rounded-2xl border-2 transition-all text-left',
                                    mode === 'WEEKEND_DOUBLE'
                                        ? 'bg-primary-600 text-white border-primary-700 shadow-xl scale-105'
                                        : 'bg-white border-gray-200 hover:border-primary-300'
                                )}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Zap size={24} className={mode === 'WEEKEND_DOUBLE' ? 'text-yellow-300' : 'text-primary-600'} />
                                    <div className="font-black text-lg">Weekend Double</div>
                                </div>
                                <p className={clsx('text-sm', mode === 'WEEKEND_DOUBLE' ? 'text-white/90' : 'text-gray-600')}>
                                    Home matches Friday, away matches Saturday. Perfect for 3 teams.
                                </p>
                            </button>

                            <button
                                onClick={() => setMode('TRADITIONAL')}
                                className={clsx(
                                    'p-6 rounded-2xl border-2 transition-all text-left',
                                    mode === 'TRADITIONAL'
                                        ? 'bg-primary-600 text-white border-primary-700 shadow-xl scale-105'
                                        : 'bg-white border-gray-200 hover:border-primary-300'
                                )}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Calendar size={24} className={mode === 'TRADITIONAL' ? 'text-yellow-300' : 'text-primary-600'} />
                                    <div className="font-black text-lg">Traditional</div>
                                </div>
                                <p className={clsx('text-sm', mode === 'TRADITIONAL' ? 'text-white/90' : 'text-gray-600')}>
                                    Single round-robin distributed across multiple days.
                                </p>
                            </button>

                            <button
                                onClick={() => setMode('CUSTOM')}
                                className={clsx(
                                    'p-6 rounded-2xl border-2 transition-all text-left',
                                    mode === 'CUSTOM'
                                        ? 'bg-primary-600 text-white border-primary-700 shadow-xl scale-105'
                                        : 'bg-white border-gray-200 hover:border-primary-300'
                                )}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Sliders size={24} className={mode === 'CUSTOM' ? 'text-yellow-300' : 'text-primary-600'} />
                                    <div className="font-black text-lg">Custom</div>
                                </div>
                                <p className={clsx('text-sm', mode === 'CUSTOM' ? 'text-white/90' : 'text-gray-600')}>
                                    Full control over all scheduling parameters.
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Common Settings */}
                    <div className="bg-white/80 backdrop-blur rounded-2xl p-6 space-y-4">
                        <h4 className="font-black text-gray-900 mb-4">⚙️ Basic Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    📅 Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none font-semibold"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    🔄 Number of Rounds
                                </label>
                                <input
                                    type="number"
                                    value={rounds}
                                    onChange={e => setRounds(Math.max(1, +e.target.value || 1))}
                                    min="1"
                                    className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none font-semibold"
                                />
                            </div>
                            {(mode === 'WEEKEND_DOUBLE' || mode === 'TRADITIONAL') && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        ⏸️ Days Between Rounds
                                    </label>
                                    <input
                                        type="number"
                                        value={daysBetweenRounds}
                                        onChange={e => setDaysBetweenRounds(Math.max(0, +e.target.value || 0))}
                                        min="0"
                                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none font-semibold"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mode-specific Settings */}
                    {mode === 'TRADITIONAL' && (
                        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 space-y-4">
                            <h4 className="font-black text-gray-900 mb-4">📊 Traditional Mode Settings</h4>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Match Days Per Round
                                </label>
                                <input
                                    type="number"
                                    value={matchDaysPerRound}
                                    onChange={e => setMatchDaysPerRound(Math.max(1, +e.target.value || 1))}
                                    min="1"
                                    className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none font-semibold"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Number of days to distribute matches across in each round
                                </p>
                            </div>
                        </div>
                    )}

                    {mode === 'CUSTOM' && (
                        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 space-y-4">
                            <h4 className="font-black text-gray-900 mb-4">🎛️ Custom Mode Settings</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Gap Days
                                    </label>
                                    <input
                                        type="number"
                                        value={gapDays}
                                        onChange={e => setGapDays(Math.max(0, +e.target.value || 0))}
                                        min="0"
                                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Play Days
                                    </label>
                                    <input
                                        type="number"
                                        value={playDays}
                                        onChange={e => setPlayDays(Math.max(1, +e.target.value || 1))}
                                        min="1"
                                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Rest Days
                                    </label>
                                    <input
                                        type="number"
                                        value={restDays}
                                        onChange={e => setRestDays(Math.max(0, +e.target.value || 0))}
                                        min="0"
                                        className="w-full p-3 rounded-xl border-2 border-gray-200 focus:border-primary-500 focus:outline-none font-semibold"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Off Days Selector */}
                    <div className="bg-white/80 backdrop-blur rounded-2xl p-6">
                        <h4 className="font-black text-gray-900 mb-4">🚫 Off Days (Optional)</h4>
                        <div className="flex gap-2 flex-wrap">
                            {dayNames.map((d, i) => (
                                <button
                                    key={d}
                                    onClick={() => toggleOffDay(i)}
                                    className={clsx(
                                        'px-4 py-2 rounded-xl font-bold transition-all',
                                        offDays.includes(i)
                                            ? 'bg-red-500 text-white shadow-lg scale-105'
                                            : 'bg-white border-2 border-gray-200 hover:border-red-300'
                                    )}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Click to mark days when matches should NOT be scheduled
                        </p>
                    </div>

                    {/* Preview */}
                    {showPreview && previewDates.length > 0 && (
                        <div className="bg-white/80 backdrop-blur rounded-2xl p-6">
                            <h4 className="font-black text-gray-900 mb-4">📋 Schedule Preview</h4>
                            <div className="space-y-3">
                                {previewDates.map((p) => (
                                    <div key={p.round} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                        <div className="w-12 h-12 bg-primary-600 text-white rounded-xl flex items-center justify-center font-black">
                                            {p.round}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-900">
                                                Round {p.round}: {p.dates.join(' + ')}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {p.matchCount} matches
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex-1 bg-white border-2 border-primary-600 text-primary-600 px-6 py-4 rounded-2xl font-black hover:bg-primary-50 transition-colors"
                        >
                            {showPreview ? 'Hide Preview' : 'Preview Schedule'}
                        </button>
                        <button
                            onClick={() => generateSchedule.mutate()}
                            disabled={generateSchedule.isPending || !teams || teams.length < 2}
                            className="flex-1 bg-primary-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generateSchedule.isPending ? 'Generating...' : 'Generate Schedule'}
                        </button>
                    </div>

                    {teams && teams.length < 2 && (
                        <div className="bg-yellow-100 border-2 border-yellow-300 rounded-xl p-4 text-center">
                            <p className="text-yellow-800 font-bold">
                                ⚠️ You need at least 2 teams to generate a schedule
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ---------------- MATCHES ---------------- */}
            {sortedRounds.length === 0 && !showAdminControls && (
                <div className="text-center py-20">
                    <p className="text-gray-400 text-xl font-bold">No matches scheduled yet</p>
                    {isAdmin && (
                        <button
                            onClick={() => setShowAdminControls(true)}
                            className="mt-4 bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary-700"
                        >
                            Generate Schedule
                        </button>
                    )}
                </div>
            )}

            {sortedRounds.map(roundNum => (
                <section
                    key={roundNum}
                    className="bg-slate-100 border-2 border-slate-200 rounded-[3rem] p-6 md:p-8"
                >
                    {/* Round Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-2xl font-black">
                            {roundNum}
                        </div>
                        <h2 className="text-2xl font-black">Round {roundNum}</h2>
                    </div>

                    <div className="space-y-6">
                        {Object.entries(roundsMap[roundNum]).map(
                            ([dateKey, dayMatches]) => (
                                <div key={dateKey} className="space-y-4">
                                    <div className="flex items-center gap-3 text-gray-600 font-bold">
                                        <Clock size={16} />
                                        {format(parseISO(dateKey), 'EEEE, MMMM do')}
                                    </div>

                                    {/* FULL WIDTH MATCH CARDS */}
                                    <div className="flex flex-col gap-6">
                                        {dayMatches.map((m: any) => (
                                            <div
                                                key={m.id}
                                                className="
                          w-full
                          bg-gradient-to-r from-white via-slate-50 to-white
                          border-2 border-slate-300
                          rounded-[2.5rem]
                          p-6 md:p-8 lg:p-10
                          shadow-xl
                        "
                                            >
                                                <div className="flex items-center justify-between gap-10">

                                                    {/* HOME */}
                                                    <div className="flex items-center gap-6 w-1/3">
                                                        <div className="w-28 h-28 lg:w-36 lg:h-36 bg-white rounded-2xl p-3 border shadow">
                                                            {m.homeTeam.logoUrl && (
                                                                <img
                                                                    src={getImageUrl(m.homeTeam.logoUrl)!}
                                                                    className="w-full h-full object-contain"
                                                                    alt={m.homeTeam.name}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="text-2xl lg:text-3xl font-black">
                                                            {m.homeTeam.name}
                                                        </div>
                                                    </div>

                                                    {/* CENTER */}
                                                    <div className="flex flex-col items-center w-1/3">
                                                        {m.status === 'PLAYED' ? (
                                                            <>
                                                                <div className="bg-gray-900 text-white text-3xl font-black px-6 py-3 rounded-2xl">
                                                                    {m.homeScore} – {m.awayScore}
                                                                </div>
                                                                <div className="flex items-center gap-1 text-green-600 text-xs mt-2 font-bold">
                                                                    <CheckCircle size={12} />
                                                                    FULL TIME
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="text-gray-400 text-xl font-black tracking-[0.4em]">
                                                                VS
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* AWAY */}
                                                    <div className="flex items-center gap-6 w-1/3 justify-end">
                                                        <div className="text-2xl lg:text-3xl font-black text-right">
                                                            {m.awayTeam.name}
                                                        </div>
                                                        <div className="w-28 h-28 lg:w-36 lg:h-36 bg-white rounded-2xl p-3 border shadow">
                                                            {m.awayTeam.logoUrl && (
                                                                <img
                                                                    src={getImageUrl(m.awayTeam.logoUrl)!}
                                                                    className="w-full h-full object-contain"
                                                                    alt={m.awayTeam.name}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </section>
            ))}
        </div>
    );
};
