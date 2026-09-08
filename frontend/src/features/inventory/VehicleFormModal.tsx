import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Car, Truck, Upload, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { VehicleCategory, VehicleStatus } from '../../types';
import { parseRupeesOrLakhs, formatCurrencyPreview, formatLakhs } from '../../utils/formatters';

const schema = z.object({
  make: z.string().min(1, 'Make / Brand is required (e.g. Toyota, Hyundai, Tata)'),
  model: z.string().min(1, 'Vehicle Model is required (e.g. Innova, Creta, Nexon, Ace)'),
  variant: z.string().optional(),
  category: z.nativeEnum(VehicleCategory).default(VehicleCategory.PASSENGER),
  vehicleType: z.string().optional(),
  priceInput: z
    .string()
    .min(1, 'Selling price is required')
    .refine((val) => parseRupeesOrLakhs(val) !== null, 'Please enter a valid price (e.g. 14 for 14 Lakhs or 1400000)'),
  manufacturingYear: z
    .number({ invalid_type_error: 'Manufacturing year is required' })
    .int()
    .min(1990, 'Year must be 1990 or newer')
    .max(2035, 'Invalid year'),
  fuelType: z.string().min(1, 'Fuel type is required'),
  transmission: z.string().optional(),
  kmDriven: z
    .number({ invalid_type_error: 'KM driven is required' })
    .int()
    .nonnegative('KM driven must be 0 or greater'),
  numberOfOwners: z.number().int().positive().default(1),
  color: z.string().optional(),
  location: z.string().min(1, 'Location / Yard / Showroom is required'),
  description: z.string().optional(),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
  registrationNumber: z.string().optional(),
  externalVehicleId: z.string().optional(),
  publicVehicleUrl: z.string().optional(),

  // Commercial attributes
  bodyType: z.string().optional(),
  payloadCapacityKg: z.number().optional(),
  numberOfWheels: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicle: any) => void;
  initialData?: any;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>(
    initialData?.category || VehicleCategory.PASSENGER
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(initialData?.images?.[0]?.url || '');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

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
      status: VehicleStatus.AVAILABLE,
      numberOfOwners: 1,
      priceInput: '',
    },
  });

  const watchedPrice = watch('priceInput');

  useEffect(() => {
    if (initialData) {
      setSelectedCategory(initialData.category || VehicleCategory.PASSENGER);
      reset({
        make: initialData.make || '',
        model: initialData.model || '',
        variant: initialData.variant || '',
        category: initialData.category || VehicleCategory.PASSENGER,
        vehicleType: initialData.vehicleType || '',
        priceInput: initialData.price ? (initialData.price / 100000).toString() : '',
        manufacturingYear: initialData.manufacturingYear || new Date().getFullYear(),
        fuelType: initialData.fuelType || 'DIESEL',
        transmission: initialData.transmission || 'MANUAL',
        kmDriven: initialData.kmDriven || 0,
        numberOfOwners: initialData.numberOfOwners || 1,
        color: initialData.color || '',
        location: initialData.location || '',
        description: initialData.description || '',
        status: initialData.status || VehicleStatus.AVAILABLE,
        registrationNumber: initialData.registrationNumber || '',
        externalVehicleId: initialData.externalVehicleId || '',
        publicVehicleUrl: initialData.publicVehicleUrl || '',
        bodyType: initialData.bodyType || '',
        payloadCapacityKg: initialData.payloadCapacityKg || undefined,
        numberOfWheels: initialData.numberOfWheels || undefined,
      });
      setImageUrl(initialData.images?.[0]?.url || '');
    } else {
      setSelectedCategory(VehicleCategory.PASSENGER);
      reset({
        make: '',
        model: '',
        variant: '',
        category: VehicleCategory.PASSENGER,
        vehicleType: '',
        priceInput: '',
        manufacturingYear: new Date().getFullYear(),
        fuelType: 'DIESEL',
        transmission: 'MANUAL',
        kmDriven: 0,
        numberOfOwners: 1,
        color: '',
        location: '',
        description: '',
        status: VehicleStatus.AVAILABLE,
        registrationNumber: '',
        externalVehicleId: '',
        publicVehicleUrl: '',
        bodyType: '',
        payloadCapacityKg: undefined,
        numberOfWheels: undefined,
      });
      setImageUrl('');
    }
  }, [initialData, reset, isOpen]);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const parsedPrice = parseRupeesOrLakhs(data.priceInput);

      const payload: any = {
        make: data.make.trim(),
        model: data.model.trim(),
        variant: data.variant?.trim() || null,
        category: selectedCategory,
        vehicleType: data.vehicleType?.trim() || null,
        price: parsedPrice,
        manufacturingYear: Number(data.manufacturingYear),
        fuelType: data.fuelType,
        transmission: data.transmission?.trim() || null,
        kmDriven: Number(data.kmDriven),
        numberOfOwners: Number(data.numberOfOwners) || 1,
        color: data.color?.trim() || null,
        location: data.location.trim(),
        description: data.description?.trim() || null,
        status: data.status,
        registrationNumber: data.registrationNumber?.trim() || null,
        externalVehicleId: data.externalVehicleId?.trim() || null,
        publicVehicleUrl: data.publicVehicleUrl?.trim() || null,
        bodyType: data.bodyType?.trim() || null,
        payloadCapacityKg: data.payloadCapacityKg ? Number(data.payloadCapacityKg) : null,
        numberOfWheels: data.numberOfWheels ? Number(data.numberOfWheels) : null,
      };

      let vehicle;
      if (initialData) {
        const res: any = await api.put(`/vehicles/${initialData.id}`, payload);
        vehicle = res.data;
      } else {
        const res: any = await api.post('/vehicles', payload);
        vehicle = res.data;
      }

      // If files selected, upload them
      if (selectedFiles && selectedFiles.length > 0) {
        const formData = new FormData();
        Array.from(selectedFiles).forEach((file) => {
          formData.append('images', file);
        });
        await api.post(`/vehicles/${vehicle.id}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (imageUrl.trim()) {
        await api.post(`/vehicles/${vehicle.id}/image-url`, {
          url: imageUrl.trim(),
          isPrimary: true,
        });
      }

      onSuccess(vehicle);
      onClose();
    } catch (err: any) {
      setServerError(err.message || 'Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Inventory Vehicle' : 'Add Vehicle to Inventory'}
      subtitle="Automated matching with active buyer leads will trigger on save"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {serverError && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Category Selector */}
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
              className={`flex items-center justify-center gap-2 p-2.5 rounded-md border font-semibold text-xs transition-colors ${
                selectedCategory === VehicleCategory.PASSENGER
                  ? 'bg-slate-900 border-slate-900 text-white shadow-subtle'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Passenger Vehicle</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCategory(VehicleCategory.COMMERCIAL);
                setValue('category', VehicleCategory.COMMERCIAL);
              }}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-md border font-semibold text-xs transition-colors ${
                selectedCategory === VehicleCategory.COMMERCIAL
                  ? 'bg-slate-900 border-slate-900 text-white shadow-subtle'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Commercial Vehicle</span>
            </button>
          </div>
        </div>

        {/* Make, Model, Variant */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Make / Brand"
            placeholder="e.g. Toyota, Hyundai, Tata"
            required
            error={errors.make?.message}
            {...register('make')}
          />

          <Input
            label="Model"
            placeholder="e.g. Innova Crysta, Creta, Nexon"
            required
            error={errors.model?.message}
            {...register('model')}
          />

          <Input
            label="Variant / Trim"
            placeholder="e.g. 2.4 VX 7 STR, SX(O)"
            {...register('variant')}
          />
        </div>

        {/* Price, Year, KM */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Input
              label="Selling Price"
              type="text"
              placeholder="e.g. 17.5 or 1750000"
              required
              error={errors.priceInput?.message}
              {...register('priceInput')}
            />
            {watchedPrice && formatCurrencyPreview(watchedPrice) && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{formatCurrencyPreview(watchedPrice)}</span>
              </div>
            )}
          </div>

          <Input
            label="Manufacturing Year"
            type="number"
            required
            error={errors.manufacturingYear?.message}
            {...register('manufacturingYear', { valueAsNumber: true })}
          />

          <Input
            label="KM Driven"
            type="number"
            placeholder="e.g. 48000"
            required
            error={errors.kmDriven?.message}
            {...register('kmDriven', { valueAsNumber: true })}
          />
        </div>

        {/* Fuel, Trans, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select label="Fuel Type" required error={errors.fuelType?.message} {...register('fuelType')}>
            <option value="DIESEL">Diesel</option>
            <option value="PETROL">Petrol</option>
            <option value="CNG">CNG</option>
            <option value="ELECTRIC">Electric</option>
            <option value="HYBRID">Hybrid</option>
          </Select>

          <Select label="Transmission" {...register('transmission')}>
            <option value="MANUAL">Manual</option>
            <option value="AUTOMATIC">Automatic</option>
          </Select>

          <Select label="Inventory Status" {...register('status')}>
            <option value="AVAILABLE">Available for Sale</option>
            <option value="RESERVED">Reserved</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="SOLD">Sold</option>
            <option value="UNDER_INSPECTION">Under Inspection</option>
          </Select>
        </div>

        {/* Commercial or Passenger specific */}
        {selectedCategory === VehicleCategory.COMMERCIAL ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Commercial Type" {...register('vehicleType')}>
              <option value="MINI_TRUCK">Mini Truck</option>
              <option value="PICKUP">Pickup</option>
              <option value="LCV">Light Commercial (LCV)</option>
              <option value="HCV">Heavy Commercial (HCV)</option>
              <option value="BUS">Bus / Van</option>
            </Select>

            <Select label="Body Type" {...register('bodyType')}>
              <option value="CLOSED_CONTAINER">Closed Container</option>
              <option value="OPEN_CONTAINER">Open High Deck</option>
              <option value="FLATBED">Flatbed</option>
              <option value="INSULATED">Insulated</option>
            </Select>

            <Input
              label="Payload Capacity (KG)"
              type="number"
              placeholder="e.g. 750 or 1250"
              {...register('payloadCapacityKg', { valueAsNumber: true })}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Body / Type"
              placeholder="e.g. SUV, Sedan, MUV, Hatchback"
              {...register('vehicleType')}
            />

            <Input
              label="Color"
              placeholder="e.g. Garnet Red, White"
              {...register('color')}
            />

            <Input
              label="No. of Owners"
              type="number"
              defaultValue={1}
              {...register('numberOfOwners', { valueAsNumber: true })}
            />
          </div>
        )}

        {/* Registration & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Registration Number"
            placeholder="e.g. KA-01-MJ-8822"
            {...register('registrationNumber')}
          />

          <Input
            label="Location / Yard / Showroom"
            placeholder="e.g. Bangalore Showroom"
            required
            error={errors.location?.message}
            {...register('location')}
          />
        </div>

        {/* Marketplace & Image Uploads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Primary Image URL"
            placeholder="https://images.unsplash.com/..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Upload Image Files
            </label>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
            />
          </div>
        </div>

        <div>
          <Input
            label="Public Vehicle Listing URL (For WhatsApp Sharing)"
            placeholder="https://marketplace.autodealer.com/inventory/..."
            {...register('publicVehicleUrl')}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Vehicle Condition Description
          </label>
          <textarea
            rows={2}
            className="w-full bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Single owner, full service record, brand new tyres..."
            {...register('description')}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            {initialData ? 'Update Vehicle' : 'Save Vehicle'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
