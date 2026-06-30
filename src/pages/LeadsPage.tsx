import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  Star,
  CheckCircle,
  MessageSquare,
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, Select, Textarea, Spinner } from '../components/ui';
import { useLeads } from '../hooks/useData';
import { getInitials } from '../lib/utils';
import { calculateBookingProbability } from '../lib/ai';
import { TestMessage } from '../components/TestMessage';
import { markLeadBooked } from '../lib/api';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Lead } from '../types';

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

const urgencyOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function LeadsPage() {
  const { leads, loading, createLead, updateLead, fetchLeads } = useLeads();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [markingBooked, setMarkingBooked] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Array<{ role: string; content: string; timestamp: string }>>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service_needed: '',
    budget: '',
    urgency: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    notes: '',
    estimated_value: '',
    preferred_date: '',
    preferred_time: '',
    source: 'manual',
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        !searchQuery ||
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  const leadStats = useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter((l) => l.status === 'new').length,
      inProgress: leads.filter((l) =>
        ['contacted', 'qualified', 'quoted', 'negotiating'].includes(l.status)
      ).length,
      converted: leads.filter((l) => l.status === 'converted').length,
      totalValue: leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0),
    };
  }, [leads]);

  const handleOpenModal = async (mode: 'create' | 'edit' | 'view', lead?: Lead) => {
    setModalMode(mode);
    if (lead) {
      setSelectedLead(lead);
      setConversations([]);
      setFormData({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        service_needed: lead.service_needed || '',
        budget: lead.budget || '',
        urgency: lead.urgency as 'low' | 'normal' | 'high' | 'urgent',
        notes: lead.notes || '',
        estimated_value: lead.estimated_value?.toString() || '',
        preferred_date: lead.preferred_date || '',
        preferred_time: lead.preferred_time || '',
        source: lead.source,
      });
    } else {
      setSelectedLead(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        service_needed: '',
        budget: '',
        urgency: 'normal',
        notes: '',
        estimated_value: '',
        preferred_date: '',
        preferred_time: '',
        source: 'manual',
      });
    }
    setShowLeadModal(true);

    // Fetch conversation if viewing
    if (mode === 'view' && lead) {
      setLoadingConversations(true);
      try {
        const { data } = await supabase
          .from('ai_conversations')
          .select('messages')
          .eq('lead_id', lead.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .single();

        if (data?.messages) {
          setConversations(data.messages);
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoadingConversations(false);
      }
    }
  };

  const handleCloseModal = () => {
    setShowLeadModal(false);
    setSelectedLead(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const leadData = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      service_needed: formData.service_needed || null,
      budget: formData.budget || null,
      urgency: formData.urgency,
      notes: formData.notes || null,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      preferred_date: formData.preferred_date || null,
      preferred_time: formData.preferred_time || null,
      source: formData.source,
      ai_probability: null,
    };

    if (modalMode === 'create') {
      await createLead(leadData);
    } else if (modalMode === 'edit' && selectedLead) {
      await updateLead(selectedLead.id, leadData);
    }

    setSubmitting(false);
    handleCloseModal();
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    await updateLead(leadId, { status: newStatus as Lead['status'] });
  };

  const handleMarkBooked = async (leadId: string) => {
    setMarkingBooked(leadId);
    try {
      const result = await markLeadBooked(leadId, 'converted');
      if (result.success) {
        toast.success('Lead marked as booked!');
        await fetchLeads();
      } else {
        toast.error('Failed to update status');
      }
    } catch (err) {
      toast.error('Error updating lead');
    } finally {
      setMarkingBooked(null);
    }
  };

  const handleTestMessageSent = async () => {
    await fetchLeads();
    toast.success('New lead created from test message!');
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{leadStats.total}</div>
          <div className="text-sm text-muted-foreground">Total Leads</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-500">{leadStats.new}</div>
          <div className="text-sm text-muted-foreground">New</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-500">{leadStats.inProgress}</div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-500">{leadStats.converted}</div>
          <div className="text-sm text-muted-foreground">Converted</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">${leadStats.totalValue.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Pipeline Value</div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search leads..."
            icon={<Search className="w-4 h-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48"
        />
        <TestMessage onMessageSent={handleTestMessageSent} />
        <Button onClick={() => handleOpenModal('create')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Leads Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first lead to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Last Message</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">AI Score</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Value</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredLeads.map((lead, index) => {
                  const probability = calculateBookingProbability(lead);
                  return (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleOpenModal('view', lead)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {getInitials(lead.name)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{lead.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {lead.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {lead.phone}
                                </span>
                              )}
                              {lead.email && (
                                <span className="hidden sm:flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {lead.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="max-w-[200px] truncate">
                          {lead.last_message || lead.service_needed || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell capitalize">
                        {lead.source}
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(lead.id, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-xs font-medium px-2 py-1.5 rounded-full border-none cursor-pointer ${
                            lead.status === 'converted'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : lead.status === 'lost'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : lead.status === 'new'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {statusOptions.slice(1).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                probability > 70
                                  ? 'bg-green-500'
                                  : probability > 40
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${probability}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {probability}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {lead.estimated_value ? (
                          <span className="font-medium">
                            ${lead.estimated_value.toLocaleString()}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {lead.status !== 'converted' && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkBooked(lead.id);
                              }}
                              loading={markingBooked === lead.id}
                              disabled={markingBooked === lead.id}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Book
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal('edit', lead);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Lead Modal */}
      <Modal
        isOpen={showLeadModal}
        onClose={handleCloseModal}
        title={
          modalMode === 'create'
            ? 'Add New Lead'
            : modalMode === 'edit'
            ? 'Edit Lead'
            : 'Lead Details'
        }
        size="lg"
      >
        {modalMode === 'view' && selectedLead ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-medium text-primary">
                  {getInitials(selectedLead.name)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{selectedLead.name}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {selectedLead.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {selectedLead.phone}
                    </span>
                  )}
                  {selectedLead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedLead.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge
                  variant={
                    selectedLead.status === 'converted'
                      ? 'success'
                      : selectedLead.status === 'lost'
                      ? 'destructive'
                      : 'muted'
                  }
                >
                  {selectedLead.status}
                </Badge>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Urgency</p>
                <Badge variant="warning">{selectedLead.urgency}</Badge>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Source</p>
                <p className="text-sm capitalize">{selectedLead.source}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
                <p className="text-sm font-medium">
                  {selectedLead.estimated_value
                    ? `$${selectedLead.estimated_value.toLocaleString()}`
                    : '-'}
                </p>
              </div>
            </div>

            {selectedLead.service_needed && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Service Needed</p>
                <p className="text-sm">{selectedLead.service_needed}</p>
              </div>
            )}

            {selectedLead.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{selectedLead.notes}</p>
              </div>
            )}

            {selectedLead.last_message && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Message</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{selectedLead.last_message}</p>
              </div>
            )}

            {/* Conversation Preview */}
            {conversations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Conversation</p>
                </div>
                <div className="bg-muted rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {conversations.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-background'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingConversations && (
              <div className="flex items-center justify-center py-4">
                <Spinner className="h-5 w-5" />
              </div>
            )}

            {selectedLead.ai_probability && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/50">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {selectedLead.ai_probability}% booking probability
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  handleCloseModal();
                  handleOpenModal('edit', selectedLead);
                }}
              >
                Edit Lead
              </Button>
              <Button onClick={handleCloseModal}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <Input
              label="Service Needed"
              value={formData.service_needed}
              onChange={(e) =>
                setFormData({ ...formData, service_needed: e.target.value })
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Budget"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g., $500-1000"
              />
              <Input
                label="Estimated Value"
                type="number"
                value={formData.estimated_value}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_value: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <Select
              label="Urgency"
              options={urgencyOptions}
              value={formData.urgency}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  urgency: e.target.value as typeof formData.urgency,
                })
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Preferred Date"
                type="date"
                value={formData.preferred_date}
                onChange={(e) =>
                  setFormData({ ...formData, preferred_date: e.target.value })
                }
              />
              <Input
                label="Preferred Time"
                type="time"
                value={formData.preferred_time}
                onChange={(e) =>
                  setFormData({ ...formData, preferred_time: e.target.value })
                }
              />
            </div>

            <Textarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" type="button" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {modalMode === 'create' ? 'Add Lead' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
