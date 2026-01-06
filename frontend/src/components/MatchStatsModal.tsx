import { Dialog, Transition } from '@headlessui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import api from '../lib/api';

interface MatchStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: any;
}

interface PlayerStat {
    playerId: string;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    minutesPlayed?: number;
}

export const MatchStatsModal: React.FC<MatchStatsModalProps> = ({ isOpen, onClose, match }) => {
    const queryClient = useQueryClient();
    const [stats, setStats] = useState<Record<string, PlayerStat>>({});
    const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');

    // Fetch existing stats if any
    const { data: existingStats } = useQuery({
        queryKey: ['match-stats', match?.id],
        queryFn: () => api.get(`/stats/match/${match?.id}`).then(r => r.data),
        enabled: !!match?.id && isOpen
    });

    // Initialize stats when match or existing stats load
    useEffect(() => {
        if (match && isOpen) {
            const initialStats: Record<string, PlayerStat> = {};

            // Helper to init player stat
            const initPlayer = (p: any) => {
                // Check if we have existing stat for this player
                const existing = existingStats?.find((s: any) => s.playerId === p.id);

                initialStats[p.id] = {
                    playerId: p.id,
                    goals: existing?.goals || 0,
                    assists: existing?.assists || 0,
                    yellowCards: existing?.yellowCards || 0,
                    redCards: existing?.redCards || 0,
                    minutesPlayed: existing?.minutesPlayed || 90
                };
            };

            match.homeTeam?.players?.forEach(initPlayer);
            match.awayTeam?.players?.forEach(initPlayer);

            setStats(initialStats);
        }
    }, [match, isOpen, existingStats]);

    const saveStats = useMutation({
        mutationFn: (data: PlayerStat[]) => api.post(`/stats/match/${match.id}`, { playerStats: data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['match-stats'] });
            queryClient.invalidateQueries({ queryKey: ['league-stats'] });
            alert('Stats saved successfully!');
            onClose();
        },
        onError: (err: any) => {
            alert('Failed to save stats: ' + (err.response?.data?.message || err.message));
        }
    });

    const updateStat = (playerId: string, field: keyof PlayerStat, value: number) => {
        setStats(prev => ({
            ...prev,
            [playerId]: {
                ...prev[playerId],
                [field]: Math.max(0, value)
            }
        }));
    };

    if (!match) return null;

    const currentTeam = activeTab === 'home' ? match.homeTeam : match.awayTeam;
    const isHome = activeTab === 'home';

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-[2rem] bg-white p-6(0) text-left align-middle shadow-xl transition-all border border-white/20">
                                {/* Header */}
                                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                                    <div>
                                        <Dialog.Title as="h3" className="text-xl font-black text-gray-900">
                                            Match Statistics
                                        </Dialog.Title>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">
                                            {match.homeTeam.name} vs {match.awayTeam.name} • {new Date(match.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm border border-gray-100 transition-all">
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b border-gray-100">
                                    <button
                                        onClick={() => setActiveTab('home')}
                                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${isHome ? 'border-primary-500 text-primary-600 bg-primary-50/30' : 'border-transparent text-gray-400 hover:bg-gray-50'
                                            }`}
                                    >
                                        {match.homeTeam.name}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('away')}
                                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${!isHome ? 'border-primary-500 text-primary-600 bg-primary-50/30' : 'border-transparent text-gray-400 hover:bg-gray-50'
                                            }`}
                                    >
                                        {match.awayTeam.name}
                                    </button>
                                </div>

                                {/* Player List */}
                                <div className="p-6 max-h-[60vh] overflow-y-auto">
                                    {!currentTeam.players || currentTeam.players.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 font-medium">
                                            No players found for this team. Please add players in the registry first.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-12 gap-4 text-xs font-black text-gray-400 uppercase tracking-wider px-4 pb-2">
                                                <div className="col-span-4">Player</div>
                                                <div className="col-span-2 text-center">Goals</div>
                                                <div className="col-span-2 text-center">Assists</div>
                                                <div className="col-span-2 text-center">Cards</div>
                                                <div className="col-span-2 text-center">Mins</div>
                                            </div>

                                            {currentTeam.players.map((player: any) => {
                                                const pApps = stats[player.id] || { goals: 0, assists: 0, yellowCards: 0, redCards: 0, minutesPlayed: 90 };
                                                return (
                                                    <div key={player.id} className="grid grid-cols-12 gap-4 items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                                                        <div className="col-span-4 flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">
                                                                {player.number}
                                                            </div>
                                                            <span className="font-bold text-gray-700 truncate">{player.name}</span>
                                                        </div>

                                                        {/* Goals */}
                                                        <div className="col-span-2 flex justify-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-12 h-10 text-center rounded-lg border border-gray-200 font-bold focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                                                                value={pApps.goals}
                                                                onChange={(e) => updateStat(player.id, 'goals', parseInt(e.target.value) || 0)}
                                                            />
                                                        </div>

                                                        {/* Assists */}
                                                        <div className="col-span-2 flex justify-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-12 h-10 text-center rounded-lg border border-gray-200 font-bold focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none"
                                                                value={pApps.assists}
                                                                onChange={(e) => updateStat(player.id, 'assists', parseInt(e.target.value) || 0)}
                                                            />
                                                        </div>

                                                        {/* Cards */}
                                                        <div className="col-span-2 flex justify-center gap-2">
                                                            <div
                                                                className={`w-8 h-10 rounded shadow-sm flex items-center justify-center cursor-pointer transition-transform active:scale-90 ${pApps.yellowCards > 0 ? 'bg-yellow-400 ring-2 ring-yellow-200' : 'bg-gray-200 hover:bg-yellow-200'}`}
                                                                onClick={() => updateStat(player.id, 'yellowCards', pApps.yellowCards === 0 ? 1 : 0)}
                                                                title="Yellow Card"
                                                            >
                                                                <div className="w-full h-full bg-yellow-400 opacity-20" />
                                                            </div>
                                                            <div
                                                                className={`w-8 h-10 rounded shadow-sm flex items-center justify-center cursor-pointer transition-transform active:scale-90 ${pApps.redCards > 0 ? 'bg-red-500 ring-2 ring-red-200' : 'bg-gray-200 hover:bg-red-200'}`}
                                                                onClick={() => updateStat(player.id, 'redCards', pApps.redCards === 0 ? 1 : 0)}
                                                                title="Red Card"
                                                            >
                                                                <div className="w-full h-full bg-red-500 opacity-20" />
                                                            </div>
                                                        </div>

                                                        {/* Minutes */}
                                                        <div className="col-span-2 flex justify-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="120"
                                                                className="w-12 h-10 text-center rounded-lg border border-gray-200 font-bold text-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none text-xs"
                                                                value={pApps.minutesPlayed}
                                                                onChange={(e) => updateStat(player.id, 'minutesPlayed', parseInt(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => saveStats.mutate(Object.values(stats))}
                                        disabled={saveStats.isPending}
                                        className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50"
                                    >
                                        {saveStats.isPending ? 'Saving...' : 'Save Statistics'}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
