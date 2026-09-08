import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Car, Truck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { VehicleCategory, Priority, LeadStatus } from '../../types';
import { parseRupeesOrLakhs, formatCurrencyPreview } from '../../utils/formatters';

import { useAuth } from '../../context/AuthContext';

const schema = z
  .object({
    customerId: z.string().min(1, 'Customer ID is required'),
    category: z.nativeEnum(VehicleCategory).default(VehicleCategory.PASSENGER),
    priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
    status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
    assignedToId: z.string().optional().nullable(),

    // Passenger & General
    brand: z.string().min(1, 'Brand / Make is required (e.g. Toyota, Tata, Hyundai, Mahindra)'),
    model: z.string().min(1, 'Model preference is required (e.g. Innova, Creta, Swift, Ace)'),
    variant: z.string().optional().nullable(),
    minBudgetInput: z
      .string()
      .min(1, 'Min budget is required')
      .refine((val) => parseRupeesOrLakhs(val) !== null, 'Please enter a valid amount (e.g. 14 for 14 Lakhs or 1400000)'),
    maxBudgetInput: z
      .string()
      .min(1, 'Max budget is required')
      .refine((val) => parseRupeesOrLakhs(val) !== null, 'Please enter a valid amount (e.g. 18 for 18 Lakhs or 1800000)'),
    minYear: z.number().optional().nullable(),
    maxYear: z.number().optional().nullable(),
    fuelType: z.string().optional().nullable(),
    transmission: z.string().optional().nullable(),
    maxKm: z.number().optional().nullable(),
    usagePurpose: z.string().optional().nullable(),
    generalNotes: z.string().optional().nullable(),

    // Commercial attributes
    commercialType: z.string().optional().nullable(),
    bodyType: z.string().optional().nullable(),
    payloadCapacityKg: z.number().optional().nullable(),
    numberOfWheels: z.number().optional().nullable(),
    loadRequirement: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      const min = parseRupeesOrLakhs(data.minBudgetInput);
      const max = parseRupeesOrLakhs(data.maxBudgetInput);
      if (min !== null && max !== null) {
        return max >= min;
      }
      return true;
    },
    {
      message: 'Max budget must be greater than or equal to Min budget',
      path: ['maxBudgetInput'],
    }
  );

type FormData = z.infer<typeof schema>;

interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requirement: any) => void;
  initialData?: any;
  customerId?: string;
  customerName?: string;
}

export const RequirementFormModal: React.FC<RequirementFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  customerId: propCustomerId,
  customerName,
}) => {
  const { user, isManager } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>(
    initialData?.category || VehicleCategory.PASSENGER
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: usersData } = useQuery({
    queryKey: ['staff-users-modal'],
    queryFn: async () => {
      const res: any = await api.get('/auth/users');
      return res.data || [];
    },
    enabled: isManager,
  });

  const staffUsers = usersData || [];
  const customerId = propCustomerId || initialData?.customerId || '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: VehicleCategory.PASSENGER,
      priority: Priority.MEDIUM,
      status: LeadStatus.NEW,
      customerId: customerId,
      assignedToId: isManager ? '' : (user?.id || ''),
      minBudgetInput: '',
      maxBudgetInput: '',
    },
  });

  const watchedMinBudget = watch('minBudgetInput');
  const watchedMaxBudget = watch('maxBudgetInput');

  useEffect(() => {
    if (initialData) {
      setSelectedCategory(initialData.category || VehicleCategory.PASSENGER);
      reset({
        customerId: initialData.customerId,
        category: initialData.category,
        priority: initialData.priority || Priority.MEDIUM,
        status: initialData.status || LeadStatus.NEW,
        assignedToId: initialData.assignedToId || (isManager ? '' : (user?.id || '')),
        brand: initialData.brand || '',
        model: initialData.model || '',
        variant: initialData.variant || '',
        minBudgetInput: initialData.minBudget ? (initialData.minBudget / 100000).toString() : '',
        maxBudgetInput: initialData.maxBudget ? (initialData.maxBudget / 100000).toString() : '',
        minYear: initialData.minYear || undefined,
        maxYear: initialData.maxYear || undefined,
        fuelType: initialData.fuelType || 'ANY',
        transmission: initialData.transmission || 'ANY',
        maxKm: initialData.maxKm || undefined,
        commercialType: initialData.commercialType || '',
        bodyType: initialData.bodyType || '',
        payloadCapacityKg: initialData.payloadCapacityKg || undefined,
        numberOfWheels: initialData.numberOfWheels || undefined,
        loadRequirement: initialData.loadRequirement || '',
        generalNotes: initialData.generalNotes || '',
      });
    } else {
      setSelectedCategory(VehicleCategory.PASSENGER);
      reset({
        customerId: customerId,
        category: VehicleCategory.PASSENGER,
        priority: Priority.MEDIUM,
        status: LeadStatus.NEW,
        assignedToId: isManager ? '' : (user?.id || ''),
        brand: '',
        model: '',
        minBudgetInput: '',
        maxBudgetInput: '',
      });
    }
  }, [initialData, customerId, reset, isOpen, isManager, user?.id]);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const parsedMin = parseRupeesOrLakhs(data.minBudgetInput);
      const parsedMax = parseRupeesOrLakhs(data.maxBudgetInput);

      const assignedToId = isManager
        ? (data.assignedToId && data.assignedToId.trim() !== '' ? data.assignedToId.trim() : null)
        : (initialData?.assignedToId || user?.id || null);

      const payload: any = {
        ...data,
        customerId,
        category: selectedCategory,
        assignedToId,
        minBudget: parsedMin,
        maxBudget: parsedMax,
        minYear: data.minYear && !isNaN(Number(data.minYear)) && Number(data.minYear) > 0 ? Number(data.minYear) : null,
        maxYear: data.maxYear && !isNaN(Number(data.maxYear)) && Number(data.maxYear) > 0 ? Number(data.maxYear) : null,
        maxKm: data.maxKm && !isNaN(Number(data.maxKm)) && Number(data.maxKm) >= 0 ? Number(data.maxKm) : null,
        payloadCapacityKg: data.payloadCapacityKg && !isNaN(Number(data.payloadCapacityKg)) ? Number(data.payloadCapacityKg) : null,
        numberOfWheels: data.numberOfWheels && !isNaN(Number(data.numberOfWheels)) ? Number(data.numberOfWheels) : null,
        brand: data.brand.trim(),
        model: data.model.trim(),
        variant: data.variant?.trim() || null,
        commercialType: data.commercialType?.trim() || null,
        bodyType: data.bodyType?.trim() || null,
        loadRequirement: data.loadRequirement?.trim() || null,
        generalNotes: data.generalNotes?.trim() || null,
      };

      if (initialData) {
        const res: any = await api.put(`/requirements/${initialData.id}`, payload);
        onSuccess(res.data);
      } else {
        const res: any = await api.post('/requirements', payload);
        onSuccess(res.data);
      }
      onClose();
    } catch (err: any) {
      const msg = err.errors?.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ') || err.message || 'Failed to save requirement';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Vehicle Requirement' : 'Add Vehicle Requirement'}
      subtitle={`For customer: ${customerName || 'Selected Customer'}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Category Selector Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
            Vehicle Category <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(VehicleCategory.PASSENGER);
                setValue('category', VehicleCategory.PASSENGER);
              }}
              className={`flex items-center justify-center gap-2.5 p-2.5 rounded-md border font-semibold text-xs transition-colors ${
                selectedCategory === VehicleCategory.PASSENGER
                  ? 'bg-slate-900 border-slate-900 text-white shadow-subtle'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Passenger Cars & SUVs</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCategory(VehicleCategory.COMMERCIAL);
                setValue('category', VehicleCategory.COMMERCIAL);
              }}
              className={`flex items-center justify-center gap-2.5 p-2.5 rounded-md border font-semibold text-xs transition-colors ${
                selectedCategory === VehicleCategory.COMMERCIAL
                  ? 'bg-slate-900 border-slate-900 text-white shadow-subtle'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Commercial Vehicles</span>
            </button>
          </div>
        </div>

        {/* Brand & Model Criteria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label={selectedCategory === VehicleCategory.PASSENGER ? 'Brand / Make' : 'Commercial Brand'}
            placeholder="e.g. Toyota, Tata, Mahindra, Hyundai..."
            required
            error={errors.brand?.message}
            {...register('brand')}
          />

          <Input
            label="Model Preference"
            placeholder={
              selectedCategory === VehicleCategory.PASSENGER
                ? 'e.g. Innova, Thar, Swift, Creta...'
                : 'e.g. Ace, Dost, Intra, Signa...'
            }
            required
            error={errors.model?.message}
            {...register('model')}
          />
        </div>

        {/* Budget Inputs with Smart Parsing & Live Currency Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <Input
              label="Min Budget"
              type="text"
              placeholder="e.g. 14 or 1400000"
              required
              error={errors.minBudgetInput?.message}
              {...register('minBudgetInput')}
            />
            {watchedMinBudget && formatCurrencyPreview(watchedMinBudget) && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Interpreted: <strong>{formatCurrencyPreview(watchedMinBudget)}</strong></span>
              </div>
            )}
          </div>

          <div>
            <Input
              label="Max Budget"
              type="text"
              placeholder="e.g. 18 or 1800000"
              required
              error={errors.maxBudgetInput?.message}
              {...register('maxBudgetInput')}
            />
            {watchedMaxBudget && formatCurrencyPreview(watchedMaxBudget) && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Interpreted: <strong>{formatCurrencyPreview(watchedMaxBudget)}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Category Attributes */}
        {selectedCategory === VehicleCategory.PASSENGER ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Select label="Fuel Preference" {...register('fuelType')}>
              <option value="ANY">Any / Flexible</option>
              <option value="DIESEL">Diesel</option>
              <option value="PETROL">Petrol</option>
              <option value="CNG">CNG</option>
              <option value="ELECTRIC">Electric (EV)</option>
              <option value="HYBRID">Hybrid</option>
            </Select>

            <Select label="Transmission" {...register('transmission')}>
              <option value="ANY">Any / Flexible</option>
              <option value="MANUAL">Manual</option>
              <option value="AUTOMATIC">Automatic</option>
            </Select>

            <Input
              label="Minimum Model Year"
              type="number"
              placeholder="e.g. 2021"
              {...register('minYear', { valueAsNumber: true })}
            />
          </div>
        ) : (
          /* Commercial Attributes */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Select label="Commercial Type" {...register('commercialType')}>
              <option value="">Any Commercial</option>
              <option value="MINI_TRUCK">Mini Truck (SCV)</option>
              <option value="PICKUP">Pickup Truck</option>
              <option value="LCV">Light Commercial (LCV)</option>
              <option value="HCV">Heavy Commercial (HCV)</option>
              <option value="BUS">Bus / Van</option>
              <option value="TIPPER">Tipper / Dumper</option>
            </Select>

            <Select label="Body Type" {...register('bodyType')}>
              <option value="">Any Body Type</option>
              <option value="CLOSED_CONTAINER">Closed Container</option>
              <option value="OPEN_CONTAINER">Open High Deck</option>
              <option value="FLATBED">Flatbed</option>
              <option value="INSULATED">Refrigerated / Insulated</option>
            </Select>

            <Input
              label="Payload Target (KG)"
              type="number"
              placeholder="e.g. 750 or 1250"
              {...register('payloadCapacityKg', { valueAsNumber: true })}
            />
          </div>
        )}

        {/* Priority, Status & Manager-only Staff Assignment */}
        <div className={`grid grid-cols-1 ${isManager ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3.5`}>
          <Select label="Priority" {...register('priority')}>
            <option value="MEDIUM">Medium Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="URGENT">🔥 Urgent</option>
            <option value="LOW">Low Priority</option>
          </Select>

          <Select label="Initial Status" {...register('status')}>
            <option value="NEW">New Enquiry</option>
            <option value="CONTACTED">Contacted</option>
            <option value="REQUIREMENT_CONFIRMED">Requirement Confirmed</option>
            <option value="VEHICLE_SEARCHING">Searching Inventory</option>
          </Select>

          {isManager && (
            <Select label="Assign Sales Staff" {...register('assignedToId')}>
              <option value="">Unassigned</option>
              {staffUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role})
                </option>
              ))}
            </Select>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Requirement Notes / Specifics
          </label>
          <textarea
            rows={2}
            className="w-full bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. Customer wants diesel Crysta with captain seats under 20 Lakhs..."
            {...register('generalNotes')}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            {initialData ? 'Update Requirement' : 'Save Requirement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
