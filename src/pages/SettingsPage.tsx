import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building,
  User,
  MessageSquare,
  CreditCard,
  Bell,
  Settings as SettingsIcon,
  Save,
  Plus,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Card, Button, Input, Select, Textarea, Badge, Spinner, Modal } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useBusiness } from '../hooks/useData';
import { useSubscription } from '../hooks/useSubscription';
import { STRIPE_PRODUCTS } from '../stripe-config';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const tabs = [
  { id: 'business', label: 'Business', icon: Building },
  { id: 'services', label: 'Services', icon: SettingsIcon },
  { id: 'ai', label: 'Response Settings', icon: MessageSquare },
  { id: 'account', label: 'Account', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const toneOptions = [
  { value: 'friendly', label: 'Friendly & Approachable' },
  { value: 'professional', label: 'Professional & Formal' },
  { value: 'casual', label: 'Casual & Relaxed' },
];

// Average NZ trade job value, used to express plan cost as "jobs to break even".
const AVG_JOB_VALUE_NZD = 350;

export function SettingsPage() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { business, updateBusiness } = useBusiness();
  const {
    subscription,
    loading: subscriptionLoading,
    product: currentProduct,
  } = useSubscription(business?.id ?? null);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('business');
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Business settings
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [alertPhone, setAlertPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessState, setBusinessState] = useState('');
  const [businessZip, setBusinessZip] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  // Services
  const [services, setServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState('');

  // AI settings
  const [businessDescription, setBusinessDescription] = useState('');
  const [responseTone, setResponseTone] = useState('friendly');
  const [customInstructions, setCustomInstructions] = useState('');
  const [transferInstructions, setTransferInstructions] = useState('');
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  // Account
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load settings. Note: no local `loading` flag here — the page must render even when
  // there is no business yet, otherwise Settings hangs on a spinner forever.
  useEffect(() => {
    if (business) {
      setBusinessName(business.name || '');
      setBusinessPhone(business.phone || '');
      setBusinessAddress(business.address || '');
      setBusinessCity(business.city || '');
      setBusinessState(business.state || '');
      setBusinessZip(business.zip || '');
      setBusinessWebsite(business.website || '');

      const settings = business.settings as Record<string, unknown> | null;
      if (settings) {
        setBusinessEmail((settings.email as string) || '');
        setAlertPhone((settings.alertPhone as string) || '');
        setServiceArea((settings.serviceArea as string) || '');
        setServices((settings.services as string[]) || []);
        setBusinessDescription((settings.businessDescription as string) || '');
        setResponseTone((settings.responseTone as string) || 'friendly');
        setCustomInstructions((settings.customInstructions as string) || '');
        setTransferInstructions((settings.transferInstructions as string) || '');
        setFaqs((settings.faqs as Array<{ question: string; answer: string }>) || []);
      }
    }
  }, [business]);

  const handleSaveBusiness = async () => {
    setSaving(true);
    try {
      const result = await updateBusiness({
        name: businessName,
        phone: businessPhone || null,
        address: businessAddress || null,
        city: businessCity || null,
        state: businessState || null,
        zip: businessZip || null,
        website: businessWebsite || null,
        settings: {
          ...business?.settings,
          email: businessEmail || null,
          serviceArea: serviceArea || null,
          alertPhone: alertPhone || null,
        },
      });
      if (result.error) {
        toast.error('Failed to save settings');
      } else {
        toast.success('Settings saved');
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveServices = async () => {
    setSaving(true);
    try {
      const result = await updateBusiness({
        settings: {
          ...business?.settings,
          services,
        },
      });
      if (result.error) {
        toast.error('Failed to save services');
      } else {
        toast.success('Services saved');
      }
    } catch (err) {
      toast.error('Failed to save services');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAI = async () => {
    setSaving(true);
    try {
      const result = await updateBusiness({
        settings: {
          ...business?.settings,
          businessDescription,
          responseTone,
          customInstructions,
          transferInstructions,
          faqs,
        },
      });
      if (result.error) {
        toast.error('Failed to save settings');
      } else {
        toast.success('Response settings saved');
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const addService = () => {
    if (customService.trim() && !services.includes(customService.trim())) {
      setServices([...services, customService.trim()]);
      setCustomService('');
    }
  };

  const removeService = (service: string) => {
    setServices(services.filter((s) => s !== service));
  };

  const addFaq = () => {
    if (newFaqQuestion.trim() && newFaqAnswer.trim()) {
      setFaqs([...faqs, { question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() }]);
      setNewFaqQuestion('');
      setNewFaqAnswer('');
    }
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    try {
      // Delete business data
      if (business) {
        await supabase.from('businesses').delete().eq('id', business.id);
      }

      // Delete profile
      if (user) {
        await supabase.from('profiles').delete().eq('id', user.id);
      }

      // Sign out and redirect
      await signOut();
      toast.success('Account deleted successfully');
      navigate('/');
    } catch (err) {
      toast.error('Failed to delete account. Please contact support.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Only block on auth actually resolving. Everything below renders fine without a business.
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <h1 className="text-2xl font-bold mb-2">Finish setting up first</h1>
        <p className="text-muted-foreground mb-6">
          Tell us about your business and we'll have your AI answering enquiries in under a minute.
        </p>
        <Button onClick={() => navigate('/onboarding')}>Complete setup</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your business and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <Card className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* Business Settings */}
          {activeTab === 'business' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Business Details</h2>
              <div className="space-y-4 max-w-lg">
                <Input
                  label="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                />
                <div>
                  <Input
                    label="Emergency alert mobile"
                    type="tel"
                    placeholder="021 123 4567"
                    value={alertPhone}
                    onChange={(e) => setAlertPhone(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Where we text you when an emergency enquiry comes in (e.g. no power, burst pipe).
                    Use your personal mobile — not your business line.
                  </p>
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                />
                <Input
                  label="Website"
                  value={businessWebsite}
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                />
                <Input
                  label="Address"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    value={businessCity}
                    onChange={(e) => setBusinessCity(e.target.value)}
                  />
                  <Input
                    label="Suburb"
                    value={businessState}
                    onChange={(e) => setBusinessState(e.target.value)}
                  />
                </div>
                <Input
                  label="Postcode"
                  value={businessZip}
                  onChange={(e) => setBusinessZip(e.target.value)}
                />
                <Input
                  label="Service Area"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="e.g., Within 20 miles of downtown"
                />
                <div className="pt-4 border-t">
                  <Button onClick={handleSaveBusiness} loading={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Services */}
          {activeTab === 'services' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Your Services</h2>
              <div className="space-y-6 max-w-lg">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Services help qualify leads automatically
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {services.map((service) => (
                      <span
                        key={service}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {service}
                        <button onClick={() => removeService(service)} className="ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a service..."
                      value={customService}
                      onChange={(e) => setCustomService(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                    />
                    <Button onClick={addService} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button onClick={handleSaveServices} loading={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Services
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* AI Settings */}
          {activeTab === 'ai' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Response Settings</h2>
              <div className="space-y-6 max-w-lg">
                <Textarea
                  label="Business Description"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="Describe your business so responses match your style..."
                  className="min-h-[80px]"
                />
                <Select
                  label="Response Tone"
                  options={toneOptions}
                  value={responseTone}
                  onChange={(e) => setResponseTone(e.target.value)}
                />
                <Textarea
                  label="Custom Instructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Special instructions for handling enquiries..."
                  className="min-h-[80px]"
                />
                <Textarea
                  label="When to Contact You"
                  value={transferInstructions}
                  onChange={(e) => setTransferInstructions(e.target.value)}
                  placeholder="When should urgent queries be sent to you directly?"
                  className="min-h-[80px]"
                />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Frequently Asked Questions</label>
                    <span className="text-xs text-muted-foreground">
                      Helps answer common questions automatically
                    </span>
                  </div>
                  <div className="space-y-3">
                    {faqs.map((faq, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{faq.question}</p>
                            <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                          </div>
                          <button onClick={() => removeFaq(index)}>
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-3">
                    <Input
                      placeholder="Question..."
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                    />
                    <Input
                      placeholder="Answer..."
                      value={newFaqAnswer}
                      onChange={(e) => setNewFaqAnswer(e.target.value)}
                    />
                    <Button onClick={addFaq} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add FAQ
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button onClick={handleSaveAI} loading={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Account Settings */}
          {activeTab === 'account' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Account Settings</h2>
              <div className="space-y-6 max-w-lg">
                <div>
                  <p className="text-sm font-medium mb-2">Email</p>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-4">Change Password</h3>
                  <div className="space-y-3">
                    <Input
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <Button onClick={handleChangePassword} loading={saving}>
                      Update Password
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-2">Theme</h3>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === 'light' ? 'primary' : 'outline'}
                      onClick={() => setTheme('light')}
                    >
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'primary' : 'outline'}
                      onClick={() => setTheme('dark')}
                    >
                      Dark
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-destructive mb-2">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Deleting your account will permanently remove all data.
                  </p>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Billing */}
          {activeTab === 'billing' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-6">Billing</h2>
              <div className="space-y-6 max-w-lg">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-medium">Current Plan</span>
                    {subscriptionLoading ? (
                      <Spinner className="h-4 w-4" />
                    ) : currentProduct ? (
                      <Badge variant="success">{currentProduct.name}</Badge>
                    ) : (
                      <Badge variant="muted">No active plan</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionLoading
                      ? 'Checking your subscription…'
                      : currentProduct
                      ? `${currentProduct.currencySymbol}${currentProduct.price.toFixed(0)}/month`
                      : "You're on the free trial. Pick a plan to keep your AI answering after it ends."}
                  </p>
                  {subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                    <p className="text-sm text-warning mt-2">
                      Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Available Plans</h3>
                  {Object.values(STRIPE_PRODUCTS).map((plan) => {
                    const isCurrent = currentProduct?.priceId === plan.priceId;
                    // Anchor every price to the outcome the owner actually cares about.
                    const jobsToBreakEven = Math.max(1, Math.ceil(plan.price / AVG_JOB_VALUE_NZD));
                    return (
                      <div
                        key={plan.priceId}
                        className={`p-4 rounded-lg border ${
                          isCurrent ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="font-medium">{plan.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {plan.currencySymbol}
                              {plan.price.toFixed(0)}/month
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Pays for itself with {jobsToBreakEven} extra job
                              {jobsToBreakEven > 1 ? 's' : ''} a month
                            </p>
                          </div>
                          {isCurrent ? (
                            <Badge variant="primary">Current</Badge>
                          ) : (
                            <Link to="/pricing" className="shrink-0">
                              <Button variant="outline" size="sm">
                                {currentProduct && plan.price < currentProduct.price
                                  ? 'Downgrade'
                                  : currentProduct
                                  ? 'Upgrade'
                                  : 'Choose'}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Need a custom plan?{' '}
                    <Link to="/contact" className="text-primary hover:underline">
                      Contact sales
                    </Link>
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                This action cannot be undone
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                All your data including leads, appointments, and settings will be permanently deleted.
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </p>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              loading={deleting}
              disabled={deleteConfirmation !== 'DELETE'}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
