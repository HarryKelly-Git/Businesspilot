import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  PhoneMissed,
  MessageSquare,
  Search,
  Check,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, Textarea, Spinner } from '../components/ui';
import { useMissedCalls, useLeads } from '../hooks/useData';
import { timeAgo } from '../lib/utils';
import type { MissedCall } from '../types';

export function MissedCallsPage() {
  const { missedCalls, loading, updateMissedCall } = useMissedCalls();
  const { createLead } = useLeads();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'recovered' | 'unrecovered'>('all');
  const [selectedCall, setSelectedCall] = useState<MissedCall | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [recoveringCall, setRecoveringCall] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  const filteredCalls = useMemo(() => {
    return missedCalls.filter((call) => {
      const matchesSearch =
        !searchQuery ||
        call.caller_phone.includes(searchQuery) ||
        call.caller_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filter === 'all' ||
        (filter === 'recovered' && call.recovered) ||
        (filter === 'unrecovered' && !call.recovered);

      return matchesSearch && matchesFilter;
    });
  }, [missedCalls, searchQuery, filter]);

  const stats = useMemo(() => {
    return {
      total: missedCalls.length,
      recovered: missedCalls.filter((c) => c.recovered).length,
      unrecovered: missedCalls.filter((c) => !c.recovered).length,
      pendingSms: missedCalls.filter((c) => !c.sms_sent).length,
      todayCount: missedCalls.filter((c) => {
        const callDate = new Date(c.called_at).toDateString();
        return callDate === new Date().toDateString();
      }).length,
    };
  }, [missedCalls]);

  const handleRecoverCall = async (call: MissedCall) => {
    setSelectedCall(call);
    setCustomerName('');
    setNotes('');
    setShowModal(true);
  };

  const handleMarkAsRecovered = async (call: MissedCall) => {
    setRecoveringCall(true);

    // Create a lead from the missed call
    if (customerName) {
      await createLead({
        name: customerName,
        phone: call.caller_phone,
        source: 'missed_call',
        notes: notes,
        status: 'new',
      });
    }

    // Update missed call status
    await updateMissedCall(call.id, {
      recovered: true,
      notes: notes,
    });

    setRecoveringCall(false);
    setShowModal(false);
    setSelectedCall(null);
    setCustomerName('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Phone className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Missed</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.recovered}</div>
              <div className="text-sm text-muted-foreground">Recovered</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <PhoneMissed className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.unrecovered}</div>
              <div className="text-sm text-muted-foreground">Unrecovered</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.pendingSms}</div>
              <div className="text-sm text-muted-foreground">Pending SMS</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.todayCount}</div>
              <div className="text-sm text-muted-foreground">Today</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recovery Flow Info */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-cyan-500/5 border-primary/20">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <RefreshCw className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">AI Recovery Flow</h3>
            <p className="text-sm text-muted-foreground">
              When a customer calls and you miss it, BusinessPilot automatically sends an SMS
              to collect their information. Leads are created automatically and you get notified.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs bg-muted px-3 py-1.5 rounded-full">
            <Phone className="w-3 h-3" />
            Missed Call
          </div>
          <div className="flex items-center gap-2 text-xs bg-muted px-3 py-1.5 rounded-full">
            <MessageSquare className="w-3 h-3" />
            SMS Sent
          </div>
          <div className="flex items-center gap-2 text-xs bg-muted px-3 py-1.5 rounded-full">
            <Check className="w-3 h-3" />
            Information Gathered
          </div>
          <div className="flex items-center gap-2 text-xs bg-muted px-3 py-1.5 rounded-full">
            <RefreshCw className="w-3 h-3" />
            Lead Created
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by phone or name..."
            icon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'unrecovered' ? 'primary' : 'outline'}
            onClick={() => setFilter('unrecovered')}
          >
            Unrecovered
          </Button>
          <Button
            variant={filter === 'recovered' ? 'primary' : 'outline'}
            onClick={() => setFilter('recovered')}
          >
            Recovered
          </Button>
        </div>
      </div>

      {/* Missed Calls List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : filteredCalls.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            <PhoneMissed className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No missed calls found</p>
            <p className="text-sm mt-1">
              Missed calls will appear here and be automatically recovered
            </p>
          </Card>
        ) : (
          filteredCalls.map((call, index) => (
            <motion.div
              key={call.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card
                className={`p-4 ${
                  call.recovered
                    ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30'
                    : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      call.recovered
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}
                  >
                    {call.recovered ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <PhoneMissed className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-medium">
                          {call.caller_name || 'Unknown Caller'}
                        </h3>
                        <p className="text-sm text-muted-foreground">{call.caller_phone}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={call.recovered ? 'success' : 'destructive'}>
                          {call.recovered ? 'Recovered' : 'Not Recovered'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {timeAgo(call.called_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      {call.sms_sent ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <MessageSquare className="w-3 h-3" />
                          SMS sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <MessageSquare className="w-3 h-3" />
                          SMS pending
                        </span>
                      )}

                      {call.response_received && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Check className="w-3 h-3" />
                          Response received
                        </span>
                      )}
                    </div>

                    {call.notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                        {call.notes}
                      </div>
                    )}
                  </div>

                  {!call.recovered && (
                    <Button
                      size="sm"
                      onClick={() => handleRecoverCall(call)}
                    >
                      Recover
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Recovery Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCall(null);
          setCustomerName('');
          setNotes('');
        }}
        title="Recover Missed Call"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Phone Number</p>
            <p className="text-lg font-medium">{selectedCall?.caller_phone}</p>
          </div>

          <Input
            label="Customer Name (if known)"
            placeholder="Enter customer name..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <Textarea
            label="Notes"
            placeholder="Any notes about this call..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setShowModal(false);
                setSelectedCall(null);
                setCustomerName('');
                setNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedCall) {
                  handleMarkAsRecovered(selectedCall);
                }
              }}
              loading={recoveringCall}
            >
              <Check className="w-4 h-4 mr-2" />
              Mark as Recovered
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
