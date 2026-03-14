import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async (req) => {
  if (req.method !== "POST") return new Response("Forbidden", { status: 405 });

  try {
    const data = await req.json();
    console.log(`[Ingest] Receiving ${data.event_type} for Visit: ${data.visit_id}`);

    // Extract country from Netlify headers (automatically provided by edge)
    // Supports 'x-country' or 'x-nf-country' depending on Netlify config
    const countryCode = req.headers.get('x-country') || req.headers.get('x-nf-country') || 'unknown';

    const { error } = await supabase.from('fire_sentiment').insert([{
      event_type: data.event_type,
      visit_id: data.visit_id,
      country_code: countryCode,
      age: data.age,
      currency: data.currency,
      withdrawal_rate: data.withdrawal_rate,
      inflation_belief: data.inflation_belief,
      expenses: data.expenses,
      savings: data.savings,
      pre_fire_return: data.pre_fire_return,
      post_fire_return: data.post_fire_return,
      sim_type: data.sim_type,
      success_rate: data.success_rate,
      median_value: data.median_value,
      
      // New Core Data
      gross_annual_income: data.gross_annual_income,
      salary_increase: data.salary_increase,
      yearly_savings: data.yearly_savings,
      monthly_income_after_fire: data.monthly_income_after_fire,
      fire_mode: data.fire_mode,
      coast_target_age: data.coast_target_age,
      fire_reached: data.fire_reached,
      fire_number: data.fire_number,
      time_to_fire_months: data.time_to_fire_months,
      age_at_fire: data.age_at_fire,
      savings_at_fire: data.savings_at_fire,
      total_contributions: data.total_contributions,
      events_data: data.events_data, // JSON Array
      
      // New Sim Data
      sim_return: data.sim_return,
      sim_volatility: data.sim_volatility,
      sim_count: data.sim_count,
      sim_portfolio_value: data.sim_portfolio_value,
      sim_retirement_age: data.sim_retirement_age,
      sim_yearly_expenses: data.sim_yearly_expenses,
      sim_stock_allocation: data.sim_stock_allocation,
      sim_flex_threshold: data.sim_flex_threshold,
      sim_flex_reduction: data.sim_flex_reduction,
      sim_median_flex_years: data.sim_median_flex_years,
      p10_value: data.p10_value,
      p90_value: data.p90_value,
      
      // OMY & Habits
      omy_extra_years: data.omy_extra_years,
      omy_new_portfolio: data.omy_new_portfolio,
      omy_new_retirement_age: data.omy_new_retirement_age,
      omy_new_total_spending: data.omy_new_total_spending,
      omy_delta_spending: data.omy_delta_spending,
      omy_funds_last_until: data.omy_funds_last_until,
      omy_yearly_savings: data.omy_yearly_savings,
      habit_description: data.habit_description,
      habit_start_date: data.habit_start_date,
      habit_freq: data.habit_freq,
      habit_cost: data.habit_cost,
      habit_delay_result: data.habit_delay_result,
      
      // Plot & Errors
      comp_savings_1: data.comp_savings_1,
      comp_start_savings_1: data.comp_start_savings_1,
      comp_savings_2: data.comp_savings_2,
      comp_start_savings_2: data.comp_start_savings_2,
      error_message: data.error_message
    }]);

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Bridge Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
