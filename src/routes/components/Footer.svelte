<script>
	import { t } from '../../lib/i18n.js';
</script>

<!-- Footer Component -->
<footer class="bg-stone-800 border-t border-gray-700/40">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
			<!-- Company Info -->
			<div class="lg:col-span-1">
				<div class="flex items-center space-x-3 mb-4">
					<div class="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
						<span class="text-white font-bold text-lg">E</span>
					</div>
					<span class="text-sky-200 text-2xl font-bold tracking-tight">Examtie</span>
				</div>
				<p class="text-gray-400 leading-relaxed mb-4">
					{$t('footerDescription')}
				</p>
			</div>

			<!-- Product Links -->
			<div>
				<h3 class="text-white font-semibold mb-4">{$t('footerProduct')}</h3>
				<ul class="space-y-2">
					<li><a href="/quiz" class="text-gray-400 hover:text-white transition-colors">{$t('footerPracticeQuiz')}</a></li>
					<li><a href="/marketplace" class="text-gray-400 hover:text-white transition-colors">{$t('footerQuestionBank')}</a></li>
					<li><a href="/analytics" class="text-gray-400 hover:text-white transition-colors">{$t('footerAnalytics')}</a></li>
					<li><a href="/progress" class="text-gray-400 hover:text-white transition-colors">{$t('footerProgressTracking')}</a></li>
				</ul>
			</div>

			<!-- Support Links -->
			<div>
				<h3 class="text-white font-semibold mb-4">{$t('footerSupport')}</h3>
				<ul class="space-y-2">
					<li><a href="/help" class="text-gray-400 hover:text-white transition-colors">{$t('footerHelpCenter')}</a></li>
					<li><a href="/contact" class="text-gray-400 hover:text-white transition-colors">{$t('footerContactUs')}</a></li>
					<li><a href="/tutorials" class="text-gray-400 hover:text-white transition-colors">{$t('footerTutorials')}</a></li>
					<li><a href="/faq" class="text-gray-400 hover:text-white transition-colors">{$t('footerFaq')}</a></li>
				</ul>
			</div>

			<!-- Legal Links -->
			<div>
				<h3 class="text-white font-semibold mb-4">{$t('footerLegal')}</h3>
				<ul class="space-y-2">
					<li><a href="/privacy" class="text-gray-400 hover:text-white transition-colors">{$t('footerPrivacyPolicy')}</a></li>
					<li><a href="/terms" class="text-gray-400 hover:text-white transition-colors">{$t('footerTermsOfService')}</a></li>
					<li><a href="/cookies" class="text-gray-400 hover:text-white transition-colors">{$t('footerCookiePolicy')}</a></li>
					<li><a href="/licenses" class="text-gray-400 hover:text-white transition-colors">{$t('footerLicenses')}</a></li>
				</ul>
			</div>
		</div>

		<!-- Bottom Section -->
		<div class="border-t border-gray-700/40 mt-12 pt-8">
			<div class="flex flex-col md:flex-row justify-between items-center">
				<p class="text-gray-400 text-sm">
					{$t('footerCopyright')}
				</p>
				<div class="flex items-center space-x-4 mt-4 md:mt-0">
					<span class="text-gray-400 text-sm">{$t('footerMadeWithLove')}</span>
				</div>
			</div>
		</div>
	</div>
</footer>