import { useQuery } from '@tanstack/react-query';
import { Award, Divide, Filter, TrendingUp, User } from 'lucide-react';
import React, { useState } from 'react';
import api, { getImageUrl } from '../lib/api';

export const PlayerStats: React.FC = () => {
    const [teamFilter, setTeamFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'motmCount' | 'goals' | 'assists'>('motmCount');

    // Fetch players and stats
    const { data: teams } = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/teams').then(r => r.data) });
    const { data: stats } = useQuery({ queryKey: ['league-stats'], queryFn: () => api.get('/stats/league').then(r => r.data) });
    const { data: topPerformers } = useQuery({ queryKey: ['top-performers'], queryFn: () => api.get('/stats/top-performers').then(r => r.data) });

    // Filter and sort stats
    const filteredStats = stats?.filter((p: any) => teamFilter === 'all' || p.team.id === teamFilter)
        .sort((a: any, b: any) => {
            if (sortBy === 'motmCount') {
                if (b.motmCount !== a.motmCount) return b.motmCount - a.motmCount;
                if (b.goals !== a.goals) return b.goals - a.goals;
                if (b.assists !== a.assists) return b.assists - a.assists;
                return a.redCards - b.redCards;
            }
            if (sortBy === 'goals') {
                if (b.goals !== a.goals) return b.goals - a.goals;
                if (b.motmCount !== a.motmCount) return b.motmCount - a.motmCount;
                return b.assists - a.assists;
            }
            if (sortBy === 'assists') {
                if (b.assists !== a.assists) return b.assists - a.assists;
                if (b.goals !== a.goals) return b.goals - a.goals;
                return b.motmCount - a.motmCount;
            }
            return 0;
        });

    return (
        <div className="space-y-10 pb-20 max-w-7xl mx-auto px-4">
            {/* Header */}
            <header>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Team Respect Player <span className="text-primary-600 underline decoration-primary-200">Statistics</span></h1>
                <p className="text-gray-500 mt-2 font-medium">Top performers, rankings, and individual records.</p>
            </header>

            {/* Top Performers Cards */}
            {topPerformers && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Top Scorer */}
                    <div className="glass p-6 rounded-[2rem] border border-white shadow-xl bg-gradient-to-br from-yellow-50 to-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <TrendingUp size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-2xl">
                                    <Award size={24} />
                                </div>
                                <h3 className="text-lg font-black text-gray-800 uppercase tracking-wider">Golden Boot</h3>
                            </div>
                            {topPerformers.topScorers[0] ? (
                                <div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div>
                                            <p className="text-2xl font-black text-gray-900">{topPerformers.topScorers[0].name}</p>
                                            <p className="text-sm font-bold text-gray-400">{topPerformers.topScorers[0].team.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-4xl font-black text-yellow-500">
                                        {topPerformers.topScorers[0].goals} <span className="text-sm text-gray-400 font-medium">GOALS</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-400 font-medium">No goals yet</p>
                            )}
                        </div>
                    </div>

                    {/* Top Assister */}
                    <div className="glass p-6 rounded-[2rem] border border-white shadow-xl bg-gradient-to-br from-blue-50 to-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Divide size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                                    <TrendingUp size={24} />
                                </div>
                                <h3 className="text-lg font-black text-gray-800 uppercase tracking-wider">Playmaker</h3>
                            </div>
                            {topPerformers.topAssisters[0] ? (
                                <div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div>
                                            <p className="text-2xl font-black text-gray-900">{topPerformers.topAssisters[0].name}</p>
                                            <p className="text-sm font-bold text-gray-400">{topPerformers.topAssisters[0].team.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-4xl font-black text-blue-500">
                                        {topPerformers.topAssisters[0].assists} <span className="text-sm text-gray-400 font-medium">ASSISTS</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-400 font-medium">No assists yet</p>
                            )}
                        </div>
                    </div>

                    {/* MVP */}
                    <div className="glass p-6 rounded-[2rem] border border-white shadow-xl bg-gradient-to-br from-purple-50 to-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Award size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                                    <Award size={24} />
                                </div>
                                <h3 className="text-lg font-black text-gray-800 uppercase tracking-wider">Best Player</h3>
                            </div>
                            {topPerformers.bestPlayers[0] ? (
                                <div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <div>
                                            <p className="text-2xl font-black text-gray-900">{topPerformers.bestPlayers[0].name}</p>
                                            <p className="text-sm font-bold text-gray-400">{topPerformers.bestPlayers[0].team.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-4xl font-black text-purple-500">
                                        {topPerformers.bestPlayers[0].motmCount} <span className="text-sm text-gray-400 font-medium">MOTM</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-400 font-medium">No data yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Table Section */}
            <div className="glass rounded-[2.5rem] border border-white/50 shadow-2xl shadow-gray-200/50 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h2 className="text-2xl font-black text-gray-800">Rankings</h2>

                    <div className="flex flex-wrap gap-4">
                        {/* Team Filter */}
                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                            <Filter size={16} className="text-gray-400" />
                            <select
                                value={teamFilter}
                                onChange={(e) => setTeamFilter(e.target.value)}
                                className="bg-transparent font-bold text-gray-600 outline-none cursor-pointer"
                            >
                                <option value="all">All Teams</option>
                                {teams?.map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sort Toggle */}
                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                            <button
                                onClick={() => setSortBy('motmCount')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${sortBy === 'motmCount' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                MOTM
                            </button>
                            <button
                                onClick={() => setSortBy('goals')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${sortBy === 'goals' ? 'bg-white shadow-sm text-yellow-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                GOALS
                            </button>
                            <button
                                onClick={() => setSortBy('assists')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${sortBy === 'assists' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                ASSISTS
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-2 md:px-8 py-3 md:py-5 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-wider">Rank</th>
                                <th className="px-2 md:px-8 py-3 md:py-5 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-wider">Player</th>
                                <th className="px-2 md:px-8 py-3 md:py-5 text-left text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-wider">Team</th>
                                <th className="px-2 md:px-8 py-3 md:py-5 text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-wider">MOTM</th>
                                <th className="px-2 md:px-8 py-3 md:py-5 text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-wider">G</th>
                                <th className="px-2 md:px-8 py-3 md:py-5 text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-wider">A</th>
                                <th className="px-2 md:px-8 py-3 md:py-5 text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-wider hidden sm:table-cell">Cards</th>
                                <th className="px-2 md:px-8 py-3 md:py-5 text-center text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-wider hidden sm:table-cell">M</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStats?.map((player: any, index: number) => (
                                <tr key={player.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-2 md:px-8 py-3 md:py-4">
                                        <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-black text-xs md:text-sm
                                            ${index === 0 ? 'bg-yellow-100 text-yellow-600' :
                                                index === 1 ? 'bg-gray-100 text-gray-600' :
                                                    index === 2 ? 'bg-orange-100 text-orange-600' : 'text-gray-400'}`}
                                        >
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="px-2 md:px-8 py-3 md:py-4">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <div>
                                                <p className="font-extrabold text-sm md:text-base text-gray-900 truncate max-w-[150px] sm:max-w-none">{player.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 md:px-8 py-3 md:py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="hidden sm:block w-6 h-6 rounded-md bg-gray-50 border border-gray-100 overflow-hidden">
                                                {player.team.logoUrl && <img src={getImageUrl(player.team.logoUrl)!} className="w-full h-full object-cover" />}
                                            </div>
                                            <span className="text-[10px] md:text-sm font-bold text-gray-600 truncate max-w-[60px] sm:max-w-none">{player.team.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 md:px-8 py-3 md:py-4 text-center">
                                        <span className="inline-block px-2 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg bg-gray-900 text-white font-black text-[10px] md:text-sm shadow-lg shadow-gray-200">
                                            {player.motmCount}
                                        </span>
                                    </td>
                                    <td className="px-2 md:px-8 py-3 md:py-4 text-center font-bold text-xs md:text-sm text-gray-600">{player.goals}</td>
                                    <td className="px-2 md:px-8 py-3 md:py-4 text-center font-bold text-xs md:text-sm text-gray-600">{player.assists}</td>
                                    <td className="px-2 md:px-8 py-3 md:py-4 text-center hidden sm:table-cell">
                                        <div className="flex items-center justify-center gap-2">
                                            {player.yellowCards > 0 && (
                                                <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200">
                                                    {player.yellowCards}
                                                </span>
                                            )}
                                            {player.redCards > 0 && (
                                                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                                                    {player.redCards}
                                                </span>
                                            )}
                                            {player.yellowCards === 0 && player.redCards === 0 && (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 md:px-8 py-3 md:py-4 text-center font-bold text-xs md:text-sm text-gray-400 hidden sm:table-cell">{player.matchesPlayed}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {(!filteredStats || filteredStats.length === 0) && (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <User className="text-gray-300" size={32} />
                        </div>
                        <h3 className="text-xl font-black text-gray-300">No players found</h3>
                    </div>
                )}
            </div>
        </div>
    );
};
