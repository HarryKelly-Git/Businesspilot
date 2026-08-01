import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  DollarSign,
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal, Textarea, Spinner } from '../components/ui';
import { useAppointments } from '../hooks/useData';
import { useAuth } from '../contexts/AuthContext';
import { scheduleReviewRequestOnCompletion } from '../lib/reviews';
import { formatDate, formatTime } from '../lib/utils';
import type { Appointment } from '../types';

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const statusStyles = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  no_show: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export function AppointmentsPage() {
  const { appointments, loading, createAppointment, updateAppointment } = useAppointments();
  const { business } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_type: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    duration_minutes: '60',
    notes: '',
    estimated_value: '',
  });

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: appointments.length,
      upcoming: appointments.filter(
        (a) => a.scheduled_date >= today && !['cancelled', 'no_show', 'completed'].includes(a.status)
      ).length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled').length,
      today: appointments.filter((a) => a.scheduled_date === today).length,
    };
  }, [appointments]);

  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    const upcoming = appointments
      .filter((a) => a.status !== 'cancelled')
      .sort((a, b) => {
        if (a.scheduled_date === b.scheduled_date) {
          return a.scheduled_time.localeCompare(b.scheduled_time);
        }
        return a.scheduled_date.localeCompare(b.scheduled_date);
      });

    upcoming.forEach((apt) => {
      if (!groups[apt.scheduled_date]) {
        groups[apt.scheduled_date] = [];
      }
      groups[apt.scheduled_date].push(apt);
    });

    return groups;
  }, [appointments]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days = [];

    // Add padding days from previous month
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false,
        appointments: [],
      });
    }

    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        date,
        isCurrentMonth: true,
        appointments: appointments.filter((a) => a.scheduled_date === dateStr),
      });
    }

    return days;
  }, [currentDate, appointments]);

  const handleOpenModal = (mode: 'create' | 'edit' | 'view', appointment?: Appointment) => {
    setModalMode(mode);
    if (appointment) {
      setSelectedAppointment(appointment);
      setFormData({
        customer_name: appointment.customer_name,
        customer_email: appointment.customer_email || '',
        customer_phone: appointment.customer_phone || '',
        service_type: appointment.service_type || '',
        scheduled_date: appointment.scheduled_date,
        scheduled_time: appointment.scheduled_time,
        duration_minutes: appointment.duration_minutes.toString(),
        notes: appointment.notes || '',
        estimated_value: appointment.estimated_value?.toString() || '',
      });
    } else {
      setSelectedAppointment(null);
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        service_type: '',
        scheduled_date: today,
        scheduled_time: '09:00',
        duration_minutes: '60',
        notes: '',
        estimated_value: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const appointmentData = {
      customer_name: formData.customer_name,
      customer_email: formData.customer_email || null,
      customer_phone: formData.customer_phone || null,
      service_type: formData.service_type || null,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time,
      duration_minutes: parseInt(formData.duration_minutes),
      notes: formData.notes || null,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
    };

    if (modalMode === 'create') {
      await createAppointment(appointmentData);
    } else if (modalMode === 'edit' && selectedAppointment) {
      await updateAppointment(selectedAppointment.id, appointmentData);
    }

    setSubmitting(false);
    handleCloseModal();
  };

  const handleStatusChange = async (appointment: Appointment, newStatus: string) => {
    const wasCompleted = appointment.status === 'completed';
    await updateAppointment(appointment.id, { status: newStatus as Appointment['status'] });
    // Reputation Loop: on the transition INTO 'completed', schedule a review
    // request. Fire-and-forget and self-guarding — it does nothing unless the
    // business has switched the loop on and saved a review link, and it never
    // blocks or breaks the status change the user just made.
    if (business && newStatus === 'completed' && !wasCompleted) {
      void scheduleReviewRequestOnCompletion(business, appointment);
    }
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-green-600">{stats.upcoming}</div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-sm text-muted-foreground">Cancelled</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-orange-600">{stats.today}</div>
              <div className="text-sm text-muted-foreground">Today</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            List View
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'primary' : 'outline'}
            onClick={() => setViewMode('calendar')}
          >
            Calendar View
          </Button>
        </div>
        <Button onClick={() => handleOpenModal('create')}>
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">{monthName}</h2>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Previous month"
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Next month"
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 mt-1">
            {calendarDays.map((day, index) => {
              const isToday = day.date.toDateString() === new Date().toDateString();
              const hasAppointments = day.appointments.length > 0;

              return (
                <div
                  key={index}
                  className={`min-h-[80px] p-2 rounded-lg border transition-colors ${
                    day.isCurrentMonth
                      ? 'bg-background border-border'
                      : 'bg-muted/50 border-transparent'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${!day.isCurrentMonth ? 'text-muted-foreground' : ''}`}>
                    {day.date.getDate()}
                  </div>
                  {hasAppointments && (
                    <div className="space-y-1">
                      {day.appointments.slice(0, 2).map((apt) => (
                        <div
                          key={apt.id}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${
                            statusStyles[apt.status as keyof typeof statusStyles]
                          }`}
                        >
                          {formatTime(apt.scheduled_time)} {apt.customer_name}
                        </div>
                      ))}
                      {day.appointments.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{day.appointments.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        /* List View */
        <div className="space-y-6">
          {Object.keys(groupedAppointments).length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No appointments scheduled</p>
              <p className="text-sm mt-1">Create your first appointment to get started</p>
            </Card>
          ) : (
            Object.entries(groupedAppointments).map(([date, dayAppointments]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                  {formatDate(date)}
                </h3>
                <div className="space-y-2">
                  {dayAppointments.map((appointment) => (
                    <motion.div
                      key={appointment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Card
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleOpenModal('view', appointment)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="text-center min-w-[60px]">
                            <div className="text-lg font-bold">
                              {formatTime(appointment.scheduled_time)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {appointment.duration_minutes} min
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-medium">{appointment.customer_name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {appointment.service_type || 'General Service'}
                                </p>
                              </div>
                              <select
                                value={appointment.status}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(appointment, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={`text-xs font-medium px-2 py-1.5 rounded-full border-none cursor-pointer ${
                                  statusStyles[appointment.status as keyof typeof statusStyles]
                                }`}
                              >
                                {statusOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {appointment.customer_phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {appointment.customer_phone}
                                </span>
                              )}
                              {appointment.customer_email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {appointment.customer_email}
                                </span>
                              )}
                              {appointment.estimated_value && (
                                <span className="flex items-center gap-1 font-medium text-green-600">
                                  <DollarSign className="w-3 h-3" />
                                  {appointment.estimated_value.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={
          modalMode === 'create'
            ? 'New Appointment'
            : modalMode === 'edit'
            ? 'Edit Appointment'
            : 'Appointment Details'
        }
        size="lg"
      >
        {modalMode === 'view' && selectedAppointment ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{selectedAppointment.customer_name}</h3>
                <p className="text-muted-foreground">{selectedAppointment.service_type || 'General Service'}</p>
                <Badge
                  className="mt-2"
                  variant={
                    selectedAppointment.status === 'completed'
                      ? 'success'
                      : selectedAppointment.status === 'cancelled'
                      ? 'destructive'
                      : 'muted'
                  }
                >
                  {selectedAppointment.status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Date</p>
                <p className="text-sm font-medium">{formatDate(selectedAppointment.scheduled_date)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Time</p>
                <p className="text-sm font-medium">
                  {formatTime(selectedAppointment.scheduled_time)} ({selectedAppointment.duration_minutes} min)
                </p>
              </div>
              {selectedAppointment.customer_phone && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <p className="text-sm font-medium">{selectedAppointment.customer_phone}</p>
                </div>
              )}
              {selectedAppointment.customer_email && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="text-sm font-medium">{selectedAppointment.customer_email}</p>
                </div>
              )}
            </div>

            {selectedAppointment.notes && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{selectedAppointment.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  handleCloseModal();
                  handleOpenModal('edit', selectedAppointment);
                }}
              >
                Edit
              </Button>
              <Button onClick={handleCloseModal}>Close</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Customer Name *"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              />
            </div>

            <Input
              label="Service Type"
              value={formData.service_type}
              onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
              placeholder="e.g., Electrical inspection"
            />

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Date *"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
              />
              <Input
                label="Time *"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                required
              />
              <Input
                label="Duration (min)"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                min="15"
                step="15"
              />
            </div>

            <Input
              label="Estimated Value"
              type="number"
              value={formData.estimated_value}
              onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
              placeholder="0.00"
            />

            <Textarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional details..."
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="ghost" type="button" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {modalMode === 'create' ? 'Create Appointment' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
