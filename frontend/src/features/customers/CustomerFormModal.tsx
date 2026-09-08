import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, UserCheck, Plus, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';

const schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  primaryMobile: z.string().min(10, 'Valid 10-digit mobile number is required'),
  alternateMobile: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  location: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  customerType: z.string().default('INDIVIDUAL'),
  source: z.string().default('WALK_IN'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
  initialData?: any;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const navigate = useNavigate();
  const [duplicateCustomer, setDuplicateCustomer] = useState<any | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerType: 'INDIVIDUAL',
      source: 'WALK_IN',
      city: 'Bangalore',
    },
  });

  const mobileValue = watch('primaryMobile');

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        customerType: 'INDIVIDUAL',
        source: 'WALK_IN',
        city: 'Bangalore',
      });
      setDuplicateCustomer(null);
    }
  }, [initialData, reset, isOpen]);

  // Pre-flight duplicate check when user enters 10 digits
  useEffect(() => {
    if (!initialData && mobileValue && mobileValue.replace(/\D/g, '').length >= 10) {
      const checkDup = async () => {
        setIsCheckingDuplicate(true);
        try {
          const res: any = await api.get(`/customers/check-duplicate?mobile=${encodeURIComponent(mobileValue)}`);
          if (res.success && res.data.exists) {
            setDuplicateCustomer(res.data.customer);
          } else {
            setDuplicateCustomer(null);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsCheckingDuplicate(false);
        }
      };
      checkDup();
    } else {
      setDuplicateCustomer(null);
    }
  }, [mobileValue, initialData]);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const payload: any = {
        fullName: data.fullName.trim(),
        primaryMobile: data.primaryMobile.trim(),
        alternateMobile: data.alternateMobile?.trim() || null,
        email: data.email?.trim() || null,
        location: data.location?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        customerType: data.customerType || 'INDIVIDUAL',
        source: data.source || 'WALK_IN',
        notes: data.notes?.trim() || null,
      };

      if (initialData) {
        const res: any = await api.put(`/customers/${initialData.id}`, payload);
        onSuccess(res.data);
      } else {
        const res: any = await api.post('/customers', payload);
        onSuccess(res.data);
      }
      onClose();
    } catch (err: any) {
      if (err.customer) {
        setDuplicateCustomer(err.customer);
      }
      const msg =
        err.errors?.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ') ||
        err.message ||
        'Failed to save customer';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Customer Profile' : 'New Customer Entry'}
      subtitle="Fast 2-click customer entry for sales staff"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Duplicate Detection Alert Banner */}
        {duplicateCustomer && (
          <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-brand-200 animate-in fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-brand-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Existing Customer Found: {duplicateCustomer.fullName}
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Phone: {duplicateCustomer.primaryMobile} • {duplicateCustomer.requirements?.length || 0} existing requirement(s)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brand-500/20">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  navigate(`/customers/${duplicateCustomer.id}`);
                }}
              >
                Open Existing Customer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => {
                  onClose();
                  navigate(`/customers/${duplicateCustomer.id}?addRequirement=true`);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add New Requirement To This Customer
              </Button>
            </div>
          </div>
        )}

        {serverError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Customer Full Name"
            placeholder="e.g. Ravi Kumar"
            required
            error={errors.fullName?.message}
            {...register('fullName')}
          />

          <Input
            label="Primary Mobile Number"
            placeholder="e.g. 9876543210"
            required
            error={errors.primaryMobile?.message}
            helperText={isCheckingDuplicate ? 'Checking duplicates...' : undefined}
            {...register('primaryMobile')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Alternate Mobile"
            placeholder="Optional secondary phone"
            error={errors.alternateMobile?.message}
            {...register('alternateMobile')}
          />

          <Input
            label="Email Address"
            placeholder="e.g. customer@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select label="Customer Type" {...register('customerType')}>
            <option value="INDIVIDUAL">Individual Buyer</option>
            <option value="FLEET_OPERATOR">Commercial / Fleet Operator</option>
            <option value="BUSINESS">Business / Corporate</option>
          </Select>

          <Select label="Lead Source" {...register('source')}>
            <option value="WALK_IN">Walk-in Showroom</option>
            <option value="PHONE">Phone Enquiry</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="WEBSITE">Website</option>
            <option value="REFERRAL">Referral</option>
            <option value="FIELD_VISIT">Field Visit</option>
            <option value="SOCIAL_MEDIA">Social Media</option>
            <option value="ADVERTISEMENT">Advertisement</option>
          </Select>

          <Input
            label="City / Location"
            placeholder="e.g. Bangalore"
            {...register('city')}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
            General Notes / Preferences
          </label>
          <textarea
            rows={2}
            className="w-full bg-slate-900/90 text-slate-100 placeholder-slate-500 border border-slate-700/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            placeholder="e.g. Needs car urgently for family travel..."
            {...register('notes')}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} rightIcon={<ArrowRight className="w-4 h-4" />}>
            {initialData ? 'Update Customer' : 'Save & Continue'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
