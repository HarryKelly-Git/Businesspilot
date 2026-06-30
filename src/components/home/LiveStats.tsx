import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, CalendarDays, Users, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalLeads: number;
  totalAppointments: number;
  totalBusinesses: number;
  thisMonthLeads: number;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          leadsCount,
          appointmentsCount,
          businessesCount,
          thisMonthLeads,
        ] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }),
          supabase.from('appointments').select('id', { count: 'exact', head: true }),
          supabase.from('businesses').select('id', { count: 'exact', head: true }),
          supabase.from('leads')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        ]);

        setStats({
          totalLeads: leadsCount.count || 0,
          totalAppointments: appointmentsCount.count || 0,
          totalBusinesses: businessesCount.count || 0,
          thisMonthLeads: thisMonthLeads.count || 0,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const displayStats = [
    {
      icon: Users,
      label: 'Active Businesses',
      value: stats?.totalBusinesses ?? 0,
      suffix: '',
    },
    {
      icon: Phone,
      label: 'Leads Captured',
      value: stats?.totalLeads ?? 0,
      suffix: '',
    },
    {
      icon: CalendarDays,
      label: 'Appointments Booked',
      value: stats?.totalAppointments ?? 0,
      suffix: '',
    },
    {
      icon: TrendingUp,
      label: 'Leads This Month',
      value: stats?.thisMonthLeads ?? 0,
      suffix: '',
    },
  ];

  return (
    <section className="py-12 bg-primary/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <p className="text-sm text-muted-foreground">
            Live statistics from the BusinessPilot platform
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {displayStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground">
                  {loading ? (
                    <span className="text-muted-foreground">...</span>
                  ) : error ? (
                    <span className="text-muted-foreground text-lg">-</span>
                  ) : (
                    <>
                      {stat.value.toLocaleString()}
                      {stat.value === 0 && (
                        <span className="text-xs text-muted-foreground ml-1">(growing)</span>
                      )}
                    </>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>

        {!loading && !error && stats && stats.totalBusinesses === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-muted-foreground mt-6"
          >
            Be one of our first businesses to start capturing leads!
          </motion.p>
        )}
      </div>
    </section>
  );
}
