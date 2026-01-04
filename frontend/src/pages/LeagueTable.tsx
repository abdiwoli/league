import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import React from 'react';
import api from '../lib/api';

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
                <h1 className="text-2xl font-bold text-gray-900">League Standings</h1>
                <div className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold">Live Updates</div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap">
                        <thead className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left w-12">Pos</th>
                                <th className="px-6 py-4 text-left">Team</th>
                                <th className="px-4 py-4 text-center">P</th>
                                <th className="px-4 py-4 text-center">W</th>
                                <th className="px-4 py-4 text-center">D</th>
                                <th className="px-4 py-4 text-center">L</th>
                                <th className="px-4 py-4 text-center hidden md:table-cell">GF</th>
                                <th className="px-4 py-4 text-center hidden md:table-cell">GA</th>
                                <th className="px-4 py-4 text-center">GD</th>
                                <th className="px-6 py-4 text-center font-bold text-gray-900">Pts</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {table?.map((team: any, idx: number) => (
                                <tr key={team.id} className={clsx(
                                    "hover:bg-gray-50/50 transition-colors",
                                    idx === 0 && "bg-gradient-to-r from-yellow-50/50 to-transparent"
                                )}>
                                    <td className="px-6 py-4">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                                            idx === 0 ? "bg-yellow-100 text-yellow-700" :
                                                idx === 1 ? "bg-gray-100 text-gray-700" :
                                                    idx === 2 ? "bg-orange-50 text-orange-700" : "bg-white border text-gray-500"
                                        )}>
                                            {idx + 1}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            {team.logoUrl ? (
                                                <img src={team.logoUrl} className="w-8 h-8 rounded-full object-cover mr-3 bg-gray-100" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold mr-3 text-xs">
                                                    {team.name.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="font-semibold text-gray-900">{team.name}</span>
                                            {idx === 0 && <Trophy size={14} className="ml-2 text-yellow-500" />}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-gray-500">{team.played}</td>
                                    <td className="px-4 py-4 text-center text-gray-900 font-medium">{team.won}</td>
                                    <td className="px-4 py-4 text-center text-gray-500">{team.drawn}</td>
                                    <td className="px-4 py-4 text-center text-gray-500">{team.lost}</td>
                                    <td className="px-4 py-4 text-center text-gray-400 hidden md:table-cell">{team.gf}</td>
                                    <td className="px-4 py-4 text-center text-gray-400 hidden md:table-cell">{team.ga}</td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={clsx(
                                            "px-2 py-1 rounded text-xs font-medium",
                                            team.gd > 0 ? "bg-green-50 text-green-700" :
                                                team.gd < 0 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"
                                        )}>
                                            {team.gd > 0 ? '+' : ''}{team.gd}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-lg text-primary-700">
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
