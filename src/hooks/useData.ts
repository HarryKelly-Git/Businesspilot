import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Lead, Appointment, MissedCall, AIAction, DailyMetrics, Business } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function useLeads() {
  const { business } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!business) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setLeads(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const createLead = async (lead: Partial<Lead>) => {
    if (!business) return { error: 'No business found' };

    const { data, error: insertError } = await supabase
      .from('leads')
      .insert({ ...lead, business_id: business.id })
      .select()
      .single();

    if (insertError) return { error: insertError.message };

    await fetchLeads();
    return { data, error: null };
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { error: updateError } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id);

    if (updateError) return { error: updateError.message };

    await fetchLeads();
    return { error: null };
  };

  const deleteLead = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (deleteError) return { error: deleteError.message };

    await fetchLeads();
    return { error: null };
  };

  return {
    leads,
    loading,
    error,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
  };
}

export function useAppointments() {
  const { business } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!business) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', business.id)
        .order('scheduled_date', { ascending: true });

      if (fetchError) throw fetchError;
      setAppointments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const createAppointment = async (appointment: Partial<Appointment>) => {
    if (!business) return { error: 'No business found' };

    const { data, error: insertError } = await supabase
      .from('appointments')
      .insert({ ...appointment, business_id: business.id })
      .select()
      .single();

    if (insertError) return { error: insertError.message };

    await fetchAppointments();
    return { data, error: null };
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const { error: updateError } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id);

    if (updateError) return { error: updateError.message };

    await fetchAppointments();
    return { error: null };
  };

  const deleteAppointment = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (deleteError) return { error: deleteError.message };

    await fetchAppointments();
    return { error: null };
  };

  return {
    appointments,
    loading,
    error,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
}

export function useMissedCalls() {
  const { business } = useAuth();
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMissedCalls = useCallback(async () => {
    if (!business) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('missed_calls')
        .select('*')
        .eq('business_id', business.id)
        .order('called_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMissedCalls(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch missed calls');
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    fetchMissedCalls();
  }, [fetchMissedCalls]);

  const createMissedCall = async (call: Partial<MissedCall>) => {
    if (!business) return { error: 'No business found' };

    const { data, error: insertError } = await supabase
      .from('missed_calls')
      .insert({ ...call, business_id: business.id })
      .select()
      .single();

    if (insertError) return { error: insertError.message };

    await fetchMissedCalls();
    return { data, error: null };
  };

  const updateMissedCall = async (id: string, updates: Partial<MissedCall>) => {
    const { error: updateError } = await supabase
      .from('missed_calls')
      .update(updates)
      .eq('id', id);

    if (updateError) return { error: updateError.message };

    await fetchMissedCalls();
    return { error: null };
  };

  return {
    missedCalls,
    loading,
    error,
    fetchMissedCalls,
    createMissedCall,
    updateMissedCall,
  };
}

export function useAIActions() {
  const { business } = useAuth();
  const [actions, setActions] = useState<AIAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    if (!business) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('ai_actions')
        .select('*')
        .eq('business_id', business.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setActions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch AI actions');
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const createAction = async (action: Partial<AIAction>) => {
    if (!business) return { error: 'No business found' };

    const { data, error: insertError } = await supabase
      .from('ai_actions')
      .insert({ ...action, business_id: business.id })
      .select()
      .single();

    if (insertError) return { error: insertError.message };

    await fetchActions();
    return { data, error: null };
  };

  const executeAction = async (id: string, result?: string) => {
    const { error: updateError } = await supabase
      .from('ai_actions')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString(),
        result,
      })
      .eq('id', id);

    if (updateError) return { error: updateError.message };

    await fetchActions();
    return { error: null };
  };

  const dismissAction = async (id: string) => {
    const { error: updateError } = await supabase
      .from('ai_actions')
      .update({ status: 'dismissed' })
      .eq('id', id);

    if (updateError) return { error: updateError.message };

    await fetchActions();
    return { error: null };
  };

  return {
    actions,
    loading,
    error,
    fetchActions,
    createAction,
    executeAction,
    dismissAction,
  };
}

export function useMetrics() {
  const { business } = useAuth();
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (days = 30) => {
    if (!business) return;

    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error: fetchError } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('business_id', business.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;
      setMetrics(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [business]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const aggregateMetrics = () => {
    return metrics.reduce(
      (acc, m) => ({
        leads_received: acc.leads_received + m.leads_received,
        leads_converted: acc.leads_converted + m.leads_converted,
        appointments_booked: acc.appointments_booked + m.appointments_booked,
        missed_calls: acc.missed_calls + m.missed_calls,
        calls_recovered: acc.calls_recovered + m.calls_recovered,
        revenue_recovered: acc.revenue_recovered + Number(m.revenue_recovered),
        messages_sent: acc.messages_sent + m.messages_sent,
      }),
      {
        leads_received: 0,
        leads_converted: 0,
        appointments_booked: 0,
        missed_calls: 0,
        calls_recovered: 0,
        revenue_recovered: 0,
        messages_sent: 0,
      }
    );
  };

  return {
    metrics,
    loading,
    error,
    fetchMetrics,
    aggregateMetrics,
  };
}

export function useBusiness() {
  const { business, refreshBusiness } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateBusiness = async (updates: Partial<Business>) => {
    if (!business) return { error: 'No business found' };

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', business.id);

      if (updateError) throw updateError;

      await refreshBusiness();
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update business';
      setError(message);
      return { error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    business,
    loading,
    error,
    updateBusiness,
  };
}
