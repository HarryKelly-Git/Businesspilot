import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  ZapOff,
  Droplets,
  Hammer,
  Wrench,
  TreePine,
  Thermometer,
  Briefcase,
  Building,
  MapPin,
  Phone,
  Globe,
  Mail,
  Clock,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, Select, Textarea } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const industries = [
  { id: 'electrician', name: 'Electrician', icon: ZapOff },
  { id: 'plumber', name: 'Plumber', icon: Droplets },
  { id: 'builder', name: 'Builder', icon: Hammer },
  { id: 'mechanic', name: 'Mechanic', icon: Wrench },
  { id: 'landscaper', name: 'Landscaper', icon: TreePine },
  { id: 'hvac', name: 'HVAC', icon: Thermometer },
  { id: 'other', name: 'Other', icon: Briefcase },
];

const steps = [
  { id: 'industry', title: 'Your Trade', description: 'What type of business do you run?' },
  { id: 'details', title: 'Business Details', description: 'Tell customers about your business' },
  { id: 'services', title: 'Your Services', description: 'What services do you offer?' },
  { id: 'hours', title: 'Business Hours', description: 'When are you available?' },
  { id: 'ai', title: 'Response Settings', description: 'How should we handle enquiries?' },
  { id: 'complete', title: 'Ready!', description: 'Start capturing leads' },
];

const defaultServices: Record<string, string[]> = {
  electrician: ['Electrical repairs', 'Rewiring', 'Lighting installation', 'Switchboard upgrades', 'Safety inspections'],
  plumber: ['Leak repairs', 'Drain cleaning', 'Hot water systems', 'Bathroom renovations', 'Emergency call-outs'],
  builder: ['Home renovations', 'Extensions', 'New builds', 'Kitchens', 'Bathrooms'],
  mechanic: ['Car servicing', 'Repairs', 'Diagnostics', 'Brakes', 'Tyres'],
  landscaper: ['Garden design', 'Lawn care', 'Tree services', 'Hardscaping', 'Maintenance'],
  hvac: ['Air conditioning', 'Heating', 'Ventilation', 'Installation', 'Maintenance'],
  other: ['Service 1', 'Service 2', 'Service 3'],
};

const toneOptions = [
  { value: 'friendly', label: 'Friendly & Approachable' },
  { value: 'professional', label: 'Professional & Formal' },
  { value: 'casual', label: 'Casual & Relaxed' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshBusiness } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Industry
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  // Step 2: Business Details
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessState, setBusinessState] = useState('');
  const [businessZip, setBusinessZip] = useState('');
  const [serviceArea, setServiceArea] = useState('');

  // Step 3: Services
  const [services, setServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState('');

  // Step 4: Hours (simplified)
  const [workHours, setWorkHours] = useState('standard');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [workWeekends, setWorkWeekends] = useState(false);

  // Step 5: AI Settings
  const [businessDescription, setBusinessDescription] = useState('');
  const [responseTone, setResponseTone] = useState('friendly');
  const [customInstructions, setCustomInstructions] = useState('');
  const [transferInstructions, setTransferInstructions] = useState('');

  const handleNext = async () => {
    // Guard against a double-tap on the save step firing two writes.
    if (loading) return;

    if (currentStep === 0 && selectedIndustry) {
      setServices(defaultServices[selectedIndustry] || []);
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!businessName.trim() || !businessPhone.trim()) {
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (services.length === 0) {
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4) {
      setLoading(true);
      try {
        const businessHours = workHours === 'custom'
          ? { start: startTime, end: endTime, weekends: workWeekends }
          : workHours === 'standard'
          ? { start: '08:00', end: '18:00', weekends: false }
          : { start: '07:00', end: '20:00', weekends: true };

        // upsert on owner_id (which is now UNIQUE): if this owner already has a
        // business, update it instead of creating a duplicate. Always INSERTing
        // was what produced the duplicate rows behind the redirect loop.
        const { error } = await supabase
          .from('businesses')
          .upsert(
            {
              owner_id: user?.id,
              name: businessName,
              industry: selectedIndustry,
              phone: businessPhone || null,
              address: businessAddress || null,
              city: businessCity || null,
              state: businessState || null,
              zip: businessZip || null,
              website: businessWebsite || null,
              onboarding_complete: true,
              settings: {
                email: businessEmail || null,
                serviceArea: serviceArea || null,
                services,
                businessHours,
                businessDescription,
                responseTone,
                customInstructions,
                transferInstructions,
              },
            },
            { onConflict: 'owner_id' }
          )
          .select()
          .single();

        if (error) throw error;

        await refreshBusiness();
        setCurrentStep(5);
      } catch (err) {
        console.error('Error creating business:', err);
        toast.error("We couldn't save your details. Please try again.");
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 5) {
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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

  const step = steps[currentStep];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((s, index) => (
              <div
                key={s.id}
                className={`flex items-center ${
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`hidden sm:block w-16 lg:w-24 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">BusinessPilot</span>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">{step.title}</h1>
              <p className="text-muted-foreground">{step.description}</p>
            </div>

            {/* Step 1: Industry */}
            {currentStep === 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {industries.map((industry) => {
                  const Icon = industry.icon;
                  const isSelected = selectedIndustry === industry.id;
                  return (
                    <button
                      key={industry.id}
                      onClick={() => setSelectedIndustry(industry.id)}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                          isSelected ? 'bg-primary/10' : 'bg-muted'
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <h3 className="font-medium">{industry.name}</h3>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step 2: Business Details */}
            {currentStep === 1 && (
              <div className="space-y-4 max-w-md mx-auto">
                <Input
                  label="Business Name *"
                  placeholder="Smith's Electrical Services"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  icon={<Building className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Phone Number *"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  icon={<Phone className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  placeholder="contact@example.com"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4" />}
                />

                <Input
                  label="Website"
                  placeholder="www.example.com"
                  value={businessWebsite}
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                  icon={<Globe className="w-4 h-4" />}
                />

                <Input
                  label="Address"
                  placeholder="123 Main Street"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  icon={<MapPin className="w-4 h-4" />}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    placeholder="Springfield"
                    value={businessCity}
                    onChange={(e) => setBusinessCity(e.target.value)}
                  />
                  <Input
                    label="Suburb"
                    placeholder="IL"
                    value={businessState}
                    onChange={(e) => setBusinessState(e.target.value)}
                  />
                </div>

                <Input
                  label="Service Area"
                  placeholder="e.g., Within 20 miles of Springfield"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                />
              </div>
            )}

            {/* Step 3: Services */}
            {currentStep === 2 && (
              <div className="space-y-6 max-w-md mx-auto">
                <div>
                  <p className="text-sm font-medium mb-3">Your Services</p>
                  <div className="flex flex-wrap gap-2">
                    {services.map((service) => (
                      <span
                        key={service}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {service}
                        <button
                          onClick={() => removeService(service)}
                          className="ml-1 hover:text-primary/70"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add another service..."
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                  />
                  <Button onClick={addService} variant="outline">
                    Add
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  These services will help qualify leads automatically
                </p>
              </div>
            )}

            {/* Step 4: Hours */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-md mx-auto">
                <div className="space-y-3">
                  <button
                    onClick={() => setWorkHours('standard')}
                    className={`w-full p-4 rounded-lg border text-left ${
                      workHours === 'standard' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="font-medium">Standard Hours</div>
                    <div className="text-sm text-muted-foreground">Mon-Fri, 8am-6pm</div>
                  </button>

                  <button
                    onClick={() => setWorkHours('extended')}
                    className={`w-full p-4 rounded-lg border text-left ${
                      workHours === 'extended' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="font-medium">Extended Hours</div>
                    <div className="text-sm text-muted-foreground">7 days a week, early to late</div>
                  </button>

                  <button
                    onClick={() => setWorkHours('custom')}
                    className={`w-full p-4 rounded-lg border text-left ${
                      workHours === 'custom' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="font-medium">Custom Hours</div>
                    <div className="text-sm text-muted-foreground">Set your own schedule</div>
                  </button>
                </div>

                {workHours === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <Input
                      label="Start Time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                    <Input
                      label="End Time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                    <label className="col-span-2 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={workWeekends}
                        onChange={(e) => setWorkWeekends(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Work weekends</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: AI Settings */}
            {currentStep === 4 && (
              <div className="space-y-6 max-w-md mx-auto">
                <Textarea
                  label="Business Description"
                  placeholder="e.g., Family-owned electrical business serving Springfield for 15 years. We specialize in residential and small commercial work..."
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  className="min-h-[80px]"
                />

                <Select
                  label="Response Tone"
                  options={toneOptions}
                  value={responseTone}
                  onChange={(e) => setResponseTone(e.target.value)}
                />

                <Textarea
                  label="Custom Instructions (optional)"
                  placeholder="e.g., Always ask for photos of the issue. Mention we offer free quotes within 24 hours."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="min-h-[80px]"
                />

                <Textarea
                  label="When to Contact You (optional)"
                  placeholder="e.g., Transfer urgent electrical faults directly to my phone. Non-urgent enquiries can wait until morning."
                  value={transferInstructions}
                  onChange={(e) => setTransferInstructions(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            )}

            {/* Step 6: Complete */}
            {currentStep === 5 && (
              <div className="text-center">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-success" />
                </div>

                <h2 className="text-xl font-bold mb-2">You're All Set!</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Your lead capture system is ready. Start receiving enquiries and
                  let the system handle the rest.
                </p>

                <div className="bg-muted rounded-lg p-6 max-w-md mx-auto mb-8 text-left">
                  <p className="text-sm font-medium mb-4">Next steps:</p>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs text-primary">1</span>
                      </div>
                      Test the system with a message
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs text-primary">2</span>
                      </div>
                      Add your first lead
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs text-primary">3</span>
                      </div>
                      Configure additional settings
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={
              (currentStep === 0 && !selectedIndustry) ||
              (currentStep === 1 && (!businessName.trim() || !businessPhone.trim())) ||
              (currentStep === 2 && services.length === 0) ||
              loading
            }
            loading={loading}
            className="gap-2"
          >
            {currentStep === 5 ? 'Go to Dashboard' : 'Continue'}
            {currentStep < 5 && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
