<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import type { Task, PriorityData } from './types'

const page = usePage<PriorityData>()

const { today, next, proposal, triage, warnings } = page.props

const formatDate = (date: string | null): string => {
  if (!date) return 'No date'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const getSectionColor = (section: string): string => {
  const colors: Record<string, string> = {
    today: 'bg-blue-50 border-blue-200 text-blue-800',
    next: 'bg-green-50 border-green-200 text-green-800',
    proposal: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    triage: 'bg-red-50 border-red-200 text-red-800',
    warnings: 'bg-gray-50 border-gray-200 text-gray-800',
  }
  return colors[section] || 'bg-gray-50 border-gray-200 text-gray-800'
}

const getSectionTitle = (section: string): string => {
  const titles: Record<string, string> = {
    today: 'Today',
    next: 'Next',
    proposal: 'Proposal',
    triage: 'Triage',
    warnings: 'Warnings',
  }
  return titles[section] || section
}
</script>

<template>
  <div class="priority-index max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Priority Queue</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Today Section -->
      <div
        v-for="section in ['today', 'next', 'proposal', 'triage', 'warnings']"
        :key="section"
        class="rounded-lg border-2 p-4"
        :class="getSectionColor(section)"
      >
        <h2 class="text-lg font-semibold mb-4 capitalize">
          {{ getSectionTitle(section) }}
        </h2>

        <div class="space-y-3">
          <div
            v-for="task in page.props[section]"
            :key="task.id"
            class="rounded-md bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-medium text-gray-900">{{ task.title }}</h3>
                <p class="text-sm text-gray-500 font-mono mt-1">ID: {{ task.id }}</p>

                <div v-if="task.position !== undefined" class="mt-2">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                    Position: {{ task.position }}
                  </span>
                </div>

                <div v-if="task.warning" class="mt-2">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ⚠️ {{ task.warning }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="page.props[section].length === 0"
            class="text-center py-8 text-sm text-gray-500"
          >
            No tasks in {{ getSectionTitle(section) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
