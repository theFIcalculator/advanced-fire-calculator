import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const historicalData = [ 
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

function runSingleSimulation(getReturnForYear, portfolioValue, retirementAge, baseWithdrawal, reducedWithdrawal, flexThreshold, inflation) {
    let currentPortfolio = portfolioValue;
    const initialPortfolioValue = portfolioValue;
    const flexTriggerValue = initialPortfolioValue * (1 - flexThreshold);
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
    }
    return { finalValue: currentPortfolio, flexYears };
}

function processSimResults(finalValues) {
    const successfulSims = finalValues.filter(val => val > 0).length;
    const successRate = (successfulSims / finalValues.length) * 100;
    finalValues.sort((a, b) => a - b);
    const medianValue = finalValues[Math.floor(finalValues.length / 2)];
    return { successRate, medianValue };
}

function calculateProjection(inputs, events = []) {
    const mode = inputs.mode || 'normal';
    const coastTargetAge = inputs.coastTargetAge || 65;
    
    const { 
        currentAge, currentSavings, yearlySavingsContribution, yearlyExpensesInRetirement, 
        withdrawalRate: withdrawalRatePercent, preFireReturn: preFireReturnPercent, 
        expectedInflationRate: expectedInflationRatePercent, monthlyIncomeAfterFIRE, 
        salaryIncreaseRate = 0 
    } = inputs;

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
    
    let coastFIREAge = null;
    let coastFIREAccum = null;
    
    // --- COAST FIRE MODE LOGIC ---
    if (mode === 'coast') {
        let testMonth = 0;
        let found = false;

        while (testMonth < MAX_PRE_FIRE_MONTHS && !found) {
            let saveMonths = testMonth;
            let saveAccum = currentSavings;
            let currentYearlySavingsForSim = yearlySavingsContribution;

            for (let m = 1; m <= saveMonths; m++) {
                if (m > 1 && (m - 1) % 12 === 0) currentYearlySavingsForSim *= (1 + salaryIncreaseRate);
                const monthlySavingsForSim = currentYearlySavingsForSim / 12;
                const age = currentAge + m / 12;
                let eventCashFlow = 0;
                if (Array.isArray(events)) {
                    events.forEach(ev => {
                        if (age >= ev.startAge && age < ev.endAge + 1/12) {
                            let monthlyAmount = (ev.type === 'income' ? ev.amount : -ev.amount);
                            if (ev.startAge !== ev.endAge) monthlyAmount /= 12;
                            eventCashFlow += monthlyAmount;
                        }
                    });
                }
                saveAccum = saveAccum * (1 + realMonthlyPreFireReturn) + monthlySavingsForSim + eventCashFlow;
            }

            let coastAccum = saveAccum;
            for (let m = 0; m < (coastTargetAge - (currentAge + saveMonths / 12)) * 12; m++) {
                const age = currentAge + saveMonths / 12 + m / 12;
                let eventCashFlow = 0;
                if (Array.isArray(events)) {
                    events.forEach(ev => {
                        if (age >= ev.startAge && age < ev.endAge + 1/12) {
                            let monthlyAmount = (ev.type === 'income' ? ev.amount : -ev.amount);
                            if (ev.startAge !== ev.endAge) monthlyAmount /= 12;
                            eventCashFlow += monthlyAmount;
                        }
                    });
                }
                coastAccum = coastAccum * (1 + realMonthlyPreFireReturn) + eventCashFlow;
            }
            
            if (coastAccum >= fireNumber) {
                coastFIREAge = currentAge + saveMonths / 12;
                coastFIREAccum = saveAccum;
                found = true;
                break;
            }
            testMonth++;
        }
    }
    
    // --- NORMAL MODE LOGIC (OR FALLBACK FROM COAST) ---
    let normalResult = null;
    if (mode === 'normal' || (mode === 'coast' && !coastFIREAge)) {
        let fireReached = (currentSavings >= fireNumber && fireNumber >= 0);
        if (fireNumber === 0 && currentSavings >= 0) fireReached = true;
        
        let totalMonthsToFIRE = 0;
        let currentYearlySavings = yearlySavingsContribution;

        if (!fireReached) {
            for (let month = 1; month <= MAX_PRE_FIRE_MONTHS; month++) {
                if (month > 1 && (month - 1) % 12 === 0) currentYearlySavings *= (1 + salaryIncreaseRate);

                const currentMonthAge = currentAge + month / 12;
                const currentMonthlySavingsContribution = currentYearlySavings / 12;
                const growthThisMonth = accumulatedSavings * realMonthlyPreFireReturn;
                
                let eventCashFlow = 0;
                if (Array.isArray(events)) {
                    events.forEach(ev => {
                        if (currentMonthAge >= ev.startAge && currentMonthAge < ev.endAge + 1 / 12) {
                            let annualAmount = (ev.type === 'income' ? ev.amount : -ev.amount);
                            if (ev.type === 'income' && !ev.isInflationAdjusted) {
                                const yearsElapsed = (month - 1) / 12;
                                const inflationRate = expectedInflationRatePercent / 100;
                                annualAmount = annualAmount / Math.pow(1 + inflationRate, yearsElapsed);
                            }
                            let monthlyAmount = annualAmount;
                            if (ev.startAge !== ev.endAge) monthlyAmount /= 12;
                            eventCashFlow += monthlyAmount;
                        }
                    });
                }
                accumulatedSavings += growthThisMonth + currentMonthlySavingsContribution + eventCashFlow;
                totalContributions += currentMonthlySavingsContribution;

                if (accumulatedSavings >= fireNumber) {
                    totalMonthsToFIRE = month;
                    fireReached = true;
                    break;
                }
            }
        }
        if (!fireReached) totalMonthsToFIRE = MAX_PRE_FIRE_MONTHS;
        
        normalResult = {
            fireNumber, timeToFIREMonths: totalMonthsToFIRE, ageAtFIRE: currentAge + totalMonthsToFIRE / 12,
            savingsAtFIRE: accumulatedSavings, totalContributionsToFIRE: totalContributions, fireReached
        };
    }
    
    if (mode === 'coast' && coastFIREAge) {
        return { fireNumber, ageAtFIRE: coastFIREAge, savingsAtFIRE: coastFIREAccum, coastTargetAge, mode: 'coast', fireReached: true };
    } else if (normalResult) {
        return normalResult;
    }
    return { error: 'Could not find a solution within 70 years.' };
}

// Ensure CORS headers for AI Agents
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export default async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== "POST") {
        return new Response("Forbidden", { status: 405, headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        
        // Use defaults for missing fields
        const inputs = {
            currentAge: payload.currentAge || 30,
            currentSavings: payload.currentSavings || 0,
            yearlySavingsContribution: payload.yearlySavingsContribution || 0,
            yearlyExpensesInRetirement: payload.yearlyExpensesInRetirement || 40000,
            withdrawalRate: payload.withdrawalRate || 4,
            preFireReturn: payload.preFireReturn || 7,
            postFireReturn: payload.postFireReturn || 4,
            expectedInflationRate: payload.expectedInflationRate || 3,
            monthlyIncomeAfterFIRE: payload.monthlyIncomeAfterFIRE || 0,
            salaryIncreaseRate: (payload.salaryIncreaseRate || 0) / 100,
            mode: payload.mode || 'normal',
            coastTargetAge: payload.coastTargetAge || 65,
            currency: payload.currency || 'USD'
        };

        const projection = calculateProjection(inputs, payload.events || []);

        if (projection.error) {
            return new Response(JSON.stringify({ status: "error", message: projection.error }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Run Monte Carlo natively
        const simPortfolioValue = Math.round(projection.savingsAtFIRE);
        const simRetirementAge = Math.round(projection.ageAtFIRE);
        const inflation = inputs.expectedInflationRate / 100;
        const netYearlyWithdrawal = Math.max(0, inputs.yearlyExpensesInRetirement - (inputs.monthlyIncomeAfterFIRE * 12));
        
        // Sim overrides if provided by AI
        const simType = payload.simType || 'monteCarlo';
        const simVolatility = (payload.simVolatility || 15) / 100;
        const simReturn = (payload.simReturn !== undefined ? payload.simReturn : 7) / 100;
        const simCount = payload.simCount || 1000;
        const flexThreshold = (payload.flexThreshold || 0) / 100;
        const flexReduction = (payload.flexReduction || 0) / 100;
        const stockAllocation = payload.stockAllocation !== undefined ? payload.stockAllocation / 100 : 0.6;
        const bondAllocation = 1 - stockAllocation;
        const reducedYearlyWithdrawal = netYearlyWithdrawal * (1 - flexReduction);

        let allFinalValues = [];

        if (simType === 'monteCarlo') {
            for (let i = 0; i < simCount; i++) {
                const { finalValue } = runSingleSimulation(
                    () => generateNormalRandom() * simVolatility + simReturn,
                    simPortfolioValue, simRetirementAge, netYearlyWithdrawal, reducedYearlyWithdrawal, flexThreshold, inflation
                );
                allFinalValues.push(finalValue);
            }
        } else {
            const simDuration = 95 - simRetirementAge;
            if (simDuration > 0) {
                for (let i = 0; i <= historicalData.length - simDuration; i++) {
                    const historicalWindow = historicalData.slice(i, i + simDuration);
                    const { finalValue } = runSingleSimulation(
                        (yearIndex) => {
                            return historicalWindow[yearIndex].stocks * stockAllocation + historicalWindow[yearIndex].bonds * bondAllocation;
                        },
                        simPortfolioValue, simRetirementAge, netYearlyWithdrawal, reducedYearlyWithdrawal, flexThreshold, inflation
                    );
                    allFinalValues.push(finalValue);
                }
            } else {
                allFinalValues = [simPortfolioValue];
            }
        }

        const simResults = processSimResults(allFinalValues);

        // Async log telemetry to Supabase
        const visitId = payload.visit_id || ('api-' + Math.random().toString(36).substr(2, 9));
        const countryCode = req.headers.get('x-country') || req.headers.get('x-nf-country') || 'api';
        
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
            try {
                await supabase.from('fire_sentiment').insert([{
                    event_type: "ai_api_request",
                    visit_id: visitId,
                    country_code: countryCode,
                    age: inputs.currentAge,
                    currency: inputs.currency,
                    withdrawal_rate: inputs.withdrawalRate,
                    inflation_belief: inputs.expectedInflationRate,
                    expenses: inputs.yearlyExpensesInRetirement,
                    savings: inputs.currentSavings,
                    pre_fire_return: inputs.preFireReturn,
                    post_fire_return: inputs.postFireReturn,
                    yearly_savings: inputs.yearlySavingsContribution,
                    fire_mode: inputs.mode,
                    fire_reached: projection.fireReached,
                    fire_number: projection.fireNumber,
                    age_at_fire: projection.ageAtFIRE,
                    sim_type: simType,
                    success_rate: simResults.successRate,
                    median_value: simResults.medianValue
                }]);
            } catch (logError) {
                console.error("Supabase Logging Error:", logError);
            }
        }

        return new Response(JSON.stringify({
            status: "success",
            results: {
                fire_number: projection.fireNumber,
                age_at_fire: projection.ageAtFIRE,
                savings_at_fire: projection.savingsAtFIRE,
                success_rate: simResults.successRate,
                median_value: simResults.medianValue
            }
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err) {
        console.error("API Error:", err);
        return new Response(JSON.stringify({ status: "error", message: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
};
