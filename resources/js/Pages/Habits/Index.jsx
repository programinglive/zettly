import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Target, TrendingUp, Calendar, CheckCircle, Circle } from 'lucide-react';

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

    return (
        <>
            <Head title="Habits" />
            
            <DashboardLayout>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Habits
                                {currentOrganization && (
                                    <span className="ml-2 text-lg text-gray-600">
                                        - {currentOrganization.name}
                                    </span>
                                )}
                            </h1>
                            <p className="mt-2 text-gray-600">
                                Track and build consistent daily habits
                            </p>
                        </div>
                        
                        <Link
                            href={route('habits.create', {
                                organization_id: currentOrganization?.id
                            })}
                            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Add Habit
                        </Link>
                    </div>

                    {/* Date Selector */}
                    <div className="mb-6">
                        <div className="flex items-center gap-4">
                            <Calendar className="w-5 h-5 text-gray-600" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>

                    {/* Habits Grid */}
                    {habits.length === 0 ? (
                        <div className="text-center py-12">
                            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No habits yet
                            </h3>
                            <p className="text-gray-600 mb-6">
                                Start building better habits by creating your first one
                            </p>
                            <Link
                                href={route('habits.create', {
                                    organization_id: currentOrganization?.id
                                })}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Create Your First Habit
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {habits.map((habit) => (
                                <div
                                    key={habit.id}
                                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                                >
                                    {/* Habit Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: habit.color }}
                                            >
                                                <span className="text-white text-lg">
                                                    {habit.icon === 'circle' ? '●' : habit.icon}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    {habit.title}
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {habit.target_frequency}x {habit.frequency_period}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={() => handleToggleHabit(habit.id, habit.today_count)}
                                            className={`p-2 rounded-full transition-colors ${
                                                habit.today_target_met
                                                    ? 'bg-gray-700 text-white'
                                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                            }`}
                                        >
                                            {habit.today_target_met ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : (
                                                <Circle className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Progress */}
                                    <div className="space-y-3">
                                        {/* Today's Progress */}
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">Today</span>
                                                <span className="font-medium">
                                                    {habit.today_count}/{habit.target_frequency}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gray-700 h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(
                                                            (habit.today_count / habit.target_frequency) * 100,
                                                            100
                                                        )}%`
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* 30-Day Completion Rate */}
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">30-day rate</span>
                                                <span className="font-medium">
                                                    {getCompletionRate(habit)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gray-600 h-2 rounded-full"
                                                    style={{ width: `${getCompletionRate(habit)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Streak */}
                                        {habit.streak?.current_streak > 0 && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <TrendingUp className="w-4 h-4 text-gray-600" />
                                                <span className="text-gray-600">
                                                    {habit.streak.current_streak} day streak
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                                        <Link
                                            href={route('habits.show', habit.id)}
                                            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                                        >
                                            View Details
                                        </Link>
                                        <Link
                                            href={route('habits.edit', habit.id)}
                                            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                                        >
                                            Edit
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </>
    );
};

export default HabitsIndex;
