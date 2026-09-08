import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { MatchingEngine } from '../src/services/matching.service';
import { CommunicationService } from '../src/services/communication.service';
import { Role, LeadStatus, Priority, VehicleCategory, VehicleStatus, FollowUpType, FollowUpStatus } from '../src/types';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Automotive LMS database seed...');

  // Clear existing data safely
  await prisma.communicationLog.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.vehicleMatch.deleteMany();
  await prisma.vehicleImage.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customerRequirement.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Users across all Roles
  console.log('👤 Creating staff users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@autolms.com',
      mobile: '9800000001',
      fullName: 'System Administrator',
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@autolms.com',
      mobile: '9800000002',
      fullName: 'Rahul Sharma (Manager)',
      role: Role.MANAGER,
      passwordHash,
    },
  });

  const sales1 = await prisma.user.create({
    data: {
      email: 'sales1@autolms.com',
      mobile: '9800000003',
      fullName: 'Amit Kumar (Sales)',
      role: Role.SALES_EXECUTIVE,
      passwordHash,
    },
  });

  const sales2 = await prisma.user.create({
    data: {
      email: 'sales2@autolms.com',
      mobile: '9800000004',
      fullName: 'Priya Singh (Sales)',
      role: Role.SALES_EXECUTIVE,
      passwordHash,
    },
  });

  const field1 = await prisma.user.create({
    data: {
      email: 'field1@autolms.com',
      mobile: '9800000005',
      fullName: 'Rajesh Verma (Field Agent)',
      role: Role.FIELD_AGENT,
      passwordHash,
    },
  });

  // 2. Seed Customers
  console.log('👥 Creating customers...');
  // Customer 1: Ravi Kumar (Core Scenario 58)
  const ravi = await prisma.customer.create({
    data: {
      fullName: 'Ravi Kumar',
      primaryMobile: '9876543210',
      alternateMobile: '9876543211',
      email: 'ravi.kumar@example.com',
      location: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      preferredContact: 'WHATSAPP',
      customerType: 'INDIVIDUAL',
      source: 'WALK_IN',
      notes: 'Looking for a reliable family car and weekend off-roader.',
      createdById: sales1.id,
    },
  });

  // Customer 2: Suresh Patel
  const suresh = await prisma.customer.create({
    data: {
      fullName: 'Suresh Patel',
      primaryMobile: '9823456789',
      email: 'suresh.patel@example.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      preferredContact: 'CALL',
      customerType: 'INDIVIDUAL',
      source: 'REFERRAL',
      createdById: sales1.id,
    },
  });

  // Customer 3: Ahmed Khan
  const ahmed = await prisma.customer.create({
    data: {
      fullName: 'Ahmed Khan',
      primaryMobile: '9712345678',
      email: 'ahmed.khan@example.com',
      city: 'Hyderabad',
      state: 'Telangana',
      preferredContact: 'WHATSAPP',
      source: 'WEBSITE',
      createdById: sales2.id,
    },
  });

  // Customer 4: Fleet Logistics Owner
  const fleetCust = await prisma.customer.create({
    data: {
      fullName: 'Vikram Singh (Apex Logistics)',
      primaryMobile: '9555123456',
      email: 'fleet@apexlogistics.com',
      city: 'Pune',
      state: 'Maharashtra',
      customerType: 'FLEET_OPERATOR',
      source: 'FIELD_VISIT',
      notes: 'Expanding last-mile FMCG delivery fleet in Pune-Mumbai corridor.',
      createdById: field1.id,
    },
  });

  // 3. Seed Requirements (Customer != Requirement: Multiple Requirements per customer)
  console.log('📋 Creating customer requirements...');
  // Ravi's Requirement 1: Toyota Innova (Scenario 58)
  const raviReqInnova = await prisma.customerRequirement.create({
    data: {
      customerId: ravi.id,
      category: VehicleCategory.PASSENGER,
      status: LeadStatus.VEHICLE_SEARCHING,
      priority: Priority.HIGH,
      source: 'WALK_IN',
      assignedToId: sales1.id,
      brand: 'Toyota',
      model: 'Innova',
      minYear: 2021,
      minBudget: 1600000,
      maxBudget: 2000000,
      fuelType: 'DIESEL',
      transmission: 'ANY',
      maxKm: 75000,
      usagePurpose: 'Family Highway Travel',
      generalNotes: 'Customer prefers well-maintained Innova Crysta in Diesel.',
    },
  });

  // Ravi's Requirement 2: Mahindra Thar (Scenario 58 Step 4)
  const raviReqThar = await prisma.customerRequirement.create({
    data: {
      customerId: ravi.id,
      category: VehicleCategory.PASSENGER,
      status: LeadStatus.NEW,
      priority: Priority.MEDIUM,
      source: 'WALK_IN',
      assignedToId: sales1.id,
      brand: 'Mahindra',
      model: 'Thar',
      minBudget: 1400000,
      maxBudget: 1700000,
      fuelType: 'ANY',
      usagePurpose: 'Weekend Off-roading',
      generalNotes: 'Prefers Hard Top 4x4 variant.',
    },
  });

  // Suresh's Requirement: Hyundai Creta
  const sureshReq = await prisma.customerRequirement.create({
    data: {
      customerId: suresh.id,
      category: VehicleCategory.PASSENGER,
      status: LeadStatus.INTERESTED,
      priority: Priority.HIGH,
      source: 'REFERRAL',
      assignedToId: sales1.id,
      brand: 'Hyundai',
      model: 'Creta',
      minBudget: 1100000,
      maxBudget: 1500000,
      fuelType: 'PETROL',
      minYear: 2022,
    },
  });

  // Ahmed's Requirement: Swift CNG
  const ahmedReq = await prisma.customerRequirement.create({
    data: {
      customerId: ahmed.id,
      category: VehicleCategory.PASSENGER,
      status: LeadStatus.CONTACTED,
      priority: Priority.MEDIUM,
      source: 'WEBSITE',
      assignedToId: sales2.id,
      brand: 'Maruti',
      model: 'Swift',
      minBudget: 600000,
      maxBudget: 850000,
      fuelType: 'CNG',
    },
  });

  // Fleet Requirement 1: Commercial Mini Truck (Tata Ace)
  const fleetReqAce = await prisma.customerRequirement.create({
    data: {
      customerId: fleetCust.id,
      category: VehicleCategory.COMMERCIAL,
      commercialType: 'MINI_TRUCK',
      bodyType: 'CLOSED_CONTAINER',
      payloadCapacityKg: 750,
      status: LeadStatus.REQUIREMENT_CONFIRMED,
      priority: Priority.URGENT,
      source: 'FIELD_VISIT',
      assignedToId: field1.id,
      brand: 'Tata',
      model: 'Ace',
      minBudget: 400000,
      maxBudget: 650000,
      fuelType: 'DIESEL',
      loadRequirement: 'E-commerce and FMCG Delivery',
    },
  });

  // Fleet Requirement 2: Commercial Pickup (Ashok Leyland Dost)
  const fleetReqDost = await prisma.customerRequirement.create({
    data: {
      customerId: fleetCust.id,
      category: VehicleCategory.COMMERCIAL,
      commercialType: 'PICKUP',
      payloadCapacityKg: 1250,
      status: LeadStatus.NEW,
      priority: Priority.MEDIUM,
      source: 'FIELD_VISIT',
      assignedToId: field1.id,
      brand: 'Ashok Leyland',
      model: 'Dost',
      minBudget: 700000,
      maxBudget: 900000,
      fuelType: 'DIESEL',
    },
  });

  // 4. Seed Vehicles (Passenger + Commercial)
  console.log('🚙 Creating vehicle inventory...');
  // Vehicle 1: Toyota Innova Crysta (Matches Ravi's requirement!)
  const innovaVehicle = await prisma.vehicle.create({
    data: {
      externalVehicleId: 'EXT-TOY-001',
      registrationNumber: 'KA-01-MJ-8822',
      make: 'Toyota',
      model: 'Innova Crysta',
      variant: '2.4 VX 7 STR',
      category: VehicleCategory.PASSENGER,
      vehicleType: 'MUV',
      manufacturingYear: 2022,
      registrationYear: 2022,
      fuelType: 'DIESEL',
      transmission: 'MANUAL',
      kmDriven: 48500,
      numberOfOwners: 1,
      color: 'Garnet Red',
      price: 1750000, // ₹17.5 Lakh (Within ₹16L-₹20L)
      location: 'Bangalore Showroom',
      description: 'Single owner, full service record with Toyota authorized dealer. Mint interior condition.',
      status: VehicleStatus.AVAILABLE,
      publicVehicleUrl: 'https://marketplace.autodealer.com/inventory/toyota-innova-2022-ka01mj8822',
      externalMarketplaceUrl: 'https://marketplace.autodealer.com/cars/KA01MJ8822',
      source: 'DIRECT_INVENTORY',
    },
  });

  // Innova Primary Image
  await prisma.vehicleImage.create({
    data: {
      vehicleId: innovaVehicle.id,
      url: 'https://images.unsplash.com/photo-1590362891988-349f7e5239e3?auto=format&fit=crop&w=800&q=80',
      isPrimary: true,
      caption: 'Front Three Quarter View',
      sortOrder: 0,
    },
  });

  // Vehicle 2: Mahindra Thar (Matches Ravi's second requirement!)
  const tharVehicle = await prisma.vehicle.create({
    data: {
      externalVehicleId: 'EXT-MAH-002',
      registrationNumber: 'KA-03-NB-4411',
      make: 'Mahindra',
      model: 'Thar',
      variant: 'LX 4-Str Hard Top',
      category: VehicleCategory.PASSENGER,
      vehicleType: 'SUV',
      manufacturingYear: 2021,
      fuelType: 'PETROL',
      transmission: 'AUTOMATIC',
      kmDriven: 32000,
      numberOfOwners: 1,
      color: 'Rocky Beige',
      price: 1480000, // ₹14.8 Lakh (Within ₹14L-₹17L)
      location: 'Bangalore Showroom',
      description: 'Well-kept 4x4 Thar with off-road alloys and touchscreen infotainment.',
      status: VehicleStatus.AVAILABLE,
      publicVehicleUrl: 'https://marketplace.autodealer.com/inventory/thar-2021-ka03nb4411',
    },
  });

  await prisma.vehicleImage.create({
    data: {
      vehicleId: tharVehicle.id,
      url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
      isPrimary: true,
      caption: 'Side Profile',
    },
  });

  // Vehicle 3: Hyundai Creta
  const cretaVehicle = await prisma.vehicle.create({
    data: {
      externalVehicleId: 'EXT-HYU-003',
      registrationNumber: 'MH-02-CV-9012',
      make: 'Hyundai',
      model: 'Creta',
      variant: 'SX(O) 1.5 Turbo',
      category: VehicleCategory.PASSENGER,
      vehicleType: 'SUV',
      manufacturingYear: 2023,
      fuelType: 'PETROL',
      transmission: 'AUTOMATIC',
      kmDriven: 18400,
      numberOfOwners: 1,
      color: 'Polar White',
      price: 1420000,
      location: 'Mumbai Showroom',
      status: VehicleStatus.AVAILABLE,
    },
  });

  await prisma.vehicleImage.create({
    data: {
      vehicleId: cretaVehicle.id,
      url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=800&q=80',
      isPrimary: true,
    },
  });

  // Vehicle 4: Maruti Swift CNG
  const swiftVehicle = await prisma.vehicle.create({
    data: {
      externalVehicleId: 'EXT-MAR-004',
      registrationNumber: 'TS-09-EF-3321',
      make: 'Maruti',
      model: 'Swift',
      variant: 'VXi S-CNG',
      category: VehicleCategory.PASSENGER,
      vehicleType: 'Hatchback',
      manufacturingYear: 2022,
      fuelType: 'CNG',
      transmission: 'MANUAL',
      kmDriven: 29000,
      numberOfOwners: 1,
      color: 'Magma Grey',
      price: 685000,
      location: 'Hyderabad Stockyard',
      status: VehicleStatus.AVAILABLE,
    },
  });

  await prisma.vehicleImage.create({
    data: {
      vehicleId: swiftVehicle.id,
      url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80',
      isPrimary: true,
    },
  });

  // Vehicle 5: Commercial Tata Ace Gold (Matches Fleet requirement!)
  const tataAceVehicle = await prisma.vehicle.create({
    data: {
      externalVehicleId: 'EXT-COM-005',
      registrationNumber: 'MH-12-PQ-5544',
      make: 'Tata',
      model: 'Ace Gold',
      variant: 'Diesel High Deck',
      category: VehicleCategory.COMMERCIAL,
      vehicleType: 'MINI_TRUCK',
      bodyType: 'CLOSED_CONTAINER',
      payloadCapacityKg: 750,
      numberOfWheels: 4,
      manufacturingYear: 2022,
      fuelType: 'DIESEL',
      transmission: 'MANUAL',
      kmDriven: 41000,
      numberOfOwners: 1,
      color: 'White',
      price: 520000,
      location: 'Pune Commercial Yard',
      description: 'Single corporate fleet owner, refrigerated insulation container intact.',
      status: VehicleStatus.AVAILABLE,
    },
  });

  await prisma.vehicleImage.create({
    data: {
      vehicleId: tataAceVehicle.id,
      url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
      isPrimary: true,
      caption: 'Tata Ace Container View',
    },
  });

  // Vehicle 6: Commercial Ashok Leyland Dost+
  const dostVehicle = await prisma.vehicle.create({
    data: {
      externalVehicleId: 'EXT-COM-006',
      registrationNumber: 'MH-14-TY-8877',
      make: 'Ashok Leyland',
      model: 'Dost',
      variant: 'Dost+ Pickup',
      category: VehicleCategory.COMMERCIAL,
      vehicleType: 'PICKUP',
      bodyType: 'FLATBED',
      payloadCapacityKg: 1250,
      numberOfWheels: 4,
      manufacturingYear: 2023,
      fuelType: 'DIESEL',
      transmission: 'MANUAL',
      kmDriven: 34000,
      numberOfOwners: 1,
      color: 'Commercial White',
      price: 780000,
      location: 'Pune Commercial Yard',
      status: VehicleStatus.AVAILABLE,
    },
  });

  await prisma.vehicleImage.create({
    data: {
      vehicleId: dostVehicle.id,
      url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
      isPrimary: true,
    },
  });

  // 5. Run Matching Engine Calculation
  console.log('⚡ Running intelligent matching engine...');
  await MatchingEngine.recalculateAllMatches();

  // 6. Follow-ups
  console.log('⏰ Scheduling follow-ups...');
  const now = new Date();
  const todayFollowUpDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0, 0);
  const overdueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
  const upcomingDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // in 3 days

  // Ravi's Today follow-up (Innova Match review)
  await prisma.followUp.create({
    data: {
      requirementId: raviReqInnova.id,
      assignedToId: sales1.id,
      followUpDate: todayFollowUpDate,
      followUpType: FollowUpType.WHATSAPP,
      status: FollowUpStatus.PENDING,
      notes: 'Share newly arrived 2022 Toyota Innova Crysta photos and price with Ravi.',
    },
  });

  // Suresh's Overdue follow-up
  await prisma.followUp.create({
    data: {
      requirementId: sureshReq.id,
      assignedToId: sales1.id,
      followUpDate: overdueDate,
      followUpType: FollowUpType.CALL,
      status: FollowUpStatus.PENDING,
      notes: 'Customer had asked for call back regarding Creta test drive scheduling.',
    },
  });

  // Fleet Upcoming follow-up
  await prisma.followUp.create({
    data: {
      requirementId: fleetReqAce.id,
      assignedToId: field1.id,
      followUpDate: upcomingDate,
      followUpType: FollowUpType.VISIT,
      status: FollowUpStatus.PENDING,
      notes: 'Yard inspection of Tata Ace container truck scheduled with Fleet Manager.',
    },
  });

  // 7. Timeline Activities & Initial Outreach for Scenario
  console.log('📝 Creating activity timeline entries...');
  await prisma.leadActivity.create({
    data: {
      requirementId: raviReqInnova.id,
      performedById: sales1.id,
      activityType: 'CALL_LOGGED',
      title: 'Customer Enquiry Discussion',
      description: 'Discussed requirements with Ravi. Confirmed diesel Innova requirement under 20L.',
    },
  });

  // WhatsApp Outreach prepared for Ravi Kumar regarding the Innova
  await CommunicationService.prepareOutreach({
    vehicleId: innovaVehicle.id,
    requirementIds: [raviReqInnova.id],
    customNote: 'Very clean vehicle with single ownership in Bangalore.',
    preparedById: sales1.id,
  });

  console.log('✅ Seed completed successfully!');
  console.log('Default credentials:');
  console.log('  Admin:    admin@autolms.com / password123');
  console.log('  Manager:  manager@autolms.com / password123');
  console.log('  Sales:    sales1@autolms.com / password123');
  console.log('  Field:    field1@autolms.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
