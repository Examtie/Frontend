<!-- SubjectFilter.svelte - Reusable subject filter component -->
<script lang="ts">
	interface Subject {
		id: string;
		name: string;
		emoji: string;
		count: number;
	}

	interface SubjectFilterProps {
		subjects: Subject[];
		selectedSubject?: string;
		onSubjectChange?: (subjectId: string) => void;
		class?: string;
	}

	let {
		subjects,
		selectedSubject = 'all',
		onSubjectChange = () => {},
		class: className = ''
	}: SubjectFilterProps = $props();

	function handleSubjectClick(subjectId: string) {
		onSubjectChange(subjectId);
	}
</script>

<div class="flex flex-wrap gap-3 {className}">
	<!-- All Subjects -->
	<button
		onclick={() => handleSubjectClick('all')}
		class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 {selectedSubject === 'all'
			? 'bg-blue-600 text-white shadow-lg'
			: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
	>
		🎯 All Subjects
	</button>

	{#each subjects as subject}
		<button
			onclick={() => handleSubjectClick(subject.id)}
			class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 {selectedSubject === subject.id
				? 'bg-blue-600 text-white shadow-lg'
				: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
		>
			{subject.emoji} {subject.name}
			<span class="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
				{subject.count}
			</span>
		</button>
	{/each}
</div>
