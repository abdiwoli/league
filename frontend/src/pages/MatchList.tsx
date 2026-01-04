import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { Calendar, CheckCircle } from 'lucide-react';
import React from 'react';
import api from '../lib/api';

export const MatchList: React.FC = () => {
    const { data: matches, isLoading } = useQuery({
        queryKey: ['matches'],
        queryFn: async () => {
            const res = await api.get('/matches');
            return res.data;
        }
    });

    if (isLoading) return <div className="text-center p-8 text-gray-500">Loading matches...</div>;

    // Group by Matchday or Date? Matches are strictly "Matchday X".
    // Let's group by Round then Matchday.

    // Actually, simpler: Group by Matchday.
    const groupedMatches: Record<string, any[]> = {};
    matches?.forEach((m: any) => {
        const key = `Matchday ${m.matchday}`;
        if (!groupedMatches[key]) groupedMatches[key] = [];
        groupedMatches[key].push(m);
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Match Schedule</h1>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm text-sm text-gray-500">
                    <Calendar size={16} className="inline mr-2 mb-0.5" />
                    Season 2026
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(groupedMatches).map(([day, dayMatches]) => (
                    <div key={day} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                            <span className="font-semibold text-gray-700">{day}</span>
                            <span className="text-xs text-gray-400 font-medium">
                                {dayMatches[0].date && format(parseISO(dayMatches[0].date), 'EEE, MMM d')}
                            </span>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {dayMatches.map((match: any) => (
                                <div key={match.id} className="p-4 flex items-center justify-between">
                                    <div className="flex-1 text-right pr-4">
                                        <span className={clsx("font-semibold", match.homeScore > match.awayScore ? "text-gray-900" : "text-gray-600")}>
                                            {match.homeTeam.name}
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-center min-w-[3rem]">
                                        {match.status === 'PLAYED' ? (
                                            <div className="bg-gray-100 px-3 py-1 rounded text-sm font-bold text-gray-800">
                                                {match.homeScore} - {match.awayScore}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                                VS
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 text-left pl-4">
                                        <span className={clsx("font-semibold", match.awayScore > match.homeScore ? "text-gray-900" : "text-gray-600")}>
                                            {match.awayTeam.name}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {dayMatches.every((m: any) => m.status === 'PLAYED') && (
                            <div className="bg-green-50/50 p-2 text-center text-xs text-green-600 font-medium flex items-center justify-center">
                                <CheckCircle size={12} className="mr-1" /> Completed
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {(!matches || matches.length === 0) && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                    <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No matches scheduled</h3>
                    <p className="text-gray-500 mt-1">Wait for the admin to generate the schedule.</p>
                </div>
            )}
        </div>
    );
};
