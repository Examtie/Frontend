<!-- StatsCard.svelte - Reusable stats card component -->
<script lang="ts">
	interface StatsCardProps {
		title: string;
		value: string | number;
		description: string;
		icon?: string;
		color?: 'blue' | 'purple' | 'green' | 'orange';
		class?: string;
	}

	let {
		title,
		value,
		description,
		icon = '',
		color = 'blue',
		class: className = ''
	}: StatsCardProps = $props();

	const colorClasses = {
		blue: 'from-blue-500 to-blue-600',
		purple: 'from-purple-500 to-purple-600',
		green: 'from-green-500 to-green-600',
		orange: 'from-orange-500 to-orange-600'
	};

	const iconColorClasses = {
		blue: 'text-blue-600 dark:text-blue-400',
		purple: 'text-purple-600 dark:text-purple-400',
		green: 'text-green-600 dark:text-green-400',
		orange: 'text-orange-600 dark:text-orange-400'
	};
</script>

<div class="relative p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden group hover:shadow-lg transition-all duration-300 {className}">
	<!-- Background gradient -->
	<div class="absolute inset-0 bg-gradient-to-br {colorClasses[color]} opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
	
	<div class="relative">
		<!-- Icon -->
		{#if icon}
			<div class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 mb-4 group-hover:scale-110 transition-transform duration-300">
				<span class="text-2xl">{icon}</span>
			</div>
		{/if}

		<!-- Title -->
		<h3 class="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
			{title}
		</h3>

		<!-- Value -->
		<div class="text-3xl font-bold text-slate-900 dark:text-white mb-1 group-hover:scale-105 transition-transform duration-300 {iconColorClasses[color]}">
			{value}
		</div>

		<!-- Description -->
		<p class="text-sm text-slate-600 dark:text-slate-300">
			{description}
		</p>
	</div>
</div>
