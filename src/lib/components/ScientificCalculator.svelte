<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { evaluate, format, unit, create, all } from 'mathjs';
    import katex from 'katex';
    
    // Create a mathjs instance with all functions
    const math = create(all);
    
    let display = '0';
    let expression = '';
    let memory = 0;
    let isDegrees = true;
    let history: string[] = [];
    let showHistory = false;
    let calculatorElement: HTMLDivElement;
    let isScientificMode = true;

    // Configure mathjs based on angle mode
    $: {
        if (isDegrees) {
            math.config({ number: 'number', precision: 14 });
        } else {
            math.config({ number: 'number', precision: 14 });
        }
    }    // LaTeX rendering function
    function renderLatex(latex: string): string {
        try {
            return katex.renderToString(latex, {
                throwOnError: false,
                displayMode: false,
                output: 'html'
            });
        } catch (e) {
            return latex; // Fallback to plain text
        }
    }

    // Keyboard support
    onMount(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        // Focus the calculator for keyboard input
        if (calculatorElement) {
            calculatorElement.focus();
        }
    });

    onDestroy(() => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    });

    function handleKeyDown(event: KeyboardEvent) {
        // Only handle keys when calculator is focused or when target is the calculator
        const isCalculatorFocused = calculatorElement?.contains(document.activeElement) || 
                                  event.target === calculatorElement ||
                                  calculatorElement?.contains(event.target as Node);
        
        if (!isCalculatorFocused) return;

        // Don't handle keyboard if the event comes from a button click to prevent double input
        if (event.target && (event.target as HTMLElement).tagName === 'BUTTON') {
            return;
        }

        // Prevent event bubbling to avoid double handling
        event.stopPropagation();

        // Prevent default for calculator keys
        if (isCalculatorKey(event.key)) {
            event.preventDefault();
        }

        const key = event.key;
        
        // Numbers and basic operations
        if (/[0-9]/.test(key)) {
            inputCharacter(key);
            showKeyPress(key);
        }
        else if (['+', '-', '*', '/', '(', ')', '.'].includes(key)) {
            inputCharacter(key);
            showKeyPress(key);
        }
        else if (key === 'Enter' || key === '=') { 
            calculate(); 
            showKeyPress('='); 
        }
        else if (key === 'Escape' || key === 'c' || key === 'C') { 
            clear(); 
            showKeyPress('C'); 
        }
        else if (key === 'Backspace' || key === 'Delete') { 
            backspace(); 
            showKeyPress('⌫'); 
        }
        else if (key === '%') { 
            inputCharacter('%'); 
            showKeyPress('%'); 
        }
        // Scientific functions (with modifiers)
        else if (event.ctrlKey || event.metaKey) {
            switch(key.toLowerCase()) {
                case 's': inputFunction('sin('); showKeyPress('sin'); break;
                case 'o': inputFunction('cos('); showKeyPress('cos'); break;
                case 't': inputFunction('tan('); showKeyPress('tan'); break;
                case 'l': inputFunction('log10('); showKeyPress('log'); break;
                case 'n': inputFunction('log('); showKeyPress('ln'); break;
                case 'r': inputFunction('sqrt('); showKeyPress('√'); break;
                case 'q': inputFunction('^2'); showKeyPress('x²'); break;
                case 'f': inputFunction('!'); showKeyPress('!'); break;
                case 'e': inputConstant('e'); showKeyPress('e'); break;
                case 'p': inputConstant('pi'); showKeyPress('π'); break;
                case 'd': toggleAngleMode(); break;
                case 'h': showHistory = !showHistory; break;
            }
        }
    }

    function showKeyPress(key: string) {
        // Visual feedback for keyboard input
        addToHistory(`⌨ ${key}`);
    }

    function handleKeyUp(event: KeyboardEvent) {
        // Visual feedback for key release could be implemented here
    }

    function isCalculatorKey(key: string): boolean {
        return /[0-9+\-*/=.()%^]/.test(key) || 
               ['Enter', 'Escape', 'Backspace', 'Delete'].includes(key);
    }

    function inputCharacter(char: string) {
        if (display === '0' && char !== '.') {
            display = char;
            expression = char;
        } else if (display === 'Error') {
            display = char;
            expression = char;
        } else {
            display += char;
            expression += char;
        }
    }

    function inputFunction(func: string) {
        if (display === '0') {
            display = func;
            expression = func;
        } else if (display === 'Error') {
            display = func;
            expression = func;
        } else {
            display += func;
            expression += func;
        }
    }

    function inputConstant(constant: string) {
        const value = constant === 'pi' ? 'pi' : 'e';
        if (display === '0') {
            display = value;
            expression = value;
        } else if (display === 'Error') {
            display = value;
            expression = value;
        } else {
            display += value;
            expression += value;
        }
        addToHistory(`${constant} = ${constant === 'pi' ? Math.PI : Math.E}`);
    }

    function clear() {
        display = '0';
        expression = '';
        addToHistory('Clear');
    }

    function clearEntry() {
        display = '0';
        expression = '';
    }

    function clearHistory() {
        history = [];
    }

    function backspace() {
        if (display.length > 1 && display !== 'Error') {
            display = display.slice(0, -1);
            expression = expression.slice(0, -1);
        } else {
            display = '0';
            expression = '';
        }
    }

    function calculate() {
        if (!expression || expression.trim() === '') return;
        
        try {
            // Handle degree/radian conversion for trigonometric functions
            let processedExpression = expression;
            
            if (isDegrees) {
                // Convert degrees to radians for trig functions
                processedExpression = processedExpression
                    .replace(/sin\(/g, 'sin((pi/180)*')
                    .replace(/cos\(/g, 'cos((pi/180)*')
                    .replace(/tan\(/g, 'tan((pi/180)*');
                    
                // Handle inverse trig functions (convert result from radians to degrees)
                if (processedExpression.includes('asin(') || processedExpression.includes('acos(') || processedExpression.includes('atan(')) {
                    const result = math.evaluate(processedExpression);
                    const degreesResult = (result * 180) / Math.PI;
                    const formattedResult = formatResult(degreesResult);
                    
                    addToHistory(`${expression} = ${formattedResult}°`);
                    display = formattedResult;
                    expression = formattedResult;
                    return;
                }
            }
            
            // Evaluate the expression using mathjs
            const result = math.evaluate(processedExpression);
            const formattedResult = formatResult(result);
            
            addToHistory(`${expression} = ${formattedResult}`);
            display = formattedResult;
            expression = formattedResult;
        } catch (error: any) {
            display = 'Error';
            expression = '';
            addToHistory(`Error: ${error?.message || 'Unknown error'}`);
        }
    }

    function formatResult(result: any): string {
        if (typeof result === 'number') {
            // Handle special cases
            if (isNaN(result)) return 'Error';
            if (!isFinite(result)) return result > 0 ? 'Infinity' : '-Infinity';
            
            // Format for display
            if (Math.abs(result) < 1e-10) return '0';
            if (Math.abs(result) > 1e12) return result.toExponential(6);
            
            // Remove unnecessary decimal places
            const formatted = result.toString();
            return formatted.length > 12 ? result.toPrecision(10) : formatted;
        }
        return result.toString();
    }

    function addToHistory(entry: string) {
        history = [entry, ...history.slice(0, 9)]; // Keep last 10 entries
    }

    function memoryFunction(func: string) {
        const current = parseFloat(display) || 0;
        switch (func) {
            case 'MC':
                memory = 0;
                addToHistory('Memory cleared');
                break;
            case 'MR':
                display = formatResult(memory);
                expression = display;
                addToHistory(`Memory recalled: ${display}`);
                break;
            case 'MS':
                memory = current;
                addToHistory(`Memory stored: ${current}`);
                break;
            case 'M+':
                memory += current;
                addToHistory(`Memory + ${current} = ${memory}`);
                break;
            case 'M-':
                memory -= current;
                addToHistory(`Memory - ${current} = ${memory}`);
                break;
        }
    }

    function toggleAngleMode() {
        isDegrees = !isDegrees;
        addToHistory(`Angle mode: ${isDegrees ? 'Degrees' : 'Radians'}`);
    }

    // Scientific function shortcuts
    function scientificFunction(func: string) {
        const functions: { [key: string]: string } = {
            'sin': 'sin(',
            'cos': 'cos(',
            'tan': 'tan(',
            'asin': 'asin(',
            'acos': 'acos(',
            'atan': 'atan(',
            'log': 'log10(',
            'ln': 'log(',
            'sqrt': 'sqrt(',
            'exp': 'exp(',
            'abs': 'abs(',
            'factorial': '!',
            'square': '^2',
            'reciprocal': '^(-1)',
            'negate': '*(-1)',
            'percent': '/100'
        };
        
        const mathFunc = functions[func];
        if (mathFunc) {
            if (func === 'factorial' || func === 'square' || func === 'reciprocal' || func === 'negate' || func === 'percent') {
                // These are postfix operations
                display += mathFunc;
                expression += mathFunc;
            } else {
                // These are prefix functions
                inputFunction(mathFunc);
            }
        }
    }
</script>

<div 
    bind:this={calculatorElement}
    class="scientific-calculator bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-white/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
    tabindex="0"
    role="application"
    aria-label="Scientific Calculator"
    on:click={() => calculatorElement?.focus()}
>
    <!-- Calculator Header -->
    <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
            </div>
            <h3 class="text-white font-semibold text-lg">Scientific Calculator</h3>
        </div>
        
        <div class="flex items-center gap-2">
            <!-- History button -->
            <button
                on:click={() => showHistory = !showHistory}
                class="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 {showHistory ? 'bg-white/20' : ''}"
                title="Toggle history (Ctrl+H)"
                aria-label="Toggle calculation history"
            >
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </button>
            
            <!-- Keyboard help -->
            <div class="group relative">
                <button class="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200" title="Keyboard shortcuts">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </button>
                
                <!-- Tooltip -->
                <div class="absolute right-0 top-full mt-2 w-64 bg-slate-800/95 backdrop-blur-sm border border-white/20 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    <div class="text-xs text-gray-300 space-y-1">
                        <div><kbd class="px-1 py-0.5 bg-white/20 rounded text-xs">0-9</kbd> Numbers</div>
                        <div><kbd class="px-1 py-0.5 bg-white/20 rounded text-xs">+−*/()</kbd> Operators</div>
                        <div><kbd class="px-1 py-0.5 bg-white/20 rounded text-xs">Enter</kbd> Calculate</div>
                        <div><kbd class="px-1 py-0.5 bg-white/20 rounded text-xs">Esc</kbd> Clear</div>
                        <div><kbd class="px-1 py-0.5 bg-white/20 rounded text-xs">Ctrl+S</kbd> Sin</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- History Panel -->
    {#if showHistory}
        <div class="mb-4 bg-white/5 border border-white/10 rounded-lg p-3 max-h-32 overflow-y-auto history-panel">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-400 font-medium">History</span>
                <button
                    on:click={clearHistory}
                    class="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 hover:bg-white/10 rounded"
                    title="Clear history"
                >
                    Clear
                </button>
            </div>
            <div class="space-y-1">
                {#each history as entry}
                    <div class="text-xs font-mono text-gray-300 truncate" title={entry}>{entry}</div>
                {:else}
                    <div class="text-xs text-gray-500 italic">No calculations yet</div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Display -->
    <div class="display bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-white/20 rounded-xl p-5 mb-6 shadow-inner">
        <div class="text-right">
            <!-- Expression display -->
            <div class="text-sm text-gray-400 mb-2 h-5 font-mono">
                {#if expression && expression !== display}
                    <span class="opacity-70">{expression.length > 30 ? '...' + expression.slice(-30) : expression}</span>
                {/if}
            </div>
            
            <!-- Main display -->
            <div class="text-3xl font-mono text-white break-all leading-tight min-h-[2.5rem] flex items-center justify-end" title={display}>
                {display.length > 12 ? display.slice(0, 12) + '...' : display}
            </div>
            
            <!-- Status indicators -->
            <div class="text-sm text-gray-400 mt-3 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <span class="px-2 py-1 bg-white/10 rounded-full text-xs font-medium">
                        {isDegrees ? 'DEG' : 'RAD'}
                    </span>
                    {#if memory !== 0}
                        <span class="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                            M: {formatResult(memory)}
                        </span>
                    {/if}
                </div>
                
                <!-- Error indicator -->
                {#if display === 'Error'}
                    <span class="text-red-400 text-xs">⚠ Error</span>
                {/if}
            </div>
        </div>
    </div>

    <!-- Button Grid -->
    <div class="grid grid-cols-6 gap-3">
        <!-- Row 1: Memory and Mode -->
        <button on:click={() => memoryFunction('MC')} class="btn-memory" title="Memory Clear">MC</button>
        <button on:click={() => memoryFunction('MR')} class="btn-memory" title="Memory Recall">MR</button>
        <button on:click={() => memoryFunction('MS')} class="btn-memory" title="Memory Store">MS</button>
        <button on:click={() => memoryFunction('M+')} class="btn-memory" title="Memory Add">M+</button>
        <button on:click={() => memoryFunction('M-')} class="btn-memory" title="Memory Subtract">M−</button>
        <button on:click={toggleAngleMode} class="btn-mode" title="Toggle Degrees/Radians (Ctrl+D)">
            {isDegrees ? 'DEG' : 'RAD'}
        </button>

        <!-- Row 2: Scientific Functions (Trigonometric) -->
        <button on:click={() => inputFunction('sin(')} class="btn-function" title="Sine (Ctrl+S)">{@html renderLatex('\\sin')}</button>
        <button on:click={() => inputFunction('cos(')} class="btn-function" title="Cosine (Ctrl+O)">{@html renderLatex('\\cos')}</button>
        <button on:click={() => inputFunction('tan(')} class="btn-function" title="Tangent (Ctrl+T)">{@html renderLatex('\\tan')}</button>
        <button on:click={() => inputFunction('asin(')} class="btn-function" title="Arcsine">{@html renderLatex('\\sin^{-1}')}</button>
        <button on:click={() => inputFunction('acos(')} class="btn-function" title="Arccosine">{@html renderLatex('\\cos^{-1}')}</button>
        <button on:click={() => inputFunction('atan(')} class="btn-function" title="Arctangent">{@html renderLatex('\\tan^{-1}')}</button>

        <!-- Row 3: Logarithms and Powers -->
        <button on:click={() => inputFunction('log10(')} class="btn-function" title="Base 10 Logarithm (Ctrl+L)">{@html renderLatex('\\log')}</button>
        <button on:click={() => inputFunction('log(')} class="btn-function" title="Natural Logarithm (Ctrl+N)">{@html renderLatex('\\ln')}</button>
        <button on:click={() => inputFunction('exp(')} class="btn-function" title="e to the power">{@html renderLatex('e^x')}</button>
        <button on:click={() => inputCharacter('^')} class="btn-operator" title="Power (^)">{@html renderLatex('x^y')}</button>
        <button on:click={() => inputCharacter('^2')} class="btn-function" title="Square (Ctrl+Q)">{@html renderLatex('x^2')}</button>
        <button on:click={() => inputFunction('sqrt(')} class="btn-function" title="Square Root (Ctrl+R)">{@html renderLatex('\\sqrt{x}')}</button>

        <!-- Row 4: Special Functions -->
        <button on:click={() => inputCharacter('!')} class="btn-function" title="Factorial (Ctrl+F)">{@html renderLatex('x!')}</button>
        <button on:click={() => inputCharacter('^(-1)')} class="btn-function" title="Reciprocal (Ctrl+I)">{@html renderLatex('\\frac{1}{x}')}</button>
        <button on:click={() => inputFunction('abs(')} class="btn-function" title="Absolute Value">{@html renderLatex('|x|')}</button>
        <button on:click={() => inputConstant('pi')} class="btn-constant" title="Pi Constant (Ctrl+P)">{@html renderLatex('\\pi')}</button>
        <button on:click={() => inputConstant('e')} class="btn-constant" title="Euler's Number (Ctrl+E)">{@html renderLatex('e')}</button>
        <button on:click={() => inputCharacter('/100')} class="btn-function" title="Percent (%)">{@html renderLatex('\\%')}</button>

        <!-- Row 5: Clear and Backspace -->
        <button on:click={clear} class="btn-clear" title="Clear All (Esc)">
            <span class="flex items-center justify-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                C
            </span>
        </button>
        <button on:click={clearEntry} class="btn-clear" title="Clear Entry">CE</button>
        <button on:click={backspace} class="btn-clear" title="Backspace (Delete)">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-7.172a2 2 0 00-1.414.586L3 12z"></path>
            </svg>
        </button>
        <button on:click={() => inputCharacter('(')} class="btn-operator" title="Open Parenthesis">(</button>
        <button on:click={() => inputCharacter(')')} class="btn-operator" title="Close Parenthesis">)</button>
        <button on:click={() => inputCharacter('/')} class="btn-operator" title="Divide (/)">{@html renderLatex('\\div')}</button>

        <!-- Row 6: Numbers 7-9 -->
        <button on:click={() => inputCharacter('7')} class="btn-number" title="7">7</button>
        <button on:click={() => inputCharacter('8')} class="btn-number" title="8">8</button>
        <button on:click={() => inputCharacter('9')} class="btn-number" title="9">9</button>
        <button on:click={() => inputCharacter('*(-1)')} class="btn-operator" title="Change Sign">{@html renderLatex('\\pm')}</button>
        <button on:click={() => inputCharacter('*')} class="btn-operator col-span-2" title="Multiply (*)">{@html renderLatex('\\times')}</button>

        <!-- Row 7: Numbers 4-6 -->
        <button on:click={() => inputCharacter('4')} class="btn-number" title="4">4</button>
        <button on:click={() => inputCharacter('5')} class="btn-number" title="5">5</button>
        <button on:click={() => inputCharacter('6')} class="btn-number" title="6">6</button>
        <button on:click={() => inputCharacter('-')} class="btn-operator col-span-3" title="Subtract (-)">{@html renderLatex('-')}</button>

        <!-- Row 8: Numbers 1-3 -->
        <button on:click={() => inputCharacter('1')} class="btn-number" title="1">1</button>
        <button on:click={() => inputCharacter('2')} class="btn-number" title="2">2</button>
        <button on:click={() => inputCharacter('3')} class="btn-number" title="3">3</button>
        <button on:click={() => inputCharacter('+')} class="btn-operator col-span-3" title="Add (+)">+</button>

        <!-- Row 9: 0, Decimal, Equals -->
        <button on:click={() => inputCharacter('0')} class="btn-number col-span-2" title="0">0</button>
        <button on:click={() => inputCharacter('.')} class="btn-number" title="Decimal Point (.)">.</button>
        <button on:click={calculate} class="btn-equals col-span-3 stable-layout" title="Calculate (Enter)">
            <span class="flex items-center justify-center gap-2 stable-content">
                <span>=</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </span>
        </button>
    </div>
</div>

<style>
    @reference "tailwindcss";
    
    .scientific-calculator {
        font-family: 'Inter Thai Looped', system-ui, sans-serif;
        user-select: none;
        animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    .scientific-calculator:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
    }

    .btn-number {
        @apply bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 
               text-white font-semibold py-4 px-3 rounded-xl 
               transition-all duration-200 active:scale-95 text-base
               border border-white/10 hover:border-white/20
               shadow-lg hover:shadow-xl;
    }

    .btn-operator {
        @apply bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 
               text-white font-semibold py-4 px-3 rounded-xl 
               transition-all duration-200 active:scale-95 text-base
               border border-blue-400/20 hover:border-blue-400/40
               shadow-lg hover:shadow-xl;
    }

    .btn-function {
        @apply bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 
               text-white font-medium py-4 px-2 rounded-xl 
               transition-all duration-200 active:scale-95 text-sm
               border border-purple-400/20 hover:border-purple-400/40
               shadow-lg hover:shadow-xl;
    }

    .btn-memory {
        @apply bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 
               text-white font-medium py-4 px-2 rounded-xl 
               transition-all duration-200 active:scale-95 text-sm
               border border-indigo-400/20 hover:border-indigo-400/40
               shadow-lg hover:shadow-xl;
    }

    .btn-mode {
        @apply bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 
               text-white font-medium py-4 px-2 rounded-xl 
               transition-all duration-200 active:scale-95 text-sm
               border border-emerald-400/20 hover:border-emerald-400/40
               shadow-lg hover:shadow-xl;
    }

    .btn-constant {
        @apply bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 
               text-white font-medium py-4 px-2 rounded-xl 
               transition-all duration-200 active:scale-95 text-sm
               border border-amber-400/20 hover:border-amber-400/40
               shadow-lg hover:shadow-xl;
    }

    .btn-clear {
        @apply bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 
               text-white font-semibold py-4 px-3 rounded-xl 
               transition-all duration-200 active:scale-95 text-sm
               border border-red-400/20 hover:border-red-400/40
               shadow-lg hover:shadow-xl;
    }

    .btn-equals {
        @apply bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 
               text-white font-bold py-4 px-3 rounded-xl 
               transition-all duration-200 active:scale-95 text-lg
               border border-green-400/20 hover:border-green-400/40
               shadow-lg hover:shadow-xl;
    }

    .btn-equals.stable-layout {
        /* Prevent layout shift on hover */
        transform-origin: center;
        will-change: auto;
    }

    .btn-equals.stable-layout:hover {
        /* Use transform instead of changing borders/padding */
        transform: scale(1.02);
    }

    .btn-equals .stable-content {
        /* Ensure content doesn't shift */
        position: relative;
        z-index: 1;
    }

    .display {
        min-height: 100px;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%);
    }

    button:disabled {
        @apply opacity-50 cursor-not-allowed;
    }

    button:active {
        transform: scale(0.95);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
    }

    button:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
    }

    /* Hover effects */
    .btn-number:hover,
    .btn-operator:hover,
    .btn-function:hover,
    .btn-memory:hover,
    .btn-mode:hover,
    .btn-constant:hover,
    .btn-clear:hover,
    .btn-equals:hover {
        transform: translateY(-1px);
    }

    /* Better tooltip positioning */
    .group:hover .group-hover\:opacity-100 {
        z-index: 1000;
    }

    /* History scrollbar styling */
    .history-panel::-webkit-scrollbar {
        width: 6px;
    }
    
    .history-panel::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
    }
    
    .history-panel::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 3px;
    }
    
    .history-panel::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.5);
    }

    /* Mobile responsiveness */
    @media (max-width: 640px) {
        .scientific-calculator {
            max-width: 100%;
            padding: 1rem;
        }
        
        .btn-number,
        .btn-operator,
        .btn-function,
        .btn-memory,
        .btn-mode,
        .btn-constant,
        .btn-clear,
        .btn-equals {
            padding: 0.75rem 0.5rem;
            font-size: 0.875rem;
        }
        
        .display {
            min-height: 80px;
            padding: 1rem;
        }
    }
</style>
