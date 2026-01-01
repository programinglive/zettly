import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Target, TrendingUp, Calendar, CheckCircle, Circle, Edit, BarChart3 } from 'lucide-react';

import DashboardLayout from '../../Layouts/DashboardLayout';

const HabitShow = ({ habit, entries, stats, startDate, endDate }) => {
    const [viewMode, setViewMode] = useState('calendar'); // calendar or list

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const getCompletionStatus = (entry) => {
        if (!entry) return 'incomplete';
        return entry.count >= habit.target_frequency ? 'completed' : 'partial';
    };

    const getCompletionColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-gray-700';
            case 'partial':
                return 'bg-gray-400';
            default:
                return 'bg-gray-200';
        }
    };

    // Generate calendar days for the last 30 days
    const generateCalendarDays = () => {
        const days = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            const entry = entries.find(e => e.date === dateString);
            
            days.push({
                date: dateString,
                day: date.getDate(),
                weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
                entry,
                status: getCompletionStatus(entry),
                isToday: dateString === today.toISOString().split('T')[0]
            });
        }
        
        return days;
    };

    const calendarDays = generateCalendarDays();

    return (
        <>
            <Head title={`${habit.title} - Habits`} />
            
            <DashboardLayout>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <Link
                            href={route('habits.index', {
                                organization_id: habit.organization_id
                            })}
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Habits
                        </Link>
                        
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: habit.color }}
                                >
                                    <span className="text-white text-2xl">
                                        {habit.icon === 'circle' ? '●' : habit.icon}
                                    </span>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        {habit.title}
                                    </h1>
                                    <p className="text-gray-600 mt-1">
                                        {habit.target_frequency}x {habit.frequency_period}
                                    </p>
                                    {habit.description && (
                                        <p className="text-gray-600 mt-2">{habit.description}</p>
                                    )}
                                </div>
                            </div>
                            
                            <Link
                                href={route('habits.edit', habit.id)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </Link>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <Target className="w-6 h-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Completion Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {stats.completion_rate}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Completed Days</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {stats.completed_days}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Current Streak</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {stats.current_streak}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <BarChart3 className="w-6 h-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Longest Streak</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {stats.longest_streak}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`px-4 py-2 rounded-lg ${
                                viewMode === 'calendar'
                                    ? 'bg-gray-800 text-white'
                                    : 'bg-gray-200 text-gray-900'
                            }`}
                        >
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Calendar View
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-lg ${
                                viewMode === 'list'
                                    ? 'bg-gray-800 text-white'
                                    : 'bg-gray-200 text-gray-900'
                            }`}
                        >
                            <BarChart3 className="w-4 h-4 inline mr-2" />
                            List View
                        </button>
                    </div>

                    {/* Progress Display */}
                    {viewMode === 'calendar' ? (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                30-Day Progress
                            </h2>
                            
                            <div className="grid grid-cols-7 gap-2 mb-4">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div key={day} className="text-center text-sm font-medium text-gray-600">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-2">
                                {calendarDays.map((day) => (
                                    <div
                                        key={day.date}
                                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm cursor-pointer transition-all ${
                                            day.isToday
                                                ? 'ring-2 ring-gray-900'
                                                : 'hover:scale-105'
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                                day.status === 'completed'
                                                    ? 'bg-gray-700 text-white'
                                                    : day.status === 'partial'
                                                    ? 'bg-gray-400 text-white'
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}
                                        >
                                            {day.day}
                                        </div>
                                        {day.entry && (
                                            <div className="text-xs mt-1 text-gray-600">
                                                {day.entry.count}/{habit.target_frequency}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-4 mt-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gray-700 rounded"></div>
                                    <span className="text-gray-600">Completed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gray-400 rounded"></div>
                                    <span className="text-gray-600">Partial</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                    <span className="text-gray-600">Incomplete</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Recent Entries
                            </h2>
                            
                            {entries.length === 0 ? (
                                <div className="text-center py-8">
                                    <Circle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">No entries yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {entries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                        entry.count >= habit.target_frequency
                                                            ? 'bg-gray-700 text-white'
                                                            : 'bg-gray-400 text-white'
                                                    }`}
                                                >
                                                    {entry.count >= habit.target_frequency ? (
                                                        <CheckCircle className="w-4 h-4" />
                                                    ) : (
                                                        <Circle className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {formatDate(entry.date)}
                                                    </p>
                                                    {entry.notes && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {entry.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="text-right">
                                                <p className="font-medium text-gray-900">
                                                    {entry.count}/{habit.target_frequency}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {entry.count >= habit.target_frequency ? 'Completed' : 'Partial'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </>
    );
};

export default HabitShow;
