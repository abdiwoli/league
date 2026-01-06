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

    const [showAdminControls, setShowAdminControls] = useState(false);
    const [rounds, setRounds] = useState(1);
    const [gapDays, setGapDays] = useState(1);
    const [playDays, setPlayDays] = useState(2);
    const [restDays, setRestDays] = useState(1);
    const [startDate, setStartDate] = useState(format(addDays(startOfToday(), 1), 'yyyy-MM-dd'));
    const [offDays, setOffDays] = useState<number[]>([]);

    const generateSchedule = useMutation({
        mutationFn: async () =>
            api.post('/matches/schedule', {
                rounds,
                daysBetweenMatches: gapDays,
                startDate,
                offDays,
                playDays,
                restDays
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['league-table'] });
            setShowAdminControls(false);
            alert('Schedule generated successfully!');
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCw className="animate-spin" size={32} />
            </div>
        );
    }

    const roundsMap: Record<number, Record<string, any[]>> = {};
    matches?.forEach((m: any) => {
        if (!roundsMap[m.round]) roundsMap[m.round] = {};
        const dateKey = format(parseISO(m.date), 'yyyy-MM-dd');
        if (!roundsMap[m.round][dateKey]) roundsMap[m.round][dateKey] = [];
        roundsMap[m.round][dateKey].push(m);
    });

    const sortedRounds = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);

    return (
        <div className="max-w-6xl mx-auto px-4 pb-16 space-y-8">
            {sortedRounds.map(roundNum => (
                <section
                    key={roundNum}
                    className="rounded-3xl border-2 border-gray-100 bg-white p-4 md:p-6"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-black">
                            {roundNum}
                        </div>
                        <h2 className="text-xl font-black">Round {roundNum}</h2>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(roundsMap[roundNum]).map(([dateKey, dayMatches]) => (
                            <div key={dateKey} className="space-y-3">
                                <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                    <Clock size={14} />
                                    {format(parseISO(dateKey), 'EEEE, MMM d')}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {dayMatches.map((m: any) => (
                                        <div
                                            key={m.id}
                                            className="border-2 border-gray-100 rounded-2xl p-4"
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                {['homeTeam', 'awayTeam'].map((side: any, i) => {
                                                    const team = i === 0 ? m.homeTeam : m.awayTeam;
                                                    return (
                                                        <div key={side} className="flex-1 text-center space-y-2">
                                                            <div className="w-24 h-24 md:w-28 md:h-28 mx-auto bg-gray-50 rounded-xl p-2">
                                                                {team.logoUrl && (
                                                                    <img
                                                                        src={getImageUrl(team.logoUrl)!}
                                                                        className="w-full h-full object-contain"
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="text-lg font-black leading-tight">
                                                                {team.name}
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                <div className="text-sm font-black px-3 py-1.5 bg-gray-100 rounded-xl">
                                                    {m.status === 'PLAYED'
                                                        ? `${m.homeScore} - ${m.awayScore}`
                                                        : 'VS'}
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
    );
};
