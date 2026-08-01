import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  TrendingUp,
  DollarSign,
  Phone,
  MessageSquare,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Card, Button, Select } from '../components/ui';
import { useMetrics, useLeads, useMissedCalls, useAppointments } from '../hooks/useData';
import { formatCurrency, formatDate } from '../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ReportsPage() {
  const { metrics } = useMetrics();
  const { leads } = useLeads();
  const { missedCalls } = useMissedCalls();
  const { appointments } = useAppointments();
  const [dateRange, setDateRange] = useState('30');

  const aggregatedMetrics = useMemo(() => {
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
  }, [metrics]);

  const chartData = useMemo(() => {
    return metrics.slice(-14).map((m) => ({
      date: formatDate(m.date),
      leads: m.leads_received,
      revenue: Number(m.revenue_recovered),
      calls: m.missed_calls,
    }));
  }, [metrics]);

  const leadSourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    leads.forEach((lead) => {
      sources[lead.source] = (sources[lead.source] || 0) + 1;
    });
    return Object.entries(sources).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const leadStatusData = useMemo(() => {
    const statuses: Record<string, number> = {};
    leads.forEach((lead) => {
      statuses[lead.status] = (statuses[lead.status] || 0) + 1;
    });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const recoveryRate = useMemo(() => {
    // No missed calls means nothing to recover — show 0, not a misleading 100%.
    if (aggregatedMetrics.missed_calls === 0) return 0;
    return Math.round((aggregatedMetrics.calls_recovered / aggregatedMetrics.missed_calls) * 100);
  }, [aggregatedMetrics]);

  const conversionRate = useMemo(() => {
    if (aggregatedMetrics.leads_received === 0) return 0;
    return Math.round((aggregatedMetrics.leads_converted / aggregatedMetrics.leads_received) * 100);
  }, [aggregatedMetrics]);

  // Real revenue trend: last 7 days of metrics vs the 7 before. null when there
  // isn't a prior period to compare against (so we never show a made-up delta).
  const revenueTrend = useMemo(() => {
    const sum = (arr: typeof metrics) => arr.reduce((s, m) => s + Number(m.revenue_recovered), 0);
    const recent = sum(metrics.slice(-7));
    const prior = sum(metrics.slice(-14, -7));
    if (prior === 0) return null;
    return Math.round(((recent - prior) / prior) * 100);
  }, [metrics]);

  const handleExportPDF = () => {
    const reportContent = `
      BUSINESSPILOT AI - WEEKLY REPORT
      =================================

      Summary:
      - Leads Received: ${aggregatedMetrics.leads_received}
      - Leads Converted: ${aggregatedMetrics.leads_converted}
      - Conversion Rate: ${conversionRate}%

      - Missed Calls: ${aggregatedMetrics.missed_calls}
      - Calls Recovered: ${aggregatedMetrics.calls_recovered}
      - Recovery Rate: ${recoveryRate}%

      - Appointments Booked: ${aggregatedMetrics.appointments_booked}
      - Revenue Recovered: ${formatCurrency(aggregatedMetrics.revenue_recovered)}

      - Messages Sent: ${aggregatedMetrics.messages_sent}

      Generated on: ${new Date().toLocaleDateString()}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `businesspilot-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const keyMetrics = [
    {
      title: 'Revenue Recovered',
      value: formatCurrency(aggregatedMetrics.revenue_recovered),
      // Real 7-day-over-7-day trend; a neutral label when there's no prior period.
      change: revenueTrend === null ? 'this period' : `${revenueTrend >= 0 ? '+' : ''}${revenueTrend}%`,
      positive: (revenueTrend ?? 0) >= 0,
      neutral: revenueTrend === null,
      icon: DollarSign,
      color: 'text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Leads Converted',
      value: aggregatedMetrics.leads_converted,
      change: `${conversionRate}% rate`,
      positive: conversionRate > 20,
      neutral: false,
      icon: TrendingUp,
      color: 'text-blue-500',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Calls Recovered',
      value: aggregatedMetrics.calls_recovered,
      change: `${recoveryRate}% rate`,
      positive: recoveryRate > 70,
      neutral: false,
      icon: Phone,
      color: 'text-orange-500',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      // "AI handled" is a descriptive label, not a period-over-period change, so
      // this card shows a neutral indicator — no up/down arrow to imply a trend.
      title: 'Messages Sent',
      value: aggregatedMetrics.messages_sent,
      change: 'AI handled',
      positive: true,
      neutral: true,
      icon: MessageSquare,
      color: 'text-purple-500',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">AI-generated business insights</p>
        </div>
        <div className="flex gap-3">
          <Select
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${metric.bg} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${
                    metric.neutral
                      ? 'text-muted-foreground'
                      : metric.positive
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}>
                    {!metric.neutral &&
                      (metric.positive ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                    <span>{metric.change}</span>
                  </div>
                </div>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{metric.title}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Leads Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Leads Received</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Pie Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Sources</h3>
          {leadSourceData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-48">
                <ResponsiveContainer width={150} height="100%">
                  <PieChart>
                    <Pie
                      data={leadSourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {leadSourceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {leadSourceData.map((source, index) => (
                  <div key={source.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm capitalize">{source.name}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{source.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No lead data available
            </div>
          )}
        </Card>

        {/* Lead Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Status Distribution</h3>
          {leadStatusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-48">
                <ResponsiveContainer width={150} height="100%">
                  <PieChart>
                    <Pie
                      data={leadStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {leadStatusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {leadStatusData.map((status, index) => (
                  <div key={status.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm capitalize">{status.name}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{status.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No lead data available
            </div>
          )}
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">AI Business Insights</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {aggregatedMetrics.calls_recovered < aggregatedMetrics.missed_calls * 0.5 && (
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />
                  <span>You're recovering fewer than half your missed calls — enabling auto-recovery would win back more of them.</span>
                </li>
              )}
              {conversionRate < 30 && (
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                  <span>Response speed matters — the faster you reply, the more of these leads you'll win. Aim to respond within a few minutes.</span>
                </li>
              )}
              {leads.filter(l => !l.last_contacted_at).length > 3 && (
                <li className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-purple-500" />
                  <span>You have {leads.filter(l => !l.last_contacted_at).length} leads that have never been contacted. Start outreach today.</span>
                </li>
              )}
              {aggregatedMetrics.revenue_recovered > 0 && (
                <li className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
                  <span>You've recovered {formatCurrency(aggregatedMetrics.revenue_recovered)} this period. Keep up the great work!</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </Card>

      {/* Weekly Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Weekly Summary</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Leads</p>
            <p className="text-2xl font-bold">{leads.length}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Missed Calls</p>
            <p className="text-2xl font-bold">{missedCalls.length}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Appointments</p>
            <p className="text-2xl font-bold">{appointments.length}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Pipeline Value</p>
            <p className="text-2xl font-bold">
              {formatCurrency(leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0))}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
