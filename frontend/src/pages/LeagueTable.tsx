import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import React from 'react';
import api, { getImageUrl } from '../lib/api';

export const LeagueTable: React.FC = () => {
    const { data: table, isLoading } = useQuery({
        queryKey: ['league-table'],
        queryFn: async () => {
            const res = await api.get('/table');
            return res.data;
        }
    });

    if (isLoading) return <div className="h-96 flex items-center justify-center text-primary-500">Loading table...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Team Respect League Standings</h1>
                <div className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold">Live Updates</div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap">
                        <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] md:text-sm font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-2 md:px-8 py-3 md:py-6 text-left w-8 md:w-20">Pos</th>
                                <th className="px-2 md:px-8 py-3 md:py-6 text-left">Team</th>
                                <th className="px-1 md:px-6 py-3 md:py-6 text-center">P</th>
                                <th className="px-1 md:px-6 py-3 md:py-6 text-center">W</th>
                                <th className="px-1 md:px-6 py-3 md:py-6 text-center hidden sm:table-cell">D</th>
                                <th className="px-1 md:px-6 py-3 md:py-6 text-center hidden sm:table-cell">L</th>
                                <th className="px-1 md:px-6 py-3 md:py-6 text-center hidden xl:table-cell">GF</th>
                                <th className="px-1 md:px-6 py-3 md:py-6 text-center hidden xl:table-cell">GA</th>
                                <th className="px-1 md:px-6 py-3 md:py-6 text-center">GD</th>
                                <th className="px-2 md:px-8 py-3 md:py-6 text-center font-black text-gray-900">Pts</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {table?.map((team: any, idx: number) => (
                                <tr key={team.id} className={clsx(
                                    "hover:bg-gray-50/50 transition-all group",
                                    idx === 0 && "bg-gradient-to-r from-yellow-50/30 to-transparent"
                                )}>
                                    <td className="px-2 md:px-8 py-4 md:py-10">
                                        <div className={clsx(
                                            "w-6 h-6 md:w-16 md:h-16 rounded-lg md:rounded-2xl flex items-center justify-center text-xs md:text-2xl font-black shadow-sm transition-transform group-hover:scale-110",
                                            idx === 0 ? "bg-yellow-100 text-yellow-700" :
                                                idx === 1 ? "bg-gray-100 text-gray-700" :
                                                    idx === 2 ? "bg-orange-50 text-orange-700" : "bg-white border md:border-2 border-gray-100 text-gray-400"
                                        )}>
                                            {idx + 1}
                                        </div>
                                    </td>
                                    <td className="px-2 md:px-8 py-4 md:py-10">
                                        <div className="flex items-center gap-2 md:gap-8">
                                            <div className="relative flex-shrink-0">
                                                {team.logoUrl ? (
                                                    <img src={getImageUrl(team.logoUrl)!} className="w-12 h-12 md:w-24 md:h-24 object-contain drop-shadow-sm md:drop-shadow-lg transition-transform group-hover:scale-105 duration-300" crossOrigin="anonymous" />
                                                ) : (
                                                    <div className="w-12 h-12 md:w-24 md:h-24 rounded-lg md:rounded-3xl bg-primary-50 text-primary-300 flex items-center justify-center font-black text-xs md:text-5xl">
                                                        {team.name.substring(0, 1).toUpperCase()}
                                                    </div>
                                                )}
                                                {idx === 0 && (
                                                    <div className="absolute -top-1 -right-1 md:-top-3 md:-right-3 bg-yellow-400 text-white p-0.5 md:p-2 rounded-full shadow-lg">
                                                        <Trophy className="w-3 h-3 md:w-5 md:h-5" fill="currentColor" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-black text-sm md:text-4xl text-gray-900 tracking-tight truncate max-w-[100px] md:max-w-none">{team.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-1 md:px-6 py-4 md:py-10 text-center text-xs md:text-2xl text-gray-400 font-bold">{team.played}</td>
                                    <td className="px-1 md:px-6 py-4 md:py-10 text-center text-xs md:text-2xl text-gray-900 font-black">{team.won}</td>
                                    <td className="px-1 md:px-6 py-4 md:py-10 text-center text-xs md:text-2xl text-gray-400 font-bold hidden sm:table-cell">{team.drawn}</td>
                                    <td className="px-1 md:px-6 py-4 md:py-10 text-center text-xs md:text-2xl text-gray-400 font-bold hidden sm:table-cell">{team.lost}</td>
                                    <td className="px-1 md:px-6 py-4 md:py-10 text-center text-xs text-gray-400 font-bold hidden xl:table-cell">{team.gf}</td>
                                    <td className="px-1 md:px-6 py-4 md:py-10 text-center text-xs text-gray-400 font-bold hidden xl:table-cell">{team.ga}</td>
                                    <td className="px-1 md:px-6 py-4 md:py-10 text-center">
                                        <span className={clsx(
                                            "px-1.5 py-0.5 md:px-4 md:py-2 rounded md:rounded-xl text-[10px] md:text-xl font-black",
                                            team.gd > 0 ? "bg-green-100 text-green-700" :
                                                team.gd < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                                        )}>
                                            {team.gd > 0 ? '+' : ''}{team.gd}
                                        </span>
                                    </td>
                                    <td className="px-2 md:px-8 py-4 md:py-10 text-center font-black text-lg md:text-6xl text-primary-600">
                                        {team.pts}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!table || table.length === 0) && (
                        <div className="p-12 text-center text-gray-400">
                            No teams in the league yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
