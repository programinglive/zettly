import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Target, TrendingUp, Calendar, CheckCircle, Circle, Flame, Award, BarChart3, Edit } from 'lucide-react';

import AppLayout from '../../Layouts/AppLayout';
import { Button } from '../../Components/ui/button';

const HabitsIndex = ({ habits, currentOrganization }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const handleToggleHabit = (habitId, currentCount) => {
        const newCount = currentCount > 0 ? 0 : 1;

        router.post(
            route('habits.toggle', habitId),
            { count: newCount },
            {
                preserveScroll: true,
                onSuccess: () => {
                    // Habit toggled successfully
                },
                onError: (errors) => {
                    console.error('Error toggling habit:', errors);
                }
            }
        );
    };

    const getCompletionRate = (habit) => {
        const recentEntries = habit.entries?.slice(-30) || [];
        if (recentEntries.length === 0) return 0;

        const completedDays = recentEntries.filter(entry =>
            entry.count >= habit.target_frequency
        ).length;

        return Math.round((completedDays / 30) * 100);
    };

    // Calculate overall stats
    const totalHabits = habits.length;
    const completedToday = habits.filter(h => h.today_target_met).length;
    const todayCompletionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
    const totalStreak = habits.reduce((sum, h) => sum + (h.streak?.current_streak || 0), 0);
    const longestStreak = Math.max(...habits.map(h => h.streak?.current_streak || 0), 0);

    const getIconDisplay = (iconName) => {
        const icons = {
            'circle': '●',
            'star': '★',
            'heart': '♥',
            'check': '✓',
            'target': '◎',
        };
        return icons[iconName] || '●';
    };

    return (
        <AppLayout title="Habits">
            <Head title="Habits" />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div className="flex-1">
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight">
                            Your Habits
                            {currentOrganization && (
                                <span className="ml-4 text-2xl font-light text-gray-400 dark:text-gray-500">
                                    / {currentOrganization.name}
                                </span>
                            )}
                        </h1>
                        <p className="mt-4 text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
                            Build consistency and track your journey to better habits, one day at a time.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('habits.create', {
                                organization_id: currentOrganization?.id
                            })}
                        >
                            <Button className="rounded-full px-6 py-6 h-auto text-base font-semibold transition shadow-sm bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                                <Plus className="w-5 h-5 mr-2" />
                                Add Habit
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                {totalHabits > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                        {[
                            { label: 'Total Habits', value: totalHabits, icon: Target, color: 'text-indigo-600' },
                            { label: "Today's Progress", value: `${todayCompletionRate}%`, icon: CheckCircle, color: 'text-emerald-600' },
                            { label: 'Longest Streak', value: `${longestStreak} days`, icon: Flame, color: 'text-orange-600' },
                            { label: 'Completed Today', value: `${completedToday}/${totalHabits}`, icon: Award, color: 'text-purple-600' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900/60 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl bg-gray-50 dark:bg-slate-800 ${stat.color}`}>
                                        <stat.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">{stat.label}</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Date Selector */}
                <div className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                    <div className="flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-[2rem] bg-white border border-gray-100 shadow-sm dark:bg-slate-900/40 dark:border-slate-800">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="p-2 rounded-full bg-gray-50 dark:bg-slate-800">
                                <Calendar className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none text-lg font-bold text-gray-900 dark:text-white focus:ring-0 p-0"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedDate(new Date(Date.now() - 86400000).toISOString().split('T')[0])}
                                className="px-5 py-2 text-sm font-medium rounded-full bg-white border border-gray-100 text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-gray-400 dark:hover:border-slate-700 dark:hover:text-white transition-all"
                            >
                                Yesterday
                            </button>
                            <button
                                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                                className="px-5 py-2 text-sm font-medium rounded-full bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all shadow-sm"
                            >
                                Today
                            </button>
                        </div>
                    </div>
                </div>

                {/* Habits Grid */}
                {habits.length === 0 ? (
                    <div className="py-24 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 mb-8 shadow-inner">
                            <Target className="w-10 h-10 text-gray-300 dark:text-slate-700" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
                            No habits yet
                        </h3>
                        <p className="text-xl text-gray-500 dark:text-gray-400 font-light mb-12 max-w-md mx-auto leading-relaxed">
                            Start your journey to better habits today! Ready to make a change? 🚀
                        </p>
                        <Link
                            href={route('habits.create', {
                                organization_id: currentOrganization?.id
                            })}
                        >
                            <Button className="rounded-full px-8 py-7 h-auto text-lg font-bold shadow-xl shadow-gray-200 dark:shadow-none bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-all hover:scale-105 active:scale-95">
                                <Plus className="w-6 h-6 mr-2" />
                                Create Your First Habit
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                        {habits.map((habit) => {
                            const completionRate = getCompletionRate(habit);
                            const todayProgress = Math.min((habit.today_count / habit.target_frequency) * 100, 100);

                            return (
                                <div key={habit.id} className="group">
                                    <article
                                        className="relative flex flex-col p-8 rounded-[2.5rem] border transition-all duration-300 bg-white border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:border-gray-200 dark:bg-slate-900/60 dark:border-slate-800 dark:hover:border-slate-700 h-full"
                                    >
                                        {/* Habit Header */}
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div
                                                    className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                                                    style={{
                                                        backgroundColor: habit.color,
                                                        boxShadow: `0 10px 15px -3px ${habit.color}40`,
                                                    }}
                                                >
                                                    <span className="text-white text-2xl drop-shadow-sm">
                                                        {getIconDisplay(habit.icon)}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-xl truncate">
                                                        {habit.title}
                                                    </h3>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mt-1">
                                                        {habit.target_frequency}x {habit.frequency_period}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleToggleHabit(habit.id, habit.today_count)}
                                                className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-110 ${habit.today_target_met
                                                    ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20'
                                                    : 'bg-white border border-gray-100 text-gray-400 hover:text-gray-900 hover:border-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-500 dark:hover:text-white dark:hover:border-white'
                                                    }`}
                                            >
                                                {habit.today_target_met ? (
                                                    <CheckCircle className="w-6 h-6 animate-in zoom-in duration-300" />
                                                ) : (
                                                    <Circle className="w-6 h-6" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Progress */}
                                        <div className="space-y-6 flex-1">
                                            {/* Today's Progress */}
                                            <div>
                                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-3">
                                                    <span className="text-gray-400 dark:text-slate-500">Today's Progress</span>
                                                    <span style={{ color: habit.color }}>
                                                        {habit.today_count}/{habit.target_frequency}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-50 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden shadow-inner">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700 ease-out"
                                                        style={{
                                                            width: `${todayProgress}%`,
                                                            backgroundColor: habit.color,
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* 30-Day Completion Rate */}
                                            <div>
                                                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-3">
                                                    <span className="text-gray-400 dark:text-slate-500">30-Day Success</span>
                                                    <span className="text-gray-900 dark:text-white">
                                                        {completionRate}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-50 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden shadow-inner">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${completionRate >= 80 ? 'bg-emerald-500' :
                                                            completionRate >= 50 ? 'bg-blue-500' :
                                                                'bg-gray-300 dark:bg-slate-600'
                                                            }`}
                                                        style={{ width: `${completionRate}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Streak Badge */}
                                            {habit.streak?.current_streak > 0 && (
                                                <div className="pt-2">
                                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20 shadow-sm">
                                                        <Flame className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">
                                                            {habit.streak.current_streak} Day Streak
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-50 dark:border-slate-800">
                                            <Link
                                                href={route('habits.show', habit.id)}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-slate-800 dark:hover:text-white transition-all"
                                            >
                                                <BarChart3 className="w-4 h-4" />
                                                Stats
                                            </Link>
                                            <Link
                                                href={route('habits.edit', habit.id)}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all shadow-sm hover:shadow-md active:scale-95"
                                                style={{
                                                    backgroundColor: habit.color,
                                                }}
                                            >
                                                <Edit className="w-4 h-4" />
                                                Edit
                                            </Link>
                                        </div>
                                    </article>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* End of content */}
        </AppLayout>
    );
};

export default HabitsIndex;
