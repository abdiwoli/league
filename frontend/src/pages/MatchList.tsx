import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { addDays, format, parseISO, startOfToday } from 'date-fns';
import { CheckCircle, Clock, RefreshCw, Settings2 } from 'lucide-react';
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

    /* ---------------- Admin state ---------------- */
    const [showAdminControls, setShowAdminControls] = useState(false);
    const [rounds, setRounds] = useState(1);
    const [gapDays, setGapDays] = useState(1);
    const [startDate, setStartDate] = useState(
        format(addDays(startOfToday(), 1), 'yyyy-MM-dd')
    );
    const [offDays, setOffDays] = useState<number[]>([]);

    const generateSchedule = useMutation({
        mutationFn: async () =>
            api.post('/matches/schedule', {
                rounds,
                daysBetweenMatches: gapDays,
                startDate,
                offDays
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['league-table'] });
            setShowAdminControls(false);
            alert('Schedule generated successfully!');
        }
    });

    const toggleOffDay = (day: number) => {
        setOffDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

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
                        className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold"
                    >
                        <Settings2 size={18} />
                        {showAdminControls ? 'Close' : 'Generate'}
                    </button>
                )}
            </div>

            {/* ---------------- Admin Panel ---------------- */}
            {isAdmin && showAdminControls && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-6 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="p-3 rounded-xl border"
                        />
                        <input
                            type="number"
                            value={rounds}
                            onChange={e => setRounds(+e.target.value || 1)}
                            placeholder="Rounds"
                            className="p-3 rounded-xl border"
                        />
                        <input
                            type="number"
                            value={gapDays}
                            onChange={e => setGapDays(+e.target.value || 1)}
                            placeholder="Gap days"
                            className="p-3 rounded-xl border"
                        />
                        <button
                            onClick={() => generateSchedule.mutate()}
                            className="bg-primary-600 text-white rounded-xl font-black"
                        >
                            Generate
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {dayNames.map((d, i) => (
                            <button
                                key={d}
                                onClick={() => toggleOffDay(i)}
                                className={clsx(
                                    'w-10 h-10 rounded-xl font-bold',
                                    offDays.includes(i)
                                        ? 'bg-red-500 text-white'
                                        : 'bg-white border'
                                )}
                            >
                                {d[0]}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ---------------- MATCHES ---------------- */}
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
