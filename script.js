// Globallly define functions called by inline HTML event handlers
function formatCurrency(number, currencyCode = 'USD') { 
    if (isNaN(number) || typeof number !== 'number') return "N/A";
    return number.toLocaleString('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function showTab(tabName) {
    const annualPreFireTabContent = document.getElementById('annualPreFireTabContent');
    const monthlyPreFireTabContent = document.getElementById('monthlyPreFireTabContent');
    const postFireTabContent = document.getElementById('postFireTabContent');
    const annualPreFireTabButton = document.getElementById('annualPreFireTabButton');
    const monthlyPreFireTabButton = document.getElementById('monthlyPreFireTabButton');
    const postFireTabButton = document.getElementById('postFireTabButton');

    [annualPreFireTabContent, monthlyPreFireTabContent, postFireTabContent].forEach(el => { if(el) el.classList.add('hidden'); });
    [annualPreFireTabButton, monthlyPreFireTabButton, postFireTabButton].forEach(el => { if(el) el.classList.remove('active'); });

    if (tabName === 'annualPreFire') {
        if(annualPreFireTabContent) annualPreFireTabContent.classList.remove('hidden'); 
        if(annualPreFireTabButton) annualPreFireTabButton.classList.add('active');
    } else if (tabName === 'monthlyPreFire') {
         if(monthlyPreFireTabContent) monthlyPreFireTabContent.classList.remove('hidden'); 
        if(monthlyPreFireTabButton) monthlyPreFireTabButton.classList.add('active');
    } else if (tabName === 'postFire') {
        if(postFireTabContent) postFireTabContent.classList.remove('hidden'); 
        if(postFireTabButton) postFireTabButton.classList.add('active');
    }
}

// This function calculates the core projection based on inputs
function calculateProjection(inputs, events = []) {
    const fireModeEl = document.getElementById('fireMode');
    const mode = fireModeEl ? fireModeEl.value : 'normal';
    
    let coastTargetAge = 65;
    if (mode === 'coast') {
        const el = document.getElementById('coastTargetAge');
        if (el && el.value) coastTargetAge = parseInt(el.value);
    }
    
    const { currentAge, currentSavings, yearlySavingsContribution, yearlyExpensesInRetirement, withdrawalRate: withdrawalRatePercent, preFireReturn: preFireReturnPercent, expectedInflationRate: expectedInflationRatePercent, monthlyIncomeAfterFIRE, numMonthlyRows } = inputs;

    const withdrawalRate = withdrawalRatePercent / 100;
    const preFireAnnualReturn = preFireReturnPercent / 100;
    const expectedInflationRate = expectedInflationRatePercent / 100;
    const annualPostFIREIncome = monthlyIncomeAfterFIRE * 12;
    const netInitialExpensesToCoverBySavings = Math.max(0, yearlyExpensesInRetirement - annualPostFIREIncome);
    
    if (netInitialExpensesToCoverBySavings > 0 && withdrawalRate <= 0) {
        return { error: "Withdrawal rate must be > 0 if savings are needed to cover expenses."};
    }

    const fireNumber = (netInitialExpensesToCoverBySavings <= 0) ? 0 : netInitialExpensesToCoverBySavings / withdrawalRate;
    const realMonthlyPreFireReturn = Math.pow((1 + preFireAnnualReturn) / (1 + expectedInflationRate), 1/12) - 1;
    
    let accumulatedSavings = currentSavings;
    let totalContributions = 0;
    const MAX_PRE_FIRE_MONTHS = 70 * 12;
    
    const annualProjectionData = [];
    const monthlyProjectionData = [];
    const earlyRetirementPlotData = []; // Data for the new plot

    let coastFIREAge = null;
    let coastFIREAccum = null;
    let coastFIREContribs = null;
    
    if (mode === 'coast') {
        // Coast FIRE logic remains unchanged
        let testAge = currentAge;
        let testSavings = currentSavings;
        let testMonth = 0;
        let found = false;
        let contribs = 0;
        while (testAge < coastTargetAge && !found && testMonth < MAX_PRE_FIRE_MONTHS) {
            let saveMonths = testMonth;
            let saveAccum = currentSavings;
            let saveContribs = 0;
            
            // Recalculate saving period from scratch for each test month
            for (let m = 0; m < saveMonths; m++) {
                const age = currentAge + m / 12;
                let eventCashFlow = 0;
                 if (Array.isArray(events)) {
                    events.forEach(ev => {
                        if (age >= ev.startAge && age < ev.endAge + 1/12) {
                            let monthlyAmount = (ev.type === 'income' ? ev.amount : -ev.amount);
                            if (ev.startAge !== ev.endAge) monthlyAmount /= 12; // Distribute annual amount
                            eventCashFlow += monthlyAmount;
                        }
                    });
                }
                saveAccum = saveAccum * (1 + realMonthlyPreFireReturn) + (yearlySavingsContribution / 12) + eventCashFlow;
                saveContribs += yearlySavingsContribution / 12;
            }

            // Coast from this age to target
            let coastAccum = saveAccum;
            for (let m = 0; m < (coastTargetAge - (currentAge + saveMonths / 12)) * 12; m++) {
                const age = currentAge + saveMonths / 12 + m / 12;
                let eventCashFlow = 0;
                 if (Array.isArray(events)) {
                    events.forEach(ev => {
                        if (age >= ev.startAge && age < ev.endAge + 1/12) {
                            let monthlyAmount = (ev.type === 'income' ? ev.amount : -ev.amount);
                            if (ev.startAge !== ev.endAge) monthlyAmount /= 12; // Distribute annual amount
                            eventCashFlow += monthlyAmount;
                        }
                    });
                }
                coastAccum = coastAccum * (1 + realMonthlyPreFireReturn) + eventCashFlow;
            }
            
            if (coastAccum >= fireNumber) {
                coastFIREAge = currentAge + saveMonths / 12;
                coastFIREAccum = saveAccum;
                coastFIREContribs = saveContribs;
                found = true;
                const monthsToCoast = Math.round(saveMonths);
                let coastProjectionSavings = currentSavings;
                let yearAggregates = { contributions: 0, growth: 0, startOfYearSavings: currentSavings, events: 0 };

                for (let month = 1; month <= monthsToCoast; month++) {
                    const currentMonthAge = currentAge + month / 12;
                    const startingBalanceForMonth = coastProjectionSavings;
                    const growthThisMonth = coastProjectionSavings * realMonthlyPreFireReturn;
                    const currentMonthlySavingsContribution = yearlySavingsContribution / 12;
                    
                    let eventCashFlow = 0;
                    if (Array.isArray(events)) {
                        events.forEach(ev => {
                            if (currentMonthAge >= ev.startAge && currentMonthAge < ev.endAge + 1/12) {
                                let monthlyAmount = (ev.type === 'income' ? ev.amount : -ev.amount);
                                if (ev.startAge !== ev.endAge) monthlyAmount /= 12;
                                eventCashFlow += monthlyAmount;
                            }
                        });
                    }
                    
                    coastProjectionSavings += growthThisMonth + currentMonthlySavingsContribution + eventCashFlow;
                    yearAggregates.contributions += currentMonthlySavingsContribution;
                    yearAggregates.growth += growthThisMonth;
                    yearAggregates.events += eventCashFlow;

                    if (month <= numMonthlyRows) {
                        monthlyProjectionData.push({ month, startingBalanceForMonth, currentMonthlySavingsContribution, growthThisMonth, eventCashFlow, accumulatedSavings: coastProjectionSavings, currentMonthAge });
                    }

                    if (month % 12 === 0 || month === monthsToCoast) {
                        annualProjectionData.push({
                            year: Math.ceil(month / 12), age: currentAge + (month/12),
                            startOfYearSavings: yearAggregates.startOfYearSavings, contributions: yearAggregates.contributions,
                            growth: yearAggregates.growth, events: yearAggregates.events, endOfYearSavings: coastProjectionSavings
                        });
                        yearAggregates = { contributions: 0, growth: 0, startOfYearSavings: coastProjectionSavings, events: 0 };
                    }
                }
                break;
            }
            testMonth++;
            testAge = currentAge + testMonth / 12;
        }
    }

    let normalResult = null;
    if (mode === 'normal' || (mode === 'coast' && !coastFIREAge)) {
        let fireReached = (currentSavings >= fireNumber && fireNumber >= 0);
        if (fireNumber === 0 && currentSavings >= 0) fireReached = true;
        let yearAggregates = { contributions: 0, growth: 0, startOfYearSavings: currentSavings, events: 0 };
        let totalMonthsToFIRE = 0;

        const plotStartDate = new Date(); // Using current date as a baseline for plot
        let fireMonth = null;
        let fireAge = null;
        let fireSavings = null;

        // Always push the very first data point at currentAge/currentSavings before any growth/contribution
        // (Removed: do not push to earlyRetirementPlotData)

        if (fireReached) {
            totalMonthsToFIRE = 0;
            // Project until FIRE age + 5 years, continue savings contributions for the plot
            let postFireSavings = accumulatedSavings;
            const endAge = currentAge + 5;
            for (let m = 1; ; m++) {
                const age = currentAge + m / 12;
                if (age > endAge) break;
                const date = new Date(plotStartDate);
                date.setMonth(plotStartDate.getMonth() + m);
                // Use pre-FIRE return and do not add post-FIRE income after FIRE for the plot
                // (Removed: do not push to earlyRetirementPlotData)
                const realMonthlyPreFireReturn = Math.pow((1 + (inputs.preFireReturn / 100)) / (1 + (inputs.expectedInflationRate / 100)), 1/12) - 1;
                postFireSavings = postFireSavings * (1 + realMonthlyPreFireReturn) + (yearlySavingsContribution / 12) - (yearlyExpensesInRetirement / 12);
                const potentialYearlyIncome = postFireSavings * withdrawalRate;
                // (Removed: do not push to earlyRetirementPlotData)
                if (postFireSavings <= 0) break;
            }
        } else {
            for (let month = 1; month <= MAX_PRE_FIRE_MONTHS; month++) {
                const currentMonthAge = currentAge + month / 12;
                const currentMonthlySavingsContribution = yearlySavingsContribution / 12;
                const startingBalanceForMonth = accumulatedSavings;
                const growthThisMonth = accumulatedSavings * realMonthlyPreFireReturn;
                let eventCashFlow = 0;
                if (Array.isArray(events)) {
                    events.forEach(ev => {
                        if (currentMonthAge >= ev.startAge && currentMonthAge < ev.endAge + 1/12) {
                            let monthlyAmount = (ev.type === 'income' ? ev.amount : -ev.amount);
                            if (ev.startAge !== ev.endAge) monthlyAmount /= 12;
                            eventCashFlow += monthlyAmount;
                        }
                    });
                }
                accumulatedSavings += growthThisMonth + currentMonthlySavingsContribution + eventCashFlow;
                totalContributions += currentMonthlySavingsContribution;
                yearAggregates.contributions += currentMonthlySavingsContribution;
                yearAggregates.growth += growthThisMonth;
                yearAggregates.events += eventCashFlow;

                // *** ADDED: Populate data for the Early Retirement Income Plot ***
                // (Removed: do not push to earlyRetirementPlotData)

                if(month <= numMonthlyRows) {
                    monthlyProjectionData.push({ month, startingBalanceForMonth, currentMonthlySavingsContribution, growthThisMonth, eventCashFlow, accumulatedSavings, currentMonthAge });
                }

                if (month % 12 === 0) {
                    annualProjectionData.push({
                        year: month / 12, age: currentAge + (month/12),
                        startOfYearSavings: yearAggregates.startOfYearSavings, contributions: yearAggregates.contributions,
                        growth: yearAggregates.growth, events: yearAggregates.events, endOfYearSavings: accumulatedSavings
                    });
                    yearAggregates = { contributions: 0, growth: 0, startOfYearSavings: accumulatedSavings, events: 0 };
                }

                if (accumulatedSavings >= fireNumber) {
                    totalMonthsToFIRE = month;
                    fireReached = true;
                    fireMonth = month;
                    fireAge = currentMonthAge;
                    fireSavings = accumulatedSavings;
                    if (month % 12 !== 0) {
                        annualProjectionData.push({
                            year: Math.ceil(month / 12), age: currentAge + (month/12),
                            startOfYearSavings: yearAggregates.startOfYearSavings, contributions: yearAggregates.contributions,
                            growth: yearAggregates.growth, events: yearAggregates.events, endOfYearSavings: accumulatedSavings
                        });
                    }
                    break;
                }
            }
            // After FIRE is reached, project until FIRE age + 5 years, continue savings contributions for the plot
            if (fireReached && fireMonth !== null && fireAge !== null && fireSavings !== null) {
                let postFireSavings = fireSavings;
                const endAge = fireAge + 5;
                for (let m = 1; ; m++) {
                    const age = fireAge + m / 12;
                    if (age > endAge) break;
                    const date = new Date(plotStartDate);
                    date.setMonth(plotStartDate.getMonth() + fireMonth - 1 + m);
                    // Use pre-FIRE return and do not add post-FIRE income after FIRE for the plot
                    const realMonthlyPreFireReturn = Math.pow((1 + (inputs.preFireReturn / 100)) / (1 + (inputs.expectedInflationRate / 100)), 1/12) - 1;
                    postFireSavings = postFireSavings * (1 + realMonthlyPreFireReturn) + (yearlySavingsContribution / 12) - (yearlyExpensesInRetirement / 12);
                    const potentialYearlyIncome = postFireSavings * withdrawalRate;
                    // (Removed: do not push to earlyRetirementPlotData)
                    if (postFireSavings <= 0) break;
                }
            }
        }
        if (!fireReached) totalMonthsToFIRE = MAX_PRE_FIRE_MONTHS;
        normalResult = {
            fireNumber, timeToFIREMonths: totalMonthsToFIRE, ageAtFIRE: currentAge + totalMonthsToFIRE / 12,
            savingsAtFIRE: accumulatedSavings, totalContributionsToFIRE: totalContributions, fireReached, 
            annualProjectionData, monthlyProjectionData, earlyRetirementPlotData // Return the plot data
        };
    }
    
    if (mode === 'coast' && coastFIREAge) {
        return {
            fireNumber, coastFIREAge, coastFIREAccum, coastFIREContribs, coastTargetAge, mode: 'coast', fireReached: true,
            annualProjectionData, 
        monthlyProjectionData,
        earlyRetirementPlotData: []
        //annualProjectionData: [], monthlyProjectionData: [], ..earlyRetirementPlotData: []
        };
    } else if (normalResult) {
        return normalResult;
    }
    
    return { error: 'Could not find a solution for this mode.' };
}


// --- Feedback Modal Logic ---
const feedbackButton = document.getElementById('feedbackButton');
const feedbackModal = document.getElementById('feedbackModal');
const closeFeedbackModal = document.getElementById('closeFeedbackModal');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackThanks = document.getElementById('feedbackThanks');

if (feedbackButton) {
    feedbackButton.addEventListener('click', () => {
        feedbackModal.classList.remove('hidden');
        // Reset form view in case it was submitted before
        feedbackForm.classList.remove('hidden');
        feedbackThanks.classList.add('hidden');
        feedbackForm.reset();
    });
}

if (closeFeedbackModal) {
    closeFeedbackModal.addEventListener('click', () => {
        feedbackModal.classList.add('hidden');
    });
}

// Close modal if user clicks outside of it
window.addEventListener('click', (event) => {
    if (event.target == feedbackModal) {
        feedbackModal.classList.add('hidden');
    }
});

// Handle the form submission with JavaScript for a better UX
if (feedbackForm) {
    feedbackForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent the default form submission
        
        const submitButton = document.getElementById('feedbackSubmitButton');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        const formData = new FormData(this);

        fetch(this.action, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                // Show the "Thank You" message
                feedbackForm.classList.add('hidden');
                feedbackThanks.classList.remove('hidden');
            } else {
                response.json().then(data => {
                    if (Object.hasOwn(data, 'errors')) {
                        alert(data["errors"].map(error => error["message"]).join(", "));
                    } else {
                        alert('Oops! There was a problem submitting your form');
                    }
                });
            }
        }).catch(error => {
            alert('Oops! There was a problem submitting your form');
        }).finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit';
        });
    });
}
// --- Global state ---
let oneMoreYearScenarioDataForExport = null;
let lastProjectionResult = null;
let lastSimulationResult = null;
let calculatedAgeAtFIRE = 0;
let calculatedSavingsAtFIRE = 0;
let events = []; // Managed here
let earlyRetirementPlotData = []; // For new plot
let lastHoveredDataPoint = null; // For AI feature

// --- DOM Element Selectors ---
const currentYearEl = document.getElementById('currentYear');
const currentAgeEl = document.getElementById('currentAge');
const currentSavingsEl = document.getElementById('currentSavings');
const grossAnnualIncomeEl = document.getElementById('grossAnnualIncome');
const yearlySavingsContributionEl = document.getElementById('yearlySavingsContribution');
const yearlyExpensesInRetirementEl = document.getElementById('yearlyExpensesInRetirement');
const withdrawalRateEl = document.getElementById('withdrawalRate');
const preFireReturnEl = document.getElementById('preFireReturn');
const postFireReturnEl = document.getElementById('postFireReturn');
const expectedInflationRateEl = document.getElementById('expectedInflationRate');
const monthlyIncomeAfterFIREEl = document.getElementById('monthlyIncomeAfterFIRE');
const currencyEl = document.getElementById('currency'); 
const calculateButton = document.getElementById('calculateButton');
const resetButton = document.getElementById('resetButton');
const printSummaryButtonEl = document.getElementById('printSummaryButton');
const exportDataButtonEl = document.getElementById('exportDataButton');
const resultsSection = document.getElementById('resultsSection');
const errorMessageEl = document.getElementById('errorMessage');
const postFireWarningMessageEl = document.getElementById('postFireWarningMessage');
const fireNumberResultEl = document.getElementById('fireNumberResult');
const timeToFIREResultEl = document.getElementById('timeToFIREResult');
const ageAtFIREResultEl = document.getElementById('ageAtFIREResult');
const fiDateResultEl = document.getElementById('fiDateResult');
const savingsRateResultEl = document.getElementById('savingsRateResult');
const expensesCoveredResultEl = document.getElementById('expensesCoveredResult');
const savingsAtFIREResultEl = document.getElementById('savingsAtFIREResult');
const totalContributionsResultEl = document.getElementById('totalContributionsResult');
const totalGrowthResultEl = document.getElementById('totalGrowthResult');
const annualProjectionTableBodyEl = document.getElementById('annualProjectionTableBody');
const monthlyProjectionTableBodyEl = document.getElementById('monthlyProjectionTableBody');
const detailedMonthsCountEl = document.getElementById('detailedMonthsCount');
const numMonthlyRowsEl = document.getElementById('numMonthlyRows');
const postFireProjectionTableBodyEl = document.getElementById('postFireProjectionTableBody');

// "One More Year" Scenario DOM Elements
const oneMoreYearSectionEl = document.getElementById('oneMoreYearSection');
const extraWorkingYearsEl = document.getElementById('extraWorkingYears');
const omyYearlySavingsContributionEl = document.getElementById('omyYearlySavingsContribution'); 
const runOneMoreYearButtonEl = document.getElementById('runOneMoreYearButton');
const oneMoreYearResultsContainerEl = document.getElementById('oneMoreYearResultsContainer');
const oneMoreYearErrorMessageEl = document.getElementById('oneMoreYearErrorMessage'); 
const extraYearsDisplayEl = document.getElementById('extraYearsDisplay');
const omyPortfolioValueEl = document.getElementById('omyPortfolioValue');
const omyRetirementAgeEl = document.getElementById('omyRetirementAge');
const omyIncreasedSpendingEl = document.getElementById('omyIncreasedSpending');
const omyFundsLastUntilEl = document.getElementById('omyFundsLastUntil');

// Early Retirement Plot DOM Elements
const earlyRetirementIncomeSectionEl = document.getElementById('earlyRetirementIncomeSection');
const earlyRetirementPlotContainerEl = document.getElementById('earlyRetirementPlotContainer');
const compStartDateMonthEl = document.getElementById('compStartDateMonth');
const compStartDateYearEl = document.getElementById('compStartDateYear');
const compSavings1El = document.getElementById('compSavings1'); 
const compStartSavings1El = document.getElementById('compStartSavings1');
const compSavings2El = document.getElementById('compSavings2'); 
const compStartSavings2El = document.getElementById('compStartSavings2'); 
const runEarlyRetirementPlotButtonEl = document.getElementById('runEarlyRetirementPlotButton'); 

// Advanced Retirement Simulation Elements
const retirementSimulationSectionEl = document.getElementById('retirementSimulationSection');
const simTypeRadios = document.querySelectorAll('input[name="simType"]');
const monteCarloParamsEl = document.getElementById('monteCarloParams');
const historicalParamsEl = document.getElementById('historicalParams');
const simPortfolioValueEl = document.getElementById('simPortfolioValue');
const simYearlyExpensesEl = document.getElementById('simYearlyExpenses');
const simRetirementAgeEl = document.getElementById('simRetirementAge');
const simReturnEl = document.getElementById('simReturn');
const simVolatilityEl = document.getElementById('simVolatility');
const simCountEl = document.getElementById('simCount');
const runSimulationButtonEl = document.getElementById('runSimulationButton');
const simulationPlotContainerEl = document.getElementById('simulationPlotContainer');
const simulationResultsContainerEl = document.getElementById('simulationResultsContainer');
const simSuccessRateEl = document.getElementById('simSuccessRate');
const simMedianEl = document.getElementById('simMedian');
const sim10thPercentileEl = document.getElementById('sim10thPercentile');
const sim90thPercentileEl = document.getElementById('sim90thPercentile');
const simFlexYearsEl = document.getElementById('simFlexYears');
const simulationWarningEl = document.getElementById('simulationWarning');
const simulationErrorMessageEl = document.getElementById('simulationErrorMessage');
const presetButtons = document.querySelectorAll('.preset-button');
const flexThresholdEl = document.getElementById('flexThreshold');
const flexReductionEl = document.getElementById('flexReduction');
const stockAllocationEl = document.getElementById('stockAllocation');
const stockAllocationValueEl = document.getElementById('stockAllocationValue');
const bondAllocationValueEl = document.getElementById('bondAllocationValue');

// Modal & Other Elements
const exportModalEl = document.getElementById('exportModal');
const closeExportModalEl = document.getElementById('closeExportModal');
const exportDataTextAreaEl = document.getElementById('exportDataTextArea');
const copyExportDataButtonEl = document.getElementById('copyExportDataButton');
const fireModeEl = document.getElementById('fireMode');


// --- Event Listeners Setup ---
function setupEventListeners() {
    if (calculateButton) calculateButton.addEventListener('click', calculateAndDisplayProjection);
    if (resetButton) resetButton.addEventListener('click', resetForm);
    if (runOneMoreYearButtonEl) runOneMoreYearButtonEl.addEventListener('click', calculateOneMoreYearScenario);
    if (runSimulationButtonEl) runSimulationButtonEl.addEventListener('click', () => runRetirementSimulation(null, false));
    if(printSummaryButtonEl) printSummaryButtonEl.addEventListener('click', () => window.print());
    if (exportDataButtonEl) exportDataButtonEl.addEventListener('click', openExportModal);
    if (closeExportModalEl) closeExportModalEl.addEventListener('click', () => exportModalEl.classList.add('hidden'));
    if (copyExportDataButtonEl) copyExportDataButtonEl.addEventListener('click', copyExportDataToClipboard);
    if (runEarlyRetirementPlotButtonEl) runEarlyRetirementPlotButtonEl.addEventListener('click', runEarlyRetirementComparison); 

    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            simReturnEl.value = button.dataset.return;
            simVolatilityEl.value = button.dataset.vol;
        });
    });

    simTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const isMonteCarlo = document.getElementById('simTypeMonteCarlo').checked;
            monteCarloParamsEl.classList.toggle('hidden', !isMonteCarlo);
            historicalParamsEl.classList.toggle('hidden', isMonteCarlo);
        });
    });
    
    stockAllocationEl.addEventListener('input', () => {
        stockAllocationValueEl.textContent = stockAllocationEl.value;
        bondAllocationValueEl.textContent = 100 - stockAllocationEl.value;
    });
}

function validateInputs(inputs, isAdvancedSim = false, isOneMoreYearSim = false) { 
    const errors = [];
    if (isOneMoreYearSim) {
        if (isNaN(inputs.extraWorkingYears) || inputs.extraWorkingYears < 0 || inputs.extraWorkingYears > 20) errors.push("Extra Working Years: Must be between 0 and 20.");
        if (!inputs.baseFireReached) errors.push("Main projection must be calculated first.");
        if (inputs.omyYearlySavingsContribution !== null && (isNaN(inputs.omyYearlySavingsContribution) || inputs.omyYearlySavingsContribution < 0)) errors.push("OMY Yearly Savings must be a non-negative number.");
    } else if (!isAdvancedSim) { 
        if (isNaN(inputs.currentAge) || inputs.currentAge <= 0 || inputs.currentAge > 100) errors.push("Current Age: Must be between 1 and 100.");
        if (isNaN(inputs.currentSavings) || inputs.currentSavings < 0) errors.push("Current Savings: Must be a non-negative number.");
        if (isNaN(inputs.yearlySavingsContribution) || inputs.yearlySavingsContribution < 0) errors.push("Yearly Savings Contribution: Must be a non-negative number.");
        if (inputs.grossAnnualIncome > 0 && inputs.yearlySavingsContribution > inputs.grossAnnualIncome && inputs.yearlySavingsContribution > 0) errors.push("Yearly Savings Contribution cannot exceed Gross Annual Income.");
        if (isNaN(inputs.yearlyExpensesInRetirement) || inputs.yearlyExpensesInRetirement <= 0) errors.push("Yearly Expenses in Retirement: Must be a positive number.");
        if (isNaN(inputs.withdrawalRate) || inputs.withdrawalRate <= 0 || inputs.withdrawalRate > 20) errors.push("Withdrawal Rate: Must be between 0.1 and 20.");
        if (isNaN(inputs.preFireReturn) || inputs.preFireReturn < -50 || inputs.preFireReturn > 50) errors.push("Pre-FIRE Return: Must be between -50 and 50.");
        if (isNaN(inputs.postFireReturn) || inputs.postFireReturn < -50 || inputs.postFireReturn > 50) errors.push("Post-FIRE Return: Must be between -50 and 50.");
        if (isNaN(inputs.expectedInflationRate) || inputs.expectedInflationRate < -10 || inputs.expectedInflationRate > 20) errors.push("Inflation Rate: Must be between -10 and 20.");
    } else { 
        if (isNaN(inputs.simRetirementAge) || inputs.simRetirementAge <=0 || inputs.simRetirementAge > 120) errors.push("Sim Retirement Age: Must be between 1-120.");
        if (isNaN(inputs.simPortfolioValue) || inputs.simPortfolioValue < 0) errors.push("Retirement Portfolio must be a non-negative number.");
        if (isNaN(inputs.simYearlyExpenses) || inputs.simYearlyExpenses < 0) errors.push("Yearly Expenses must be a non-negative number.");
        
        if (inputs.simType === 'monteCarlo') {
            if (isNaN(inputs.simVolatility) || inputs.simVolatility < 0 || inputs.simVolatility > 100) errors.push("Market Volatility: Must be between 0-100.");
            if (isNaN(inputs.simReturn) || inputs.simReturn < -50 || inputs.simReturn > 50) errors.push("Avg. Annual Return: Must be between -50 and 50.");
            if (isNaN(inputs.simCount) || inputs.simCount < 100 || inputs.simCount > 10000) errors.push("Number of Simulations: Must be between 100 and 10,000.");
        } else {
                if (isNaN(inputs.stockAllocation) || inputs.stockAllocation < 0 || inputs.stockAllocation > 100) errors.push("Stock Allocation must be between 0 and 100.");
        }
            if (isNaN(inputs.flexThreshold) || inputs.flexThreshold < 0 || inputs.flexThreshold > 100) errors.push("Flex Threshold: Must be between 0-100.");
            if (isNaN(inputs.flexReduction) || inputs.flexReduction < 0 || inputs.flexReduction > 100) errors.push("Spending Reduction: Must be between 0-100.");
    }

    let errorEl = isOneMoreYearSim ? oneMoreYearErrorMessageEl : (isAdvancedSim ? simulationErrorMessageEl : errorMessageEl);
    if (errors.length > 0) {
        errorEl.innerHTML = "Please correct the following: <br>" + errors.join("<br>");
        errorEl.classList.remove('hidden');
        return false;
    }
    errorEl.classList.add('hidden'); 
    return true;
}

function getCurrentInputs() {
    return {
        currentAge: parseFloat(currentAgeEl.value), currentSavings: parseFloat(currentSavingsEl.value),
        grossAnnualIncome: parseFloat(grossAnnualIncomeEl.value), yearlySavingsContribution: parseFloat(yearlySavingsContributionEl.value),
        yearlyExpensesInRetirement: parseFloat(yearlyExpensesInRetirementEl.value), withdrawalRate: parseFloat(withdrawalRateEl.value),
        preFireReturn: parseFloat(preFireReturnEl.value), postFireReturn: parseFloat(postFireReturnEl.value),
        expectedInflationRate: parseFloat(expectedInflationRateEl.value), monthlyIncomeAfterFIRE: parseFloat(monthlyIncomeAfterFIREEl.value),
        numMonthlyRows: parseInt(numMonthlyRowsEl.value),
        currency: currencyEl.value
    };
}

function calculateAndDisplayProjection() {
    const inputs = getCurrentInputs();
    if (!validateInputs(inputs)) return;

    const projection = calculateProjection(inputs, events);
    lastProjectionResult = projection;

    if (projection.error) {
        errorMessageEl.textContent = projection.error;
        errorMessageEl.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        return;
    }
    
    calculatedAgeAtFIRE = projection.ageAtFIRE || (projection.mode === 'coast' ? projection.coastFIREAge : 0);
    calculatedSavingsAtFIRE = projection.savingsAtFIRE || (projection.mode === 'coast' ? projection.coastFIREAccum : 0);
    
    // Assign plot data from projection to the global variable
    earlyRetirementPlotData = projection.earlyRetirementPlotData || [];


    displayMainProjection(projection, inputs);
    populateProjectionTables(projection, inputs);
    
    const simInputs = getSimulationInputs(projection, inputs);
    if(simInputs) runRetirementSimulation(simInputs, true); 

    // Show and auto-run the early retirement plot
    if (earlyRetirementIncomeSectionEl) {
        earlyRetirementIncomeSectionEl.classList.remove('hidden');
        compSavings1El.value = inputs.yearlySavingsContribution;
        compStartSavings1El.value = '';
        compSavings2El.value = '';
        compStartSavings2El.value = '';
        runEarlyRetirementComparison();
    }
}

function displayMainProjection(projection, inputs) {
    const { fireNumber, timeToFIREMonths, ageAtFIRE, savingsAtFIRE, totalContributionsToFIRE, fireReached, mode, coastFIREAge, coastFIREAccum, coastFIREContribs, coastTargetAge } = projection;
    const { currency, currentAge, grossAnnualIncome, yearlySavingsContribution, yearlyExpensesInRetirement } = inputs;
    const MAX_PRE_FIRE_YEARS = 70;
    const coastNumberCard = document.getElementById('coastNumberCard');
    const coastNumberResultEl = document.getElementById('coastNumberResult');
    
    if (mode === 'coast' && coastFIREAge) {
        fireNumberResultEl.textContent = formatCurrency(fireNumber, currency);
        timeToFIREResultEl.textContent = `${(coastFIREAge - currentAge).toFixed(1)} Yrs to Coast`;
        ageAtFIREResultEl.textContent = `Coast at ${coastFIREAge.toFixed(1)}`;
        
        if (typeof coastTargetAge !== 'undefined' && coastTargetAge > currentAge) {
            const yearsToTarget = coastTargetAge - currentAge;
            const fiDate = new Date();
            fiDate.setFullYear(fiDate.getFullYear() + Math.floor(yearsToTarget));
            fiDate.setMonth(fiDate.getMonth() + Math.round((yearsToTarget % 1) * 12));
            fiDateResultEl.textContent = fiDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        } else {
            fiDateResultEl.textContent = 'N/A';
        }
        savingsRateResultEl.textContent = grossAnnualIncome > 0 ? (yearlySavingsContribution / grossAnnualIncome * 100).toFixed(1) + '%' : 'N/A';
        expensesCoveredResultEl.textContent = (inputs.currentSavings / yearlyExpensesInRetirement).toFixed(1) + ' Years';
        totalContributionsResultEl.textContent = formatCurrency(coastFIREContribs, currency);
        totalGrowthResultEl.textContent = formatCurrency(coastFIREAccum - inputs.currentSavings - coastFIREContribs, currency);
        savingsAtFIREResultEl.textContent = formatCurrency(coastFIREAccum, currency);
        if (coastNumberCard && coastNumberResultEl) {
            coastNumberCard.classList.remove('hidden');
            coastNumberResultEl.textContent = formatCurrency(coastFIREAccum, currency);
        }
        
        oneMoreYearSectionEl.classList.add('hidden');
        retirementSimulationSectionEl.classList.add('hidden');
        earlyRetirementIncomeSectionEl.classList.add('hidden');
        
    } else { // Normal Mode or Coast Fallback
    fireNumberResultEl.textContent = formatCurrency(fireNumber, currency);
    timeToFIREResultEl.textContent = fireReached ? `${Math.floor(timeToFIREMonths / 12)} Yrs, ${timeToFIREMonths % 12} Mos` : `> ${MAX_PRE_FIRE_YEARS} Yrs`;
        const ageAtFireDisplayYears = Math.floor(ageAtFIRE); 
        const ageAtFireDisplayMonths = Math.round((ageAtFIRE % 1) * 12);
    ageAtFIREResultEl.textContent =  fireReached ? `${ageAtFireDisplayYears}y ${ageAtFireDisplayMonths}m` : `> ${currentAge + MAX_PRE_FIRE_YEARS}`;
        
        if(fireReached){ 
            const fiDate = new Date(); 
            fiDate.setMonth(fiDate.getMonth() + timeToFIREMonths); 
            fiDateResultEl.textContent = fiDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        } else {
            fiDateResultEl.textContent = "Not Reached";
        }
        
    const savingsRate = (grossAnnualIncome > 0 && yearlySavingsContribution >=0) ? (yearlySavingsContribution / grossAnnualIncome) * 100 : 0;
    savingsRateResultEl.textContent = savingsRate.toFixed(1) + "%";
    const expensesCovered = (yearlyExpensesInRetirement > 0 && inputs.currentSavings >=0) ? inputs.currentSavings / yearlyExpensesInRetirement : 0;
    expensesCoveredResultEl.textContent = expensesCovered.toFixed(1) + " Years";
    totalContributionsResultEl.textContent = formatCurrency(totalContributionsToFIRE, currency);
    const totalGrowthToFIRE = savingsAtFIRE - inputs.currentSavings - totalContributionsToFIRE;
    totalGrowthResultEl.textContent = formatCurrency(totalGrowthToFIRE, currency) + (fireReached ? "" : " (proj.)");
    savingsAtFIREResultEl.textContent = formatCurrency(savingsAtFIRE, currency);
    
    oneMoreYearSectionEl.classList.remove('hidden');
    retirementSimulationSectionEl.classList.remove('hidden');
        if (coastNumberCard) coastNumberCard.classList.add('hidden');

    simPortfolioValueEl.value = Math.round(savingsAtFIRE);
    simRetirementAgeEl.value = Math.round(ageAtFIRE);
    simYearlyExpensesEl.value = inputs.yearlyExpensesInRetirement;
    simReturnEl.value = inputs.postFireReturn;
    }

    resultsSection.classList.remove('hidden');
    printSummaryButtonEl.classList.remove('hidden');
    exportDataButtonEl.classList.remove('hidden');
    
    const maxYearsMessageEl = document.getElementById('maxYearsMessage');
    if(maxYearsMessageEl) {
            maxYearsMessageEl.classList.toggle('hidden', fireReached);
            if(!fireReached) maxYearsMessageEl.textContent = `FIRE goal not reached within ${MAX_PRE_FIRE_YEARS} years.`;
    }
}

function populateProjectionTables(projection, inputs) {
    const { annualProjectionData, monthlyProjectionData, fireReached, savingsAtFIRE, ageAtFIRE } = projection;
    const { currency, postFireReturn, expectedInflationRate, yearlyExpensesInRetirement, monthlyIncomeAfterFIRE, numMonthlyRows } = inputs;
    
    annualProjectionTableBodyEl.innerHTML = '';
    if (annualProjectionData) {
        annualProjectionData.forEach(data => {
            annualProjectionTableBodyEl.innerHTML += `<tr><td>${data.year}</td><td>${Math.floor(data.age)}</td><td>${formatCurrency(data.startOfYearSavings, currency)}</td><td>${formatCurrency(data.contributions, currency)}</td><td>${formatCurrency(data.growth, currency)}</td><td>${formatCurrency(data.events || 0, currency)}</td><td>${formatCurrency(data.endOfYearSavings, currency)}</td></tr>`;
        });
    }

    monthlyProjectionTableBodyEl.innerHTML = '';
    if (detailedMonthsCountEl) detailedMonthsCountEl.textContent = numMonthlyRows;
    if(monthlyProjectionData){
        monthlyProjectionData.forEach(data => {
            const projDate = new Date(); projDate.setMonth(projDate.getMonth() + data.month - 1);
            const fullAge = data.currentMonthAge;
            monthlyProjectionTableBodyEl.innerHTML += `<tr><td>${data.month}</td><td>${projDate.toLocaleString('default', { month: 'short' })} ${projDate.getFullYear()}</td><td>${fullAge.toFixed(1)}</td><td>${formatCurrency(data.startingBalanceForMonth, currency)}</td><td>${formatCurrency(data.currentMonthlySavingsContribution, currency)}</td><td>${formatCurrency(data.growthThisMonth, currency)}</td><td>${formatCurrency(data.eventCashFlow || 0, currency)}</td><td>${formatCurrency(data.accumulatedSavings, currency)}</td></tr>`;
        });
    }
    
    const postFireTabButton = document.getElementById('postFireTabButton');
    postFireProjectionTableBodyEl.innerHTML = '';
    
    // This correctly enables the tab for both modes
    if (postFireTabButton) postFireTabButton.disabled = !fireReached;

    // Existing logic for Normal Mode
    if (fireReached && ageAtFIRE) {
        let postFireSavings = savingsAtFIRE;
        const realAnnualPostFireReturn = (1 + postFireReturn / 100) / (1 + expectedInflationRate / 100) - 1;
        const netWithdrawal = Math.max(0, yearlyExpensesInRetirement - (monthlyIncomeAfterFIRE * 12));
        let fundsDepleted = false;

        for (let year = 0; year < (95 - ageAtFIRE); year++) {
            const currentAge = Math.floor(ageAtFIRE) + year;
            if (currentAge >= 95) break;
            const startBalance = postFireSavings;
            const growth = startBalance * realAnnualPostFireReturn;
            postFireSavings += growth - netWithdrawal;

            if (postFireSavings <= 0 && netWithdrawal > 0) {
                postFireSavings = 0;
                fundsDepleted = true;
            }

            postFireProjectionTableBodyEl.innerHTML += `<tr><td>${year + 1}</td><td>${currentAge}</td><td>${formatCurrency(startBalance, currency)}</td><td>${formatCurrency(growth, currency)}</td><td>${formatCurrency(netWithdrawal, currency)}</td><td>${formatCurrency(monthlyIncomeAfterFIRE * 12, currency)}</td><td>${formatCurrency(postFireSavings, currency)}</td></tr>`;
            
            if (fundsDepleted) break;
        }
    } 
    // FIX: Add a new block to handle the post-FIRE projection for Coast Mode
    else if (projection.mode === 'coast' && projection.fireReached) {
        // In Coast Mode, the drawdown starts at the 'coastTargetAge' with the final 'fireNumber'
        let postFireSavings = projection.fireNumber; 
        const realAnnualPostFireReturn = (1 + postFireReturn / 100) / (1 + expectedInflationRate / 100) - 1;
        const netWithdrawal = Math.max(0, yearlyExpensesInRetirement - (monthlyIncomeAfterFIRE * 12));
        let fundsDepleted = false;

        for (let year = 0; year < (95 - projection.coastTargetAge); year++) {
            const currentAge = Math.floor(projection.coastTargetAge) + year;
            if (currentAge >= 95) break;
            const startBalance = postFireSavings;
            const growth = startBalance * realAnnualPostFireReturn;
            postFireSavings += growth - netWithdrawal;

            if (postFireSavings <= 0 && netWithdrawal > 0) {
                postFireSavings = 0;
                fundsDepleted = true;
            }

            postFireProjectionTableBodyEl.innerHTML += `<tr><td>${year + 1}</td><td>${currentAge}</td><td>${formatCurrency(startBalance, currency)}</td><td>${formatCurrency(growth, currency)}</td><td>${formatCurrency(netWithdrawal, currency)}</td><td>${formatCurrency(monthlyIncomeAfterFIRE * 12, currency)}</td><td>${formatCurrency(postFireSavings, currency)}</td></tr>`;
            
            if (fundsDepleted) break;
        }
    }
}
function calculateOneMoreYearScenario() {
    oneMoreYearResultsContainerEl.classList.add('hidden');
    oneMoreYearErrorMessageEl.classList.add('hidden');

    const extraYears = parseFloat(extraWorkingYearsEl.value);
    const omySavingsInput = omyYearlySavingsContributionEl.value.trim() === '' ? null : parseFloat(omyYearlySavingsContributionEl.value);
    
    const validationInputs = {
        extraWorkingYears: extraYears,
        baseFireReached: lastProjectionResult && lastProjectionResult.fireReached,
        omyYearlySavingsContribution: omySavingsInput
    };

    if (!validateInputs(validationInputs, false, true)) return;

    const yearlyContributionForOMY = (omySavingsInput !== null && !isNaN(omySavingsInput)) ? omySavingsInput : parseFloat(yearlySavingsContributionEl.value);
    const { preFireReturn, expectedInflationRate, postFireReturn, yearlyExpensesInRetirement, withdrawalRate, monthlyIncomeAfterFIRE, currency } = getCurrentInputs();
    const realMonthlyPreFireReturn = Math.pow((1 + preFireReturn / 100) / (1 + expectedInflationRate / 100), 1 / 12) - 1;
    
    let newPortfolioValue = calculatedSavingsAtFIRE;
    for (let i = 0; i < extraYears; i++) { 
        newPortfolioValue = newPortfolioValue * (1 + realMonthlyPreFireReturn) ** 12 + yearlyContributionForOMY - yearlyExpensesInRetirement;
    }

    const newRetirementAge = calculatedAgeAtFIRE + extraYears;
    const newTotalSpendingPossible = (newPortfolioValue * (withdrawalRate / 100)) + (monthlyIncomeAfterFIRE * 12);
    const originalTotalSpendingPossible = (calculatedSavingsAtFIRE * (withdrawalRate / 100)) + (monthlyIncomeAfterFIRE * 12);
    const deltaSpending = newTotalSpendingPossible - originalTotalSpendingPossible;

    let fundsLastUntilAge = "> 95";
    const realAnnualPostFireReturn = (1 + postFireReturn / 100) / (1 + expectedInflationRate / 100) - 1;
    const originalNetExpenses = Math.max(0, yearlyExpensesInRetirement - (monthlyIncomeAfterFIRE * 12));
    let tempPortfolio = newPortfolioValue;

    for (let year = 0; year < (96 - newRetirementAge); year++) {
        if (tempPortfolio <= 0 && originalNetExpenses > 0) {
            fundsLastUntilAge = (newRetirementAge + year).toFixed(0);
            break;
        }
        tempPortfolio = tempPortfolio * (1 + realAnnualPostFireReturn) - originalNetExpenses;
    }
    
    extraYearsDisplayEl.textContent = extraYears;
    omyPortfolioValueEl.textContent = formatCurrency(newPortfolioValue, currency);
    omyRetirementAgeEl.textContent = newRetirementAge.toFixed(1);
    omyIncreasedSpendingEl.innerHTML = `${formatCurrency(newTotalSpendingPossible, currency)}<br><span class='text-green-700 text-sm'>(+${formatCurrency(deltaSpending, currency)} vs. original)</span>`;
    omyFundsLastUntilEl.textContent = fundsLastUntilAge;
    oneMoreYearResultsContainerEl.classList.remove('hidden');
    
    oneMoreYearScenarioDataForExport = { extraYears, newPortfolioValue, newRetirementAge, newTotalSpendingPossible, deltaSpending, fundsLastUntilAge };
}

// --- Early Retirement Income Plot Functions ---
function runEarlyRetirementComparison() {
    const plotDataSets = [];
    const currentAge = parseFloat(currentAgeEl.value);
    const defaultStartSavings = parseFloat(currentSavingsEl.value);
    const withdrawalRate = parseFloat(withdrawalRateEl.value) / 100;
    const preFireAnnualReturn = parseFloat(preFireReturnEl.value) / 100;
    const expectedInflationRate = parseFloat(expectedInflationRateEl.value) / 100;
    const annualPostFIREIncome = parseFloat(monthlyIncomeAfterFIREEl.value) * 12;
    const realMonthlyPreFireReturn = Math.pow((1 + preFireAnnualReturn) / (1 + expectedInflationRate), 1/12) - 1;
    const plotStartDate = new Date(parseInt(compStartDateYearEl.value), parseInt(compStartDateMonthEl.value), 1);
    const currency = currencyEl.value;

    // Only plot Comparison 1 and 2
    [
        { savingsEl: compSavings1El, startSavingsEl: compStartSavings1El, label: null },
        { savingsEl: compSavings2El, startSavingsEl: compStartSavings2El, label: null }
    ].forEach((scenario, idx) => {
        const yearlySavingsVal = scenario.savingsEl.value.trim();
        if (yearlySavingsVal === '' || isNaN(parseFloat(yearlySavingsVal))) {
            return; 
        }
        const yearlySavings = parseFloat(yearlySavingsVal);

        let startSavings;
        let customStartLabel = '';
        // For Comparison 1, always use the current inputted savings as the default
        if (idx === 0) {
            startSavings = defaultStartSavings;
        } else {
            const customStartSavingsVal = scenario.startSavingsEl.value.trim();
            if (customStartSavingsVal !== '' && !isNaN(parseFloat(customStartSavingsVal))) {
                startSavings = parseFloat(customStartSavingsVal);
                customStartLabel = ` (Start: ${formatCurrency(startSavings, currency)})`;
            } else {
                startSavings = defaultStartSavings;
            }
        }

        if(scenario.label === null){
            scenario.label = `Savings ${formatCurrency(yearlySavings, currency)}/yr` + customStartLabel;
        }

        let plotData = [];
        let accumulatedSavings = startSavings;

        const initialDate = new Date(plotStartDate);
        const initialPotentialYearlyIncome = (accumulatedSavings * withdrawalRate) + annualPostFIREIncome;
        plotData.push({ age: currentAge, incomeValue: initialPotentialYearlyIncome / 12, capitalValue: accumulatedSavings, date: initialDate });

        for (let month = 1; month < (calculatedAgeAtFIRE + 5 - currentAge) * 12; month++) { 
            const ageAtThisMonthExact = currentAge + month / 12;
            const dateAtThisMonth = new Date(plotStartDate);
            dateAtThisMonth.setMonth(plotStartDate.getMonth() + month);

            const monthlySavings = yearlySavings / 12;
            accumulatedSavings = accumulatedSavings * (1 + realMonthlyPreFireReturn) + monthlySavings;

            const potentialYearlyIncome = (accumulatedSavings * withdrawalRate) + annualPostFIREIncome;
            plotData.push({ age: ageAtThisMonthExact, incomeValue: potentialYearlyIncome / 12, capitalValue: accumulatedSavings, date: dateAtThisMonth });

            if(ageAtThisMonthExact >= calculatedAgeAtFIRE + 4.9) break; 
        }
        plotDataSets.push({ label: scenario.label, values: plotData });
    });

    if (plotDataSets.length === 0) { 
        earlyRetirementPlotContainerEl.innerHTML = `<p class="text-center text-gray-500">Please enter at least one savings scenario to plot.</p>`;
        return;
    }

    drawEarlyRetirementPlot(plotDataSets, true);
}

function drawEarlyRetirementPlot(plotDataSets, isComparison = false) {
    earlyRetirementPlotContainerEl.innerHTML = '';
    const allData = plotDataSets.flatMap(d => d.values);
    if (!allData || allData.length === 0) return;

    const containerRect = earlyRetirementPlotContainerEl.getBoundingClientRect();
    const containerWidth = containerRect.width > 0 ? containerRect.width : 600;
    
    const margin = {top: 50, right: isComparison ? 250 : 80, bottom: 50, left: 70}, 
            width = containerWidth - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
    
    if (width <= 0) return;

    const svg = d3.select("#earlyRetirementPlotContainer").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");
    const currency = currencyEl.value;

    const yLeftScale = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d.incomeValue)])
        .range([height, 0]).nice();

    const yRightScale = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d.capitalValue)])
        .range([height, 0]).nice();
    
    const xScale = d3.scaleLinear()
        .domain(d3.extent(allData, d => d.age))
        .range([ 0, width ]);

    svg.append("g").attr("class", "grid").call(d3.axisLeft(yLeftScale).ticks(5).tickSize(-width).tickFormat(""));
    
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis axis--left").call(d3.axisLeft(yLeftScale).tickFormat(d => formatCurrency(d, currency)));
    svg.append("g").attr("class", "axis axis--right").attr("transform", `translate(${width}, 0)`).call(d3.axisRight(yRightScale).tickFormat(d => {
        if (isNaN(d)) return ""; if (d === 0) return "0";
        if (Math.abs(d) >= 1000000) return (d / 1000000).toFixed(1).replace(/\.0$/, '') + "M";
        if (Math.abs(d) >= 1000) return (d / 1000).toFixed(0) + "k";
        return d.toString();
    }));

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    
    plotDataSets.forEach((dataSet, i) => {
            const incomeLine = d3.line().x(d => xScale(d.age)).y(d => yLeftScale(d.incomeValue));
            const capitalLine = d3.line().x(d => xScale(d.age)).y(d => yRightScale(d.capitalValue));
        
        svg.append("path").datum(dataSet.values).attr("fill", "none")
            .attr("stroke", colorScale(i))
            .attr("stroke-width", 2.5).attr("d", incomeLine);
        svg.append("path").datum(dataSet.values).attr("fill", "none")
            .attr("stroke", colorScale(i)).style("stroke-dasharray", "5,5")
            .attr("stroke-width", 2.5).attr("d", capitalLine);
        
        if (isComparison) {
                const legend = svg.append("g").attr("class", "legend-item").attr("transform", `translate(${width + 20}, ${i * 30})`); 
            legend.append("rect").attr("width", 10).attr("height", 10).style("fill", colorScale(i));
            legend.append("text").attr("x", 15).attr("y", 9).text(dataSet.label).style("font-size", "0.75rem");
        }
    });

    const targetMonthlySpending = parseFloat(yearlyExpensesInRetirementEl.value) / 12;
    if (targetMonthlySpending > 0 && targetMonthlySpending < yLeftScale.domain()[1]) { 
        svg.append("line").attr("x1", 0).attr("x2", width).attr("y1", yLeftScale(targetMonthlySpending)).attr("y2", yLeftScale(targetMonthlySpending))
            .attr("stroke", "#ef4444").attr("stroke-width", 2).attr("stroke-dasharray", "5,5");
        svg.append("text").attr("x", width + 5).attr("y", yLeftScale(targetMonthlySpending) + 4)
            .attr("fill", "#ef4444").style("font-size", "0.7rem").text("Target Income");
    }
    if(calculatedAgeAtFIRE > xScale.domain()[0] && calculatedAgeAtFIRE < xScale.domain()[1]){
            svg.append("line").attr("x1", xScale(calculatedAgeAtFIRE)).attr("x2", xScale(calculatedAgeAtFIRE))
            .attr("y1", 0).attr("y2", height).attr("stroke", "#3b82f6").attr("stroke-width", 2).attr("stroke-dasharray", "5,5");
            svg.append("text").attr("transform", `translate(${xScale(calculatedAgeAtFIRE)}, -10) rotate(-90)`)
            .attr("fill", "#3b82f6").style("font-size", "0.7rem").style("text-anchor", "end").text("FIRE Age");
    }


    svg.append("text").attr("x", width/2).attr("y", 0-(margin.top/2)).attr("class", "plot-title").style("fill", "#047857").text("Potential Monthly Income & Capital Growth");
    svg.append("text").attr("class", "axis-label").attr("text-anchor", "middle").attr("x", width/2).attr("y", height + margin.bottom - 10).text("Age");
    svg.append("text").attr("class", "axis-label").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("y", 0 - margin.left + 20).attr("x", 0 - height/2).text("Potential Monthly Income (Solid)");
    svg.append("text").attr("class", "axis-label").attr("text-anchor", "middle").attr("transform", "rotate(90)").attr("y", 0 - width - margin.right + 45).attr("x", height / 2).text("Accumulated Capital (Dashed)");


        const bisectAge = d3.bisector(d => d.age).left;
        svg.append("rect").attr("width", width).attr("height", height).style("fill", "none").style("pointer-events", "all")
        .on("mouseover", () => tooltip.style("opacity", 1)).on("mouseout", () => tooltip.style("opacity", 0))
        .on("mousemove", (event) => {
            const [mx] = d3.pointer(event);
            const hoveredAge = xScale.invert(mx);
            let tooltipHtml = "";
            const currency = currencyEl.value;

            plotDataSets.forEach((dataSet, i) => {
                    const index = bisectAge(dataSet.values, hoveredAge, 1);
                    const d0 = dataSet.values[index - 1];
                    const d1 = dataSet.values[index];
                    const d = (d1 && (hoveredAge - d0.age > d1.age - hoveredAge)) ? d1 : d0;
                    if (d) {
                        lastHoveredDataPoint = d;
                        tooltipHtml += `<div style="color: ${colorScale(i)}; text-align: left;">
                        <strong>${dataSet.label}</strong><br>
                        Date: ${d.date.toLocaleString('default', { month: 'short', year: 'numeric' })}<br>
                        Age: ${d.age.toFixed(1)}<br>
                        Income: ${formatCurrency(d.incomeValue, currency)}/month<br>
                        Capital: ${formatCurrency(d.capitalValue, currency)}
                        </div><hr class="my-1 border-gray-500">`;
                    }
            });

            tooltip.html(tooltipHtml)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        });
}

// --- Advanced Retirement Simulation ---
const historicalData = [ // S&P 500 Total Return, 10-Year Treasury Bond Return
    { year: 1928, stocks: 0.4381, bonds: 0.0084 }, { year: 1929, stocks: -0.0830, bonds: 0.0420 }, { year: 1930, stocks: -0.2490, bonds: 0.0454 }, 
    { year: 1931, stocks: -0.4334, bonds: -0.0256 }, { year: 1932, stocks: -0.0819, bonds: 0.0879 }, { year: 1933, stocks: 0.5399, bonds: 0.0351 }, 
    { year: 1934, stocks: -0.0144, bonds: 0.0784 }, { year: 1935, stocks: 0.4767, bonds: 0.0465 }, { year: 1936, stocks: 0.3393, bonds: 0.0526 }, 
    { year: 1937, stocks: -0.3503, bonds: 0.0113 }, { year: 1938, stocks: 0.3112, bonds: 0.0436 }, { year: 1939, stocks: -0.0041, bonds: 0.0441 }, 
    { year: 1940, stocks: -0.0978, bonds: 0.0540 }, { year: 1941, stocks: -0.1159, bonds: 0.0234 }, { year: 1942, stocks: 0.2034, bonds: 0.0267 }, 
    { year: 1943, stocks: 0.2590, bonds: 0.0249 }, { year: 1944, stocks: 0.1975, bonds: 0.0267 }, { year: 1945, stocks: 0.3644, bonds: 0.0358 }, 
    { year: 1946, stocks: -0.0807, bonds: 0.0223 }, { year: 1947, stocks: 0.0571, bonds: 0.0142 }, { year: 1948, stocks: 0.0550, bonds: 0.0157 }, 
    { year: 1949, stocks: 0.1879, bonds: 0.0396 }, { year: 1950, stocks: 0.3171, bonds: 0.0166 }, { year: 1951, stocks: 0.2402, bonds: -0.0016 }, 
    { year: 1952, stocks: 0.1837, bonds: 0.0210 }, { year: 1953, stocks: -0.0099, bonds: 0.0231 }, { year: 1954, stocks: 0.5262, bonds: 0.0505 }, 
    { year: 1955, stocks: 0.3156, bonds: -0.0054 }, { year: 1956, stocks: 0.0656, bonds: -0.0245 }, { year: 1957, stocks: -0.1078, bonds: 0.0531 }, 
    { year: 1958, stocks: 0.4337, bonds: -0.0093 }, { year: 1959, stocks: 0.1196, bonds: -0.0236 }, { year: 1960, stocks: 0.0047, bonds: 0.1164 }, 
    { year: 1961, stocks: 0.2689, bonds: 0.0286 }, { year: 1962, stocks: -0.0873, bonds: 0.0543 }, { year: 1963, stocks: 0.2280, bonds: 0.0218 }, 
    { year: 1964, stocks: 0.1648, bonds: 0.0343 }, { year: 1965, stocks: 0.1245, bonds: 0.0121 }, { year: 1966, stocks: -0.1006, bonds: 0.0366 }, 
    { year: 1967, stocks: 0.2398, bonds: -0.0298 }, { year: 1968, stocks: 0.1106, bonds: 0.0335 }, { year: 1969, stocks: -0.0850, bonds: -0.0506 }, 
    { year: 1970, stocks: 0.0401, bonds: 0.1213 }, { year: 1971, stocks: 0.1431, bonds: 0.0931 }, { year: 1972, stocks: 0.1898, bonds: 0.0583 }, 
    { year: 1973, stocks: -0.1466, bonds: 0.0338 }, { year: 1974, stocks: -0.2647, bonds: 0.0441 }, { year: 1975, stocks: 0.3720, bonds: 0.0919 }, 
    { year: 1976, stocks: 0.2384, bonds: 0.1681 }, { year: 1977, stocks: -0.0718, bonds: 0.0299 }, { year: 1978, stocks: 0.0656, bonds: -0.0119 }, 
    { year: 1979, stocks: 0.1844, bonds: -0.0110 }, { year: 1980, stocks: 0.3250, bonds: 0.0271 }, { year: 1981, stocks: -0.0491, bonds: 0.0655 }, 
    { year: 1982, stocks: 0.2155, bonds: 0.4035 }, { year: 1983, stocks: 0.2256, bonds: 0.0366 }, { year: 1984, stocks: 0.0627, bonds: 0.1584 }, 
    { year: 1985, stocks: 0.3173, bonds: 0.2210 }, { year: 1986, stocks: 0.1867, bonds: 0.1560 }, { year: 1987, stocks: 0.0525, bonds: -0.0270 }, 
    { year: 1988, stocks: 0.1661, bonds: 0.0789 }, { year: 1989, stocks: 0.3169, bonds: 0.1812 }, { year: 1990, stocks: -0.0310, bonds: 0.0617 }, 
    { year: 1991, stocks: 0.3047, bonds: 0.1593 }, { year: 1992, stocks: 0.0762, bonds: 0.0792 }, { year: 1993, stocks: 0.1008, bonds: 0.1366 }, 
    { year: 1994, stocks: 0.0132, bonds: -0.0782 }, { year: 1995, stocks: 0.3758, bonds: 0.2348 }, { year: 1996, stocks: 0.2296, bonds: 0.0163 }, 
    { year: 1997, stocks: 0.3336, bonds: 0.0991 }, { year: 1998, stocks: 0.2858, bonds: 0.1321 }, { year: 1999, stocks: 0.2104, bonds: -0.0825 }, 
    { year: 2000, stocks: -0.0910, bonds: 0.1666 }, { year: 2001, stocks: -0.1189, bonds: 0.0558 }, { year: 2002, stocks: -0.2210, bonds: 0.1026 }, 
    { year: 2003, stocks: 0.2868, bonds: 0.0410 }, { year: 2004, stocks: 0.1088, bonds: 0.0427 }, { year: 2005, stocks: 0.0491, bonds: 0.0296 }, 
    { year: 2006, stocks: 0.1579, bonds: 0.0223 }, { year: 2007, stocks: 0.0549, bonds: 0.0699 }, { year: 2008, stocks: -0.3700, bonds: 0.2010 }, 
    { year: 2009, stocks: 0.2646, bonds: -0.1112 }, { year: 2010, stocks: 0.1506, bonds: 0.0846 }, { year: 2011, stocks: 0.0211, bonds: 0.1604 }, 
    { year: 2012, stocks: 0.1600, bonds: 0.0297 }, { year: 2013, stocks: 0.3239, bonds: -0.0910 }, { year: 2014, stocks: 0.1369, bonds: 0.1075 }, 
    { year: 2015, stocks: 0.0138, bonds: 0.0131 }, { year: 2016, stocks: 0.1196, bonds: 0.0061 }, { year: 2017, stocks: 0.2183, bonds: 0.0280 }, 
    { year: 2018, stocks: -0.0438, bonds: 0.0001 }, { year: 2019, stocks: 0.3149, bonds: 0.1465 }, { year: 2020, stocks: 0.1840, bonds: 0.1175 }, 
    { year: 2021, stocks: 0.2871, bonds: -0.0450 }, { year: 2022, stocks: -0.1811, bonds: -0.312 }, { year: 2023, stocks: 0.2629, bonds: 0.0405 }
];

let spareRandom = null;
function generateNormalRandom() {
    let val1, val2, s;
    if (spareRandom !== null) {
        val1 = spareRandom;
        spareRandom = null;
        return val1;
    }
    do {
        val1 = Math.random() * 2 - 1;
        val2 = Math.random() * 2 - 1;
        s = val1 * val1 + val2 * val2;
    } while (s >= 1 || s === 0);
    s = Math.sqrt(-2 * Math.log(s) / s);
    spareRandom = val2 * s;
    return val1 * s;
}

function getSimulationInputs(projection, mainInputs) {
    if (!projection || typeof projection.savingsAtFIRE === 'undefined' || typeof projection.ageAtFIRE === 'undefined') {
        return null;
    }
    return {
        simType: document.querySelector('input[name="simType"]:checked').value,
        simPortfolioValue: Math.round(projection.savingsAtFIRE),
        simRetirementAge: Math.round(projection.ageAtFIRE),
        simYearlyExpenses: mainInputs.yearlyExpensesInRetirement,
        simReturn: parseFloat(simReturnEl.value),
        simVolatility: parseFloat(simVolatilityEl.value),
        simCount: parseInt(simCountEl.value),
        stockAllocation: parseFloat(stockAllocationEl.value) / 100,
        flexThreshold: parseFloat(flexThresholdEl.value) / 100,
        flexReduction: parseFloat(flexReductionEl.value) / 100,
        currency: mainInputs.currency
    };
}

function runRetirementSimulation(simInputs, isAutoRun = false) {
    if (!simInputs) { 
            simInputs = {
            simType: document.querySelector('input[name="simType"]:checked').value,
            simPortfolioValue: parseFloat(simPortfolioValueEl.value),
            simRetirementAge: parseFloat(simRetirementAgeEl.value),
            simYearlyExpenses: parseFloat(simYearlyExpensesEl.value),
            simReturn: parseFloat(simReturnEl.value),
            simVolatility: parseFloat(simVolatilityEl.value),
            simCount: parseInt(simCountEl.value),
            stockAllocation: parseFloat(stockAllocationEl.value) / 100,
            flexThreshold: parseFloat(flexThresholdEl.value) / 100,
            flexReduction: parseFloat(flexReductionEl.value) / 100,
            currency: currencyEl.value
        };
    }
    
    if (!validateInputs(simInputs, true)) return;
    
    simulationWarningEl.textContent = `Running simulation...`;
    simulationWarningEl.classList.remove('hidden');

    setTimeout(() => {
        const { simPortfolioValue, simRetirementAge, simYearlyExpenses, flexThreshold, flexReduction } = simInputs;
        const inflation = parseFloat(expectedInflationRateEl.value) / 100;
        const annualPostFireIncome = parseFloat(monthlyIncomeAfterFIREEl.value) * 12;
        const netYearlyWithdrawal = Math.max(0, simYearlyExpenses - annualPostFireIncome);
        const reducedYearlyWithdrawal = netYearlyWithdrawal * (1 - flexReduction);

        let allSimPaths = [];
        let allFinalValues = [];
        let allFlexYears = [];

        if (simInputs.simType === 'monteCarlo') {
            const { simReturn, simVolatility, simCount } = simInputs;
            const avgAnnualReturn = simReturn / 100;
            const volatility = simVolatility / 100;

            for (let i = 0; i < simCount; i++) {
                const { path, finalValue, flexYears } = runSingleSimulation(
                    () => generateNormalRandom() * volatility + avgAnnualReturn,
                    simPortfolioValue, simRetirementAge, netYearlyWithdrawal, reducedYearlyWithdrawal, flexThreshold, inflation
                );
                allSimPaths.push(path);
                allFinalValues.push(finalValue);
                allFlexYears.push(flexYears);
            }
        } else { // Historical
            const { stockAllocation } = simInputs;
            const bondAllocation = 1 - stockAllocation;
            const simDuration = 95 - simRetirementAge;
            if (simDuration < 1) {
                    simulationErrorMessageEl.textContent = "Retirement age is too high for historical simulation (must be less than 95).";
                    simulationErrorMessageEl.classList.remove('hidden');
                    simulationWarningEl.classList.add('hidden');
                    return;
            }
            for (let i = 0; i <= historicalData.length - simDuration; i++) {
                const historicalWindow = historicalData.slice(i, i + simDuration);
                const { path, finalValue, flexYears } = runSingleSimulation(
                    (yearIndex) => {
                        return historicalWindow[yearIndex].stocks * stockAllocation + historicalWindow[yearIndex].bonds * bondAllocation;
                    },
                    simPortfolioValue, simRetirementAge, netYearlyWithdrawal, reducedYearlyWithdrawal, flexThreshold, inflation
                );
                allSimPaths.push(path);
                allFinalValues.push(finalValue);
                allFlexYears.push(flexYears);
            }
        }

        if (allSimPaths.length === 0) {
                simulationErrorMessageEl.textContent = "No valid simulation cycles could be run with the provided inputs.";
                simulationErrorMessageEl.classList.remove('hidden');
                simulationWarningEl.classList.add('hidden');
                return;
        }

        const results = processSimResults(allFinalValues, allFlexYears);
        lastSimulationResult = { ...results, ...simInputs, allPaths: allSimPaths };
        displaySimResults(lastSimulationResult);
        drawSimulationPlot(lastSimulationResult.allPaths, 95 - simInputs.simRetirementAge, simInputs.simRetirementAge);

    }, 50);
}

function runSingleSimulation(getReturnForYear, portfolioValue, retirementAge, baseWithdrawal, reducedWithdrawal, flexThreshold, inflation) {
    let currentPortfolio = portfolioValue;
    const initialPortfolioValue = portfolioValue;
    const flexTriggerValue = initialPortfolioValue * (1 - flexThreshold);
    const path = [{ age: retirementAge, value: currentPortfolio }];
    const MAX_SIM_AGE = 95;
    const simYears = MAX_SIM_AGE - retirementAge;
    let flexYears = 0;
    let isFlexing = false;

    for (let year = 0; year < simYears; year++) {
        const currentReturn = getReturnForYear(year);
        const realReturn = (1 + currentReturn) / (1 + inflation) - 1;
        
        currentPortfolio *= (1 + realReturn);
        
        if (flexThreshold > 0) {
            if (currentPortfolio < flexTriggerValue) {
                isFlexing = true;
            } else if (currentPortfolio >= initialPortfolioValue) {
                isFlexing = false;
            }
        }
        
        let withdrawal = baseWithdrawal;
        if (isFlexing) {
            withdrawal = reducedWithdrawal;
            flexYears++;
        }

        currentPortfolio -= withdrawal;
        if (currentPortfolio < 0) currentPortfolio = 0;
        
        path.push({ age: retirementAge + year + 1, value: currentPortfolio });
    }
    return { path, finalValue: currentPortfolio, flexYears };
}

function processSimResults(finalValues, flexYearsData) {
    const successfulSims = finalValues.filter(val => val > 0).length;
    const successRate = (successfulSims / finalValues.length) * 100;

    finalValues.sort((a, b) => a - b);
    const medianValue = finalValues[Math.floor(finalValues.length / 2)];
    const p10Value = finalValues[Math.floor(finalValues.length * 0.10)];
    const p90Value = finalValues[Math.floor(finalValues.length * 0.90)];
    
    flexYearsData.sort((a,b) => a - b);
    const medianFlexYears = flexYearsData.length > 0 ? flexYearsData[Math.floor(flexYearsData.length/2)] : 0;

    return { successRate, medianValue, p10Value, p90Value, medianFlexYears };
}

function displaySimResults(results) {
    const { successRate, medianValue, p10Value, p90Value, medianFlexYears, currency } = results;
    simSuccessRateEl.textContent = `${successRate.toFixed(1)}%`;
    simMedianEl.textContent = formatCurrency(medianValue, currency);
    sim10thPercentileEl.textContent = formatCurrency(p10Value, currency);
    sim90thPercentileEl.textContent = formatCurrency(p90Value, currency);
    simFlexYearsEl.textContent = `${medianFlexYears} yrs`;
    
    simulationResultsContainerEl.classList.remove('hidden');
    simulationWarningEl.classList.add('hidden');
}

function drawSimulationPlot(allPaths, simYears, startAge) {
    simulationPlotContainerEl.innerHTML = '';
    if (!allPaths || allPaths.length === 0) return;
    
    const containerRect = simulationPlotContainerEl.getBoundingClientRect();
    const containerWidth = containerRect.width > 0 ? containerRect.width : 600;

    const margin = {top: 50, right: 130, bottom: 50, left: 80},
            width = containerWidth - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
    
    if (width <= 0) return;

    const svg = d3.select("#simulationPlotContainer").append("svg")
        .attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    
    const tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");

    const p10Path = [], p50Path = [], p90Path = [];
    for (let i = 0; i <= simYears; i++) {
        if (allPaths.every(path => path && path[i])) {
            const valuesForYear = allPaths.map(path => path[i].value).sort((a, b) => a - b);
            p10Path.push({ age: startAge + i, value: valuesForYear[Math.floor(valuesForYear.length * 0.10)] });
            p50Path.push({ age: startAge + i, value: valuesForYear[Math.floor(valuesForYear.length * 0.50)] });
            p90Path.push({ age: startAge + i, value: valuesForYear[Math.floor(valuesForYear.length * 0.90)] });
        }
    }
    const percentilePaths = [
        { path: p10Path, color: "#ef4444", label: "10th Percentile" },
        { path: p50Path, color: "#3b82f6", label: "Median (50th)" },
        { path: p90Path, color: "#22c55e", label: "90th Percentile" },
    ];

    const maxPortfolioValue = d3.max(p90Path, d => d.value) || simPortfolioValueEl.value;

    const xScale = d3.scaleLinear().domain([startAge, startAge + simYears]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, maxPortfolioValue]).range([height, 0]).nice();
    
    svg.append("g").attr("class", "grid").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale).ticks(10).tickSize(-height).tickFormat(""));
    svg.append("g").attr("class", "grid").call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(""));
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis").call(d3.axisLeft(yScale).ticks(5).tickFormat(d => {
            if (isNaN(d)) return ""; if (d === 0) return "0";
        if (Math.abs(d) >= 1000000) return (d / 1000000).toFixed(1).replace(/\.0$/, '') + "M";
        if (Math.abs(d) >= 1000) return (d / 1000).toFixed(0) + "k";
        return d.toString();
    }));
    
    svg.append("text").attr("text-anchor", "middle").attr("x", width / 2).attr("y", height + margin.bottom - 10).text("Age").attr("class", "axis-label");
    svg.append("text").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("y", 0 - margin.left + 20).attr("x", 0 - (height / 2)).text("Portfolio Value (Real Dollars)").attr("class", "axis-label");
    svg.append("text").attr("x", width / 2).attr("y", 0 - (margin.top / 2)).attr("class", "plot-title").text(`Distribution of ${allPaths.length.toLocaleString()} Retirement Outcomes`);

    const line = d3.line().x(d => xScale(d.age)).y(d => yScale(d.value));

    allPaths.forEach(path => {
        svg.append("path").datum(path).attr("class", "sim-path").style("stroke", "#a5b4fc").attr("d", line); // indigo-300
    });
    
    percentilePaths.forEach((p, i) => {
        if (p.path.length > 0) {
            svg.append("path").datum(p.path).attr("class", "percentile-line").style("stroke", p.color).attr("d", line);
            const legend = svg.append("g").attr("class", "legend-item").attr("transform", `translate(${width + 10}, ${i * 20})`); 
            legend.append("rect").attr("width", 10).attr("height", 10).style("fill", p.color);
            legend.append("text").attr("x", 15).attr("y", 9).text(p.label).style("font-size", "0.75rem");
        }
    });

    const bisectAge = d3.bisector(d => d.age).left;
    svg.append("rect").attr("width", width).attr("height", height).style("fill", "none").style("pointer-events", "all")
        .on("mouseover", () => tooltip.style("opacity", 1)).on("mouseout", () => tooltip.style("opacity", 0))
        .on("mousemove", (event) => {
            const [mx] = d3.pointer(event);
            const hoveredAge = xScale.invert(mx);
            let tooltipHtml = `<strong>Age: ${hoveredAge.toFixed(1)}</strong><hr class="my-1 border-gray-400">`;
            percentilePaths.forEach((p) => {
                if (p.path.length > 0) {
                    const index = bisectAge(p.path, hoveredAge, 1);
                    const d0 = p.path[index - 1];
                    const d1 = p.path[index];
                    const d = (d1 && (hoveredAge - d0.age > d1.age - hoveredAge)) ? d1 : d0;
                    if (d) {
                        tooltipHtml += `<div style="color: ${p.color};">${p.label}: ${formatCurrency(d.value, currencyEl.value)}</div>`;
                    }
                }
            });
            tooltip.html(tooltipHtml).style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px");
        });
}

// --- Other Functions (Reset, Export) ---
function resetForm() {
    currentAgeEl.value = "30"; currentSavingsEl.value = "50000"; grossAnnualIncomeEl.value = "70000";
    yearlySavingsContributionEl.value = "15000"; yearlyExpensesInRetirementEl.value = "40000";
    monthlyIncomeAfterFIREEl.value = "0"; withdrawalRateEl.value = "4"; preFireReturnEl.value = "7";
    postFireReturnEl.value = "7"; expectedInflationRateEl.value = "3";
    numMonthlyRowsEl.value = "12";
    
    const maxYearsMessageEl = document.getElementById('maxYearsMessage');
    [resultsSection, oneMoreYearSectionEl, retirementSimulationSectionEl, earlyRetirementIncomeSectionEl, errorMessageEl, maxYearsMessageEl].forEach(el => {if(el){el.classList.add('hidden')}});
    
    // Reset simulation inputs
    simPortfolioValueEl.value = ""; 
    simRetirementAgeEl.value = "";
    simYearlyExpensesEl.value = "";
    simReturnEl.value = "7";
    simVolatilityEl.value = "15";
    simCountEl.value = "1000";
    flexThresholdEl.value = "20";
    flexReductionEl.value = "10";
    stockAllocationEl.value = "60";
    stockAllocationValueEl.textContent = "60";
    bondAllocationValueEl.textContent = "40";
    document.getElementById('simTypeHistorical').checked = true;
    document.getElementById('simTypeMonteCarlo').checked = false;
    monteCarloParamsEl.classList.add('hidden');
    historicalParamsEl.classList.remove('hidden');

        // Reset Early Retirement section inputs
    if(compSavings1El) compSavings1El.value = '';
    if(compStartSavings1El) compStartSavings1El.value = '';
    if(compSavings2El) compSavings2El.value = '';
    if(compStartSavings2El) compStartSavings2El.value = '';
    if(runEarlyRetirementPlotButtonEl) runEarlyRetirementPlotButtonEl.checked = true;
    if(compStartDateMonthEl) compStartDateMonthEl.value = '0'; 
    if(compStartDateYearEl) compStartDateYearEl.value = new Date().getFullYear();

    printSummaryButtonEl.classList.add('hidden');
    exportDataButtonEl.classList.add('hidden');
    
    lastProjectionResult = null;
    lastSimulationResult = null;
    oneMoreYearScenarioDataForExport = null;
    
}

function openExportModal() {
    try {
        let exportText = "FIRE Calculator Summary\n";
        exportText += "=======================\n\n";
        const currency = currencyEl.value;
        
        exportText += "--- Main Inputs ---\n";
        const mainInputs = getCurrentInputs();
        for (const [key, value] of Object.entries(mainInputs)) {
            exportText += `${key}: ${value}\n`;
        }
        exportText += "\n";

        exportText += "--- Main Projection Results ---\n";
        if(lastProjectionResult) {
            for (const [key, value] of Object.entries(lastProjectionResult)) {
                if (key !== 'annualProjectionData' && key !== 'monthlyProjectionData' && key !== 'earlyRetirementPlotData') {
                        exportText += `${key}: ${typeof value === 'number' ? value.toFixed(2) : value}\n`;
                }
            }
        }
        exportText += "\n";
        
        if (oneMoreYearScenarioDataForExport) {
            const data = oneMoreYearScenarioDataForExport;
            exportText += `--- "One More Year" Scenario ---\n`;
            exportText += `Extra Working Years: ${data.extraYears}\n`;
            exportText += `New Portfolio Value: ${formatCurrency(data.newPortfolioValue, currency)}\n`;
            exportText += `New Retirement Age: ${data.newRetirementAge.toFixed(1)}\n\n`;
        }

        if (lastSimulationResult) {
            const data = lastSimulationResult;
            exportText += `--- Advanced Retirement Simulation (${data.simType === 'monteCarlo' ? 'Monte Carlo' : 'Historical Cycles'}) ---\n`;
            exportText += `Portfolio Simulated: ${formatCurrency(data.simPortfolioValue, currency)} at age ${data.simRetirementAge}\n`;
            if (data.simType === 'monteCarlo') {
                exportText += `Avg. Return: ${data.simReturn}%, Volatility (Std. Dev): ${data.simVolatility}%, Simulations: ${data.simCount}\n`;
            } else {
                exportText += `Stock/Bond Allocation: ${data.stockAllocation * 100}% / ${(1-data.stockAllocation)*100}%\n`;
            }
            exportText += `Spending Flexibility: Reduce by ${data.flexReduction * 100}% if portfolio drops ${data.flexThreshold * 100}% below initial value.\n`;
            exportText += `Success Rate: ${data.successRate.toFixed(1)}%\n`;
            exportText += `Median Final Value (Age 95): ${formatCurrency(data.medianValue, currency)}\n`;
            exportText += `10th Percentile Final Value (Age 95): ${formatCurrency(data.p10Value, currency)}\n`;
            exportText += `90th Percentile Final Value (Age 95): ${formatCurrency(data.p90Value, currency)}\n`;
            exportText += `Median Years with Reduced Spending: ${data.medianFlexYears} yrs\n\n`;
        }

        exportDataTextAreaEl.value = exportText;
        exportModalEl.classList.remove('hidden');
    } catch (error) {
        console.error("Error generating export data:", error);
        alert("An error occurred while preparing the data for export.");
    }
}
function copyExportDataToClipboard() {
    exportDataTextAreaEl.select(); 
    exportDataTextAreaEl.setSelectionRange(0, 99999); 
    try { 
        document.execCommand('copy'); 
        copyExportDataButtonEl.textContent = 'Copied!'; 
        setTimeout(() => { copyExportDataButtonEl.textContent = 'Copy to Clipboard'; }, 2000);
    } catch (err) { 
        console.error('Failed to copy text: ', err); 
        alert('Failed to copy. Please select and copy manually.'); 
    }
}

// --- Initial Setup ---
currentYearEl.textContent = new Date().getFullYear();
setupEventListeners();
resetForm();

// --- Events Timeline State ---
const eventsListEl = document.getElementById('eventsList');
const addEventForm = document.getElementById('addEventForm');
const eventTypeEl = document.getElementById('eventType');
const eventDescriptionEl = document.getElementById('eventDescription');
const eventAmountEl = document.getElementById('eventAmount');
const eventStartAgeEl = document.getElementById('eventStartAge');
const eventEndAgeEl = document.getElementById('eventEndAge');

function renderEventsList() {
    if (!eventsListEl) return;
    if (events.length === 0) {
        eventsListEl.innerHTML = '<p class="text-gray-500">No events added yet.</p>';
        return;
    }
    eventsListEl.innerHTML = events.map((ev, idx) => `
        <div class="flex items-center gap-2 mb-1 p-2 bg-gray-50 rounded">
            <span class="flex-shrink-0 px-2 py-1 rounded text-xs ${ev.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${ev.type.toUpperCase()}</span>
            <span class="font-medium flex-grow">${ev.description}</span>
            <span class="flex-shrink-0">${formatCurrency(ev.amount, currencyEl.value)}/yr</span>                   <span class="flex-shrink-0 text-gray-600">Age ${ev.startAge}${ev.endAge && ev.endAge !== ev.startAge ? '–' + ev.endAge : ''}</span>
            <button class="ml-2 text-sm text-gray-400 hover:text-red-500" onclick="removeEvent(${idx})">✕</button>
        </div>
    `).join('');
}
window.removeEvent = function(idx) {
    events.splice(idx, 1);
    renderEventsList();
};
if (addEventForm) {
    addEventForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const type = eventTypeEl.value;
        const description = eventDescriptionEl.value.trim();
        const amount = parseFloat(eventAmountEl.value);
        const startAge = parseFloat(eventStartAgeEl.value);
        const endAge = eventEndAgeEl.value ? parseFloat(eventEndAgeEl.value) : startAge;
        if (!description || isNaN(amount) || isNaN(startAge)) return;
        events.push({ type, description, amount, startAge, endAge });
        eventDescriptionEl.value = '';
        eventAmountEl.value = '';
        eventStartAgeEl.value = '';
        eventEndAgeEl.value = '';
        renderEventsList();
    });
}
renderEventsList();

// --- Mode Toggle Handler ---
if (fireModeEl) {
    fireModeEl.addEventListener('change', function() {
        updateModeUI();
        // Recalculate automatically when mode changes
        calculateAndDisplayProjection();
    });
}

// --- Coast/Barista FIRE UI and logic ---
const coastBaristaOptionsId = 'coastBaristaOptions';
let coastBaristaOptionsEl = document.getElementById(coastBaristaOptionsId);
if (!coastBaristaOptionsEl) {
    coastBaristaOptionsEl = document.createElement('div');
    coastBaristaOptionsEl.id = coastBaristaOptionsId;
    coastBaristaOptionsEl.className = 'mb-4 non-printable';
    const parent = document.getElementById('eventsTimelineSection');
    if (parent) parent.insertAdjacentElement('afterend', coastBaristaOptionsEl);
}
function updateModeUI() {
    const mode = fireModeEl.value;
    let html = '';
    if (mode === 'coast') {
        html = `<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 class="font-semibold text-blue-800">Coast FIRE Options</h4>
            <p class="text-sm text-gray-600 mt-2 mb-3">
                <b>Coast FIRE Explained:</b> This is the point where you have enough in your retirement accounts that, without contributing another penny, it will grow to support your full retirement by a traditional retirement age (e.g., 65). Once you hit your Coast FIRE number, you only need to earn enough to cover your current living expenses, freeing you from the need for high-stress, high-paying jobs.
            </p>
            <div class="flex gap-4 items-end mt-2">
                <div>
                    <label for="coastTargetAge" class="block font-medium text-gray-700">Target Retirement Age</label>
                    <input type="number" id="coastTargetAge" value="65" min="40" max="80" step="1" class="border rounded px-2 py-1 mt-1" style="width:80px;">
                </div>
            </div>
        </div>`;
    }
    coastBaristaOptionsEl.innerHTML = html;
}
updateModeUI();

// --- Share Your Plan Feature ---
let sharePlanButtonEl = document.getElementById('sharePlanButton');
if (!sharePlanButtonEl) {
    sharePlanButtonEl = document.createElement('button');
    sharePlanButtonEl.id = 'sharePlanButton';
    sharePlanButtonEl.className = 'ml-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md';
    sharePlanButtonEl.textContent = 'Share Plan';
    printSummaryButtonEl.insertAdjacentElement('afterend', sharePlanButtonEl);
}
sharePlanButtonEl.addEventListener('click', function() {
    const mainInputs = getCurrentInputs();
    const mode = fireModeEl.value;
    let params = new URLSearchParams();
    Object.entries(mainInputs).forEach(([k, v]) => params.set(k, v));
    params.set('mode', mode);
    if (mode === 'coast') {
        const coastTargetAgeEl = document.getElementById('coastTargetAge');
        if (coastTargetAgeEl && coastTargetAgeEl.value) params.set('coastTargetAge', coastTargetAgeEl.value);
    }
    // Serialize events
    if (Array.isArray(events) && events.length > 0) {
        params.set('events', encodeURIComponent(JSON.stringify(events)));
    }

    // Serialize What-If Levers
    params.set('whatIfSavings', whatIfSavings.value);
    params.set('whatIfRetireExpenses', whatIfRetireExpenses.value);
    params.set('whatIfMonthlyIncome', whatIfMonthlyIncome.value);

    const url = window.location.origin + window.location.pathname + '?' + params.toString();
    
    let modal = document.getElementById('sharePlanModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sharePlanModal';
        modal.className = 'modal';
        modal.innerHTML = `<div class="modal-content"><span id="closeSharePlanModal" class="close-button">&times;</span><h3 class="text-xl font-semibold text-gray-800 mb-4">Share Your Plan</h3><p class="text-sm text-gray-600 mb-2">Copy this link to share your plan with others.</p><input id="sharePlanUrlInput" class="w-full border rounded p-2 mb-2 bg-gray-100" readonly><button id="copySharePlanUrlButton" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md">Copy Link</button></div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('sharePlanUrlInput').value = url;
    modal.style.display = 'flex';
    document.getElementById('closeSharePlanModal').onclick = () => modal.style.display = 'none';
    document.getElementById('copySharePlanUrlButton').onclick = () => {
        const input = document.getElementById('sharePlanUrlInput');
        input.select();
        input.setSelectionRange(0, 99999);
        document.execCommand('copy');
        document.getElementById('copySharePlanUrlButton').textContent = 'Copied!';
        setTimeout(() => { document.getElementById('copySharePlanUrlButton').textContent = 'Copy Link'; }, 2000);
    };
});

// --- On page load, parse URL params and pre-fill ---
function tryLoadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if(params.toString().length === 0) return;
    
    let changed = false;
    const mainFields = ['currentAge','currentSavings','grossAnnualIncome','yearlySavingsContribution','yearlyExpensesInRetirement','withdrawalRate','preFireReturn','postFireReturn','expectedInflationRate','monthlyIncomeAfterFIRE','numMonthlyRows','currency'];
    mainFields.forEach(f => {
        if (params.has(f)) {
            const el = document.getElementById(f);
            if (el) { el.value = params.get(f); changed = true; }
        }
    });
    if (params.has('mode')) {
        fireModeEl.value = params.get('mode');
        updateModeUI();
        changed = true;
    }
    if (params.has('coastTargetAge')) {
        const el = document.getElementById('coastTargetAge');
        if (el) { el.value = params.get('coastTargetAge'); changed = true; }
    }
    if (params.has('events')) {
        try {
            const evArr = JSON.parse(decodeURIComponent(params.get('events')));
            if (Array.isArray(evArr)) {
                events = evArr;
                renderEventsList();
                changed = true;
            }
        } catch(e) {
            console.error("Error parsing events from URL", e);
        }
    }
    // Load What-If Levers from URL
    if (params.has('whatIfSavings')) {
        const el = document.getElementById('whatIfSavings');
        if (el) { 
            const urlValue = parseFloat(params.get('whatIfSavings'));
            el.max = Math.max(el.max || 0, urlValue * 1.2);
            el.value = urlValue;
            changed = true; 
        }
    }
    if (params.has('whatIfRetireExpenses')) {
        const el = document.getElementById('whatIfRetireExpenses');
        if (el) { 
            const urlValue = parseFloat(params.get('whatIfRetireExpenses'));
            el.max = Math.max(el.max || 0, urlValue * 1.2);
            el.value = urlValue; 
            changed = true; 
        }
    }
    if (params.has('whatIfMonthlyIncome')) {
        const el = document.getElementById('whatIfMonthlyIncome');
        if (el) { 
            const urlValue = parseFloat(params.get('whatIfMonthlyIncome'));
            el.max = Math.max(el.max || 0, urlValue * 1.2);
            el.value = urlValue;
            changed = true; 
        }
    }

    if (changed) {
        // Use a short timeout to ensure UI updates before calculating
        setTimeout(() => {
            updateWhatIfLeversDefaults();
            updateWhatIfResult();
            calculateAndDisplayProjection();
        }, 250);
    }
}
tryLoadFromUrl();

// --- What-If Levers State & Logic ---
const whatIfLeversSection = document.getElementById('whatIfLeversSection');
const whatIfSavings = document.getElementById('whatIfSavings');
const whatIfSavingsValue = document.getElementById('whatIfSavingsValue');
const whatIfRetireExpenses = document.getElementById('whatIfRetireExpenses');
const whatIfRetireExpensesValue = document.getElementById('whatIfRetireExpensesValue');
const whatIfMonthlyIncome = document.getElementById('whatIfMonthlyIncome');
const whatIfMonthlyIncomeValue = document.getElementById('whatIfMonthlyIncomeValue');
const whatIfResultLabel = document.getElementById('whatIfResultLabel');
const whatIfResultValue = document.getElementById('whatIfResultValue');

function updateWhatIfLeversDefaults() {
    const mainInputs = getCurrentInputs();
    whatIfSavings.min = 0;
    whatIfSavings.max = Math.max(1000, mainInputs.yearlySavingsContribution * 2, parseFloat(whatIfSavings.value) * 1.2 || 0);
    whatIfSavingsValue.textContent = mainInputs.yearlySavingsContribution
    whatIfSavings.value = mainInputs.yearlySavingsContribution;
    //parseInt(whatIfSavings.value).toLocaleString();
    
    whatIfRetireExpenses.min = Math.max(1000, mainInputs.yearlyExpensesInRetirement / 2);
    whatIfRetireExpenses.max = Math.max(10000, mainInputs.yearlyExpensesInRetirement * 2, parseFloat(whatIfRetireExpenses.value) * 1.2 || 0);
    whatIfRetireExpensesValue.textContent = mainInputs.yearlyExpensesInRetirement 
    whatIfRetireExpenses.value = mainInputs.yearlyExpensesInRetirement;
    //parseInt(whatIfRetireExpenses.value).toLocaleString();
    
    whatIfMonthlyIncome.min = 0;
    whatIfMonthlyIncome.max = Math.max(2000, mainInputs.monthlyIncomeAfterFIRE * 2, parseFloat(whatIfMonthlyIncome.value) * 1.2 || 0);
    whatIfMonthlyIncomeValue.textContent = mainInputs.monthlyIncomeAfterFIRE
    whatIfMonthlyIncomeValue.value = mainInputs.monthlyIncomeAfterFIRE
    //parseInt(whatIfMonthlyIncome.value).toLocaleString();
    //whatIfMonthlyIncomeValue.textContent = parseInt(whatIfMonthlyIncome.value).toLocaleString();
}

function getWhatIfInputs() {
    const mainInputs = getCurrentInputs();
    return {
        ...mainInputs,
        yearlySavingsContribution: parseFloat(whatIfSavings.value),
        yearlyExpensesInRetirement: parseFloat(whatIfRetireExpenses.value),
        monthlyIncomeAfterFIRE: parseFloat(whatIfMonthlyIncome.value)
    };
}
function updateWhatIfResult() {
    const whatIfInputs = getWhatIfInputs();
        // FIX: Pass the 'events' array to the calculation function
    let result = calculateProjection(whatIfInputs, events); 
    
    if (result.error || !result) {
            whatIfResultValue.textContent = '--';
            return;
    }

    if (result.mode === 'coast' && result.coastFIREAge) {
        whatIfResultLabel.textContent = 'Projected Coast Age';
        whatIfResultValue.textContent = result.coastFIREAge.toFixed(1);
    } else if (result.fireReached) {
        whatIfResultLabel.textContent = 'Projected Time to FIRE';
        const years = Math.floor(result.timeToFIREMonths / 12);
        const months = result.timeToFIREMonths % 12;
        whatIfResultValue.textContent = `${years} yrs, ${months} mos`;
    } else {
        whatIfResultLabel.textContent = 'Projected Time to FIRE';
        whatIfResultValue.textContent = '> 70 Yrs';
    }
}
[whatIfSavings, whatIfRetireExpenses, whatIfMonthlyIncome].forEach(slider => {
    slider.addEventListener('input', function() {
        if (slider === whatIfSavings) whatIfSavingsValue.textContent = parseInt(slider.value).toLocaleString();
        if (slider === whatIfRetireExpenses) whatIfRetireExpensesValue.textContent = parseInt(slider.value).toLocaleString();
        if (slider === whatIfMonthlyIncome) whatIfMonthlyIncomeValue.textContent = parseInt(slider.value).toLocaleString();
        updateWhatIfResult();
    });
});

// Update levers when main calculation runs
calculateButton.addEventListener('click', () => {
        setTimeout(() => {
        updateWhatIfLeversDefaults();
        updateWhatIfResult();
    }, 150); // Small delay to ensure main projection is calculated first
});

