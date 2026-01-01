import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Target, TrendingUp, Calendar, CheckCircle, Circle, Flame, Award, BarChart3 } from 'lucide-react';

import DashboardLayout from '../../Layouts/DashboardLayout';

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
        <>
            <Head title="Habits" />

            <DashboardLayout>
                {/* Gradient Background Header */}
                <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-4xl font-bold mb-2">
                                    ✨ Your Habits
                                    {currentOrganization && (
                                        <span className="ml-2 text-2xl opacity-90">
                                            - {currentOrganization.name}
                                        </span>
                                    )}
                                </h1>
                                <p className="text-lg opacity-90">
                                    Build consistency, one day at a time
                                </p>
                            </div>

                            <Link
                                href={route('habits.create', {
                                    organization_id: currentOrganization?.id
                                })}
                                className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                            >
                                <Plus className="w-5 h-5" />
                                Add Habit
                            </Link>
                        </div>

                        {/* Stats Cards */}
                        {totalHabits > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4 border border-white/30">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/30 p-3 rounded-lg">
                                            <Target className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm opacity-90">Total Habits</p>
                                            <p className="text-2xl font-bold">{totalHabits}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4 border border-white/30">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/30 p-3 rounded-lg">
                                            <CheckCircle className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm opacity-90">Today's Progress</p>
                                            <p className="text-2xl font-bold">{todayCompletionRate}%</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4 border border-white/30">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/30 p-3 rounded-lg">
                                            <Flame className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm opacity-90">Longest Streak</p>
                                            <p className="text-2xl font-bold">{longestStreak} days</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/20 backdrop-blur-lg rounded-xl p-4 border border-white/30">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/30 p-3 rounded-lg">
                                            <Award className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm opacity-90">Completed Today</p>
                                            <p className="text-2xl font-bold">{completedToday}/{totalHabits}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Date Selector */}
                    <div className="mb-8">
                        <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <Calendar className="w-5 h-5 text-purple-600" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <div className="flex gap-2 ml-auto">
                                <button
                                    onClick={() => setSelectedDate(new Date(Date.now() - 86400000).toISOString().split('T')[0])}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Yesterday
                                </button>
                                <button
                                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg hover:shadow-lg transition-all"
                                >
                                    Today
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Habits Grid */}
                    {habits.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="bg-gradient-to-br from-purple-100 to-pink-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Target className="w-12 h-12 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                No habits yet
                            </h3>
                            <p className="text-gray-600 mb-8 text-lg">
                                Start your journey to better habits today! 🚀
                            </p>
                            <Link
                                href={route('habits.create', {
                                    organization_id: currentOrganization?.id
                                })}
                                className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-8 py-4 rounded-xl inline-flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                            >
                                <Plus className="w-5 h-5" />
                                Create Your First Habit
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {habits.map((habit) => {
                                const completionRate = getCompletionRate(habit);
                                const todayProgress = Math.min((habit.today_count / habit.target_frequency) * 100, 100);

                                return (
                                    <div
                                        key={habit.id}
                                        className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border-2 border-transparent hover:border-purple-200"
                                        style={{
                                            background: `linear-gradient(white, white) padding-box, linear-gradient(135deg, ${habit.color}40, ${habit.color}80) border-box`
                                        }}
                                    >
                                        {/* Habit Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div
                                                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-200"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${habit.color}, ${habit.color}dd)`
                                                    }}
                                                >
                                                    <span className="text-white text-2xl">
                                                        {getIconDisplay(habit.icon)}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900 text-lg">
                                                        {habit.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {habit.target_frequency}x {habit.frequency_period}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleToggleHabit(habit.id, habit.today_count)}
                                                className={`p-3 rounded-xl transition-all duration-200 transform hover:scale-110 ${habit.today_target_met
                                                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg'
                                                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {habit.today_target_met ? (
                                                    <CheckCircle className="w-6 h-6" />
                                                ) : (
                                                    <Circle className="w-6 h-6" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Progress */}
                                        <div className="space-y-4">
                                            {/* Today's Progress */}
                                            <div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-gray-600 font-medium">Today's Progress</span>
                                                    <span className="font-bold" style={{ color: habit.color }}>
                                                        {habit.today_count}/{habit.target_frequency}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className="h-3 rounded-full transition-all duration-500 ease-out"
                                                        style={{
                                                            width: `${todayProgress}%`,
                                                            background: `linear-gradient(90deg, ${habit.color}, ${habit.color}dd)`
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* 30-Day Completion Rate */}
                                            <div>
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-gray-600 font-medium">30-Day Success</span>
                                                    <span className="font-bold text-gray-900">
                                                        {completionRate}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className={`h-3 rounded-full transition-all duration-500 ${completionRate >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                                                                completionRate >= 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-600' :
                                                                    'bg-gradient-to-r from-gray-400 to-gray-500'
                                                            }`}
                                                        style={{ width: `${completionRate}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Streak Badge */}
                                            {habit.streak?.current_streak > 0 && (
                                                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md">
                                                    <Flame className="w-5 h-5" />
                                                    <span className="font-bold text-sm">
                                                        {habit.streak.current_streak} Day Streak!
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                                            <Link
                                                href={route('habits.show', habit.id)}
                                                className="flex-1 text-center py-2 px-4 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                                            >
                                                <BarChart3 className="w-4 h-4 inline mr-1" />
                                                Stats
                                            </Link>
                                            <Link
                                                href={route('habits.edit', habit.id)}
                                                className="flex-1 text-center py-2 px-4 rounded-lg font-medium text-white transition-all"
                                                style={{
                                                    background: `linear-gradient(135deg, ${habit.color}, ${habit.color}dd)`
                                                }}
                                            >
                                                Edit
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </>
    );
};

export default HabitsIndex;
