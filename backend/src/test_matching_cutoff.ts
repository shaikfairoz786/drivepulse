import prisma from './prisma';
import { MatchingEngine } from './services/matching.service';
import { VehicleCategory, LeadStatus, Priority } from './types';

async function runTests() {
  console.log('====================================================');
  console.log(' AUTOMATED TEST SUITE: STRICT 50% MATCH SCORE CUTOFF');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   ℹ️  ${detail}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   ⚠️  ${detail}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Database Audit - No matches < 50% in database
    // ----------------------------------------------------
    console.log('--- TEST 1: Database Audit for Sub-50 Matches ---');
    const staleSub50Count = await prisma.vehicleMatch.count({
      where: { matchScore: { lt: 50 } },
    });
    console.log(`Current matches in DB with score < 50: ${staleSub50Count}`);
    if (staleSub50Count > 0) {
      console.log(`Purging ${staleSub50Count} obsolete sub-50 matches...`);
      await prisma.vehicleMatch.deleteMany({
        where: { matchScore: { lt: 50 } },
      });
    }
    const verifiedSub50Count = await prisma.vehicleMatch.count({
      where: { matchScore: { lt: 50 } },
    });
    assert(verifiedSub50Count === 0, 'Database contains zero matches with matchScore < 50%');

    // ----------------------------------------------------
    // TEST 2: Low-Affinity Lead Creation
    // (A requirement completely mismatched with showroom stock)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Low-Affinity Requirement Creation (< 50%) ---');
    const testCustomerLow = await prisma.customer.create({
      data: {
        fullName: '__TEST_LOW_AFFINITY_BUYER__',
        primaryMobile: '9999900001',
        email: 'testlow@example.com',
        city: 'Mumbai',
        source: 'DIRECT_WEB',
      },
    });

    const lowAffinityReq = await prisma.customerRequirement.create({
      data: {
        customerId: testCustomerLow.id,
        category: VehicleCategory.PASSENGER,
        status: LeadStatus.NEW,
        priority: Priority.HIGH,
        brand: 'Ferrari',
        model: 'SF90 Stradale',
        minBudget: 40000000, // 4 Crore
        maxBudget: 60000000, // 6 Crore
        minYear: 2024,
        maxYear: 2026,
        fuelType: 'HYBRID',
      },
    });

    const matchCountLow = await MatchingEngine.matchRequirementAgainstInventory(lowAffinityReq.id);
    assert(matchCountLow === 0, 'MatchingEngine generated 0 matches for low-affinity requirement', `Generated count: ${matchCountLow}`);

    const dbMatchesLow = await prisma.vehicleMatch.findMany({
      where: { requirementId: lowAffinityReq.id },
    });
    assert(dbMatchesLow.length === 0, 'Database has 0 VehicleMatch records for low-affinity requirement');

    // ----------------------------------------------------
    // TEST 3: High-Affinity Lead Creation
    // (A requirement matching an existing showroom car)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: High-Affinity Requirement Creation (>= 50%) ---');
    const targetVehicle = await prisma.vehicle.findFirst({
      where: { status: 'AVAILABLE' },
    });

    if (!targetVehicle) {
      throw new Error('No available vehicle found in database to test high affinity matching.');
    }

    console.log(`Targeting stock car: ${targetVehicle.make} ${targetVehicle.model} (${targetVehicle.manufacturingYear}) @ ₹${(targetVehicle.price / 100000).toFixed(1)}L`);

    const testCustomerHigh = await prisma.customer.create({
      data: {
        fullName: '__TEST_HIGH_AFFINITY_BUYER__',
        primaryMobile: '9999900002',
        email: 'testhigh@example.com',
        city: 'Hyderabad',
        source: 'WALK_IN',
      },
    });

    const highAffinityReq = await prisma.customerRequirement.create({
      data: {
        customerId: testCustomerHigh.id,
        category: targetVehicle.category,
        status: LeadStatus.NEW,
        priority: Priority.HIGH,
        brand: targetVehicle.make,
        model: targetVehicle.model,
        minBudget: targetVehicle.price * 0.90,
        maxBudget: targetVehicle.price * 1.10,
        fuelType: targetVehicle.fuelType,
        minYear: targetVehicle.manufacturingYear - 1,
        maxYear: targetVehicle.manufacturingYear + 1,
      },
    });

    const matchCountHigh = await MatchingEngine.matchRequirementAgainstInventory(highAffinityReq.id);
    assert(matchCountHigh >= 1, 'MatchingEngine generated matches for high-affinity requirement', `Generated count: ${matchCountHigh}`);

    const dbMatchesHigh = await prisma.vehicleMatch.findMany({
      where: { requirementId: highAffinityReq.id },
    });
    assert(dbMatchesHigh.length >= 1, `Database persisted ${dbMatchesHigh.length} matches`);

    const allAbove50 = dbMatchesHigh.every((m) => m.matchScore >= 50);
    assert(allAbove50, 'All generated matches have matchScore >= 50%', `Lowest score found: ${Math.min(...dbMatchesHigh.map((m) => m.matchScore))}%`);

    // ----------------------------------------------------
    // TEST 4: Core Compatibility Gate Unit Evaluation
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Core Compatibility Gate Unit Evaluation ---');
    const mockMismatchedReq = {
      category: VehicleCategory.PASSENGER,
      brand: 'Maruti Suzuki',
      model: 'Swift',
      minBudget: 500000,
      maxBudget: 700000,
      fuelType: 'PETROL',
      minYear: 2020,
    };

    const mockMismatchedVehicle = {
      category: VehicleCategory.PASSENGER,
      make: 'Tata',
      model: 'Harrier',
      price: 1900000,
      fuelType: 'DIESEL',
      manufacturingYear: 2023,
      kmDriven: 35000,
    };

    const evalResult = MatchingEngine.evaluateMatch(mockMismatchedReq, mockMismatchedVehicle);
    console.log(`Evaluated Mismatched Vehicle Score: ${evalResult.score}%, isEligible: ${evalResult.isEligible}`);
    assert(evalResult.score < 50, `Score is capped strictly < 50% (Actual: ${evalResult.score}%)`);
    assert(evalResult.isEligible === false, 'isEligible is strictly false');

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log('\n--- Cleaning up temporary test records ---');
    await prisma.vehicleMatch.deleteMany({
      where: { requirementId: { in: [lowAffinityReq.id, highAffinityReq.id] } },
    });
    await prisma.customerRequirement.deleteMany({
      where: { id: { in: [lowAffinityReq.id, highAffinityReq.id] } },
    });
    await prisma.customer.deleteMany({
      where: { id: { in: [testCustomerLow.id, testCustomerHigh.id] } },
    });
    console.log('Cleanup completed cleanly.');

    console.log('\n====================================================');
    console.log(` SUMMARY: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('====================================================');
  } catch (err) {
    console.error('Test run encountered an error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
