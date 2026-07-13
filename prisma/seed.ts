import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.tariffPlan.upsert({
    where: {
      id: "draft-pea-residential-normal",
    },
    update: {},
    create: {
      id: "draft-pea-residential-normal",
      authority: "PEA",
      customerSegment: "RESIDENTIAL",
      meterMode: "NORMAL",
      name: "PEA Residential Normal - Draft metadata only",
      versions: {
        create: {
          status: "DRAFT",
          versionLabel: "draft-template",
          effectiveFrom: new Date("2026-01-01T00:00:00+07:00"),
          authority: "PEA",
          sourceUrl: null,
          verifiedAt: null,
          verifiedBy: null,
          notes:
            "Template only. Do not use for production calculation until official rates are verified.",
          tariffSnapshot: {
            status: "draft",
            ratesIncluded: false,
            reason: "No tariff numbers are guessed in seed data.",
          },
        },
      },
    },
  });

  await prisma.tariffPlan.upsert({
    where: {
      id: "demo-pea-residential-normal-phase2",
    },
    update: {},
    create: {
      id: "demo-pea-residential-normal-phase2",
      authority: "PEA",
      customerSegment: "RESIDENTIAL",
      meterMode: "NORMAL",
      name: "Demo Residential Normal - Draft synthetic rates",
      versions: {
        create: {
          id: "demo-pea-residential-normal-2026-draft",
          status: "DRAFT",
          versionLabel: "demo-normal-draft-2026",
          effectiveFrom: new Date("2026-01-01T00:00:00+07:00"),
          authority: "PEA",
          sourceUrl:
            "https://example.com/thai-energy-planner/demo-tariff-not-real",
          verifiedAt: null,
          verifiedBy: null,
          notes:
            "Synthetic demo rates for Tariff Engine tests only. Not official PEA or MEA tariff data.",
          serviceChargeThb: "10",
          tariffSnapshot: {
            status: "draft",
            ratesIncluded: true,
            official: false,
            warning: "Synthetic demo rates only.",
          },
          energyRateTiers: {
            create: [
              {
                fromKwh: "0",
                toKwh: "100",
                rateThbPerKwh: "1.00",
                sortOrder: 1,
              },
              {
                fromKwh: "100",
                toKwh: "200",
                rateThbPerKwh: "2.00",
                sortOrder: 2,
              },
              {
                fromKwh: "200",
                toKwh: null,
                rateThbPerKwh: "3.00",
                sortOrder: 3,
              },
            ],
          },
          ftPeriods: {
            create: [
              {
                effectiveFrom: new Date("2026-01-01T00:00:00+07:00"),
                ftThbPerKwh: "0.50",
                sourceUrl:
                  "https://example.com/thai-energy-planner/demo-tariff-not-real",
              },
            ],
          },
          taxRates: {
            create: [
              {
                name: "Demo VAT",
                ratePercent: "7",
                effectiveFrom: new Date("2026-01-01T00:00:00+07:00"),
              },
            ],
          },
        },
      },
    },
  });

  await prisma.tariffPlan.upsert({
    where: {
      id: "demo-pea-residential-tou-phase2",
    },
    update: {},
    create: {
      id: "demo-pea-residential-tou-phase2",
      authority: "PEA",
      customerSegment: "RESIDENTIAL",
      meterMode: "TOU",
      name: "Demo Residential TOU - Draft synthetic rates",
      versions: {
        create: {
          id: "demo-pea-residential-tou-2026-draft",
          status: "DRAFT",
          versionLabel: "demo-tou-draft-2026",
          effectiveFrom: new Date("2026-01-01T00:00:00+07:00"),
          authority: "PEA",
          sourceUrl:
            "https://example.com/thai-energy-planner/demo-tariff-not-real",
          verifiedAt: null,
          verifiedBy: null,
          notes:
            "Synthetic demo TOU rates for Tariff Engine tests only. Not official PEA or MEA tariff data.",
          serviceChargeThb: "10",
          tariffSnapshot: {
            status: "draft",
            ratesIncluded: true,
            official: false,
            warning: "Synthetic demo rates only.",
          },
          touPeriods: {
            create: [
              {
                label: "Demo Peak Weekday",
                periodType: "peak",
                startTime: "09:00",
                endTime: "22:00",
                daysOfWeek: [1, 2, 3, 4, 5],
                includesHoliday: false,
                rateThbPerKwh: "5.00",
              },
              {
                label: "Demo Off-Peak Weekend",
                periodType: "off_peak",
                startTime: "00:00",
                endTime: "24:00",
                daysOfWeek: [0, 6],
                includesHoliday: false,
                rateThbPerKwh: "2.00",
              },
              {
                label: "Demo Off-Peak Holiday",
                periodType: "off_peak",
                startTime: "00:00",
                endTime: "24:00",
                daysOfWeek: [],
                includesHoliday: true,
                rateThbPerKwh: "2.00",
              },
            ],
          },
          ftPeriods: {
            create: [
              {
                effectiveFrom: new Date("2026-01-01T00:00:00+07:00"),
                ftThbPerKwh: "0.50",
                sourceUrl:
                  "https://example.com/thai-energy-planner/demo-tariff-not-real",
              },
            ],
          },
          taxRates: {
            create: [
              {
                name: "Demo VAT",
                ratePercent: "7",
                effectiveFrom: new Date("2026-01-01T00:00:00+07:00"),
              },
            ],
          },
        },
      },
    },
  });

  await prisma.incentivePolicy.upsert({
    where: {
      id: "demo-solar-export-policy-phase5-draft",
    },
    update: {},
    create: {
      id: "demo-solar-export-policy-phase5-draft",
      name: "Demo solar export policy - draft synthetic value",
      status: "draft",
      valueType: "thb_per_kwh",
      value: "0.80",
      sourceUrl: null,
      authority: "Thai Energy Planner demo",
      effectiveFrom: new Date("2026-01-01T00:00:00+07:00"),
      verifiedAt: null,
      notes:
        "Synthetic demo export value for Phase 5 UI and tests only. Not an official feed-in tariff.",
    },
  });

  await prisma.solarScenario.upsert({
    where: {
      id: "demo-solar-phase5-evening-home",
    },
    update: {},
    create: {
      id: "demo-solar-phase5-evening-home",
      scenarioName: "Demo Solar A - evening-heavy home",
      systemSizeKwp: "5",
      panelWatt: "550",
      numberOfPanels: 10,
      inverterSizeKw: "5",
      roofAreaSqm: "30",
      roofAzimuth: "180",
      roofTilt: "12",
      province: "Bangkok demo",
      systemLossPercent: "12",
      shadingLossPercent: "8",
      degradationPercentPerYear: "0.5",
      capex: "210000",
      oAndMCostPerYear: "2100",
      inverterReplacementCost: "27500",
      inverterReplacementYear: 10,
      projectLifeYears: 20,
      exportEnabled: true,
      exportRate: "0.80",
      exportLimitKw: "10",
      installCostThb: "210000",
      assumptions: {
        status: "demo",
        sourceUrl: null,
        notes:
          "Synthetic Phase 5 solar scenario. Replace with verified site, irradiance, CAPEX, and policy data before production use.",
      },
      assumptionsSnapshot: {
        engineVersion: "0.5.0-solar-finance",
        tariffData: "draft demo tariffs from Phase 2",
        exportPolicyId: "demo-solar-export-policy-phase5-draft",
      },
      tariffSnapshot: {
        status: "draft",
        ratesIncluded: false,
        note: "Solar seed does not embed official tariff rates.",
      },
      systemConfig: {
        create: {
          systemSizeKwp: "5",
          panelWatt: "550",
          numberOfPanels: 10,
          inverterSizeKw: "5",
          roofAreaSqm: "30",
          roofAzimuth: "180",
          roofTilt: "12",
          systemLossPercent: "12",
          shadingLossPercent: "8",
          degradationPercentPerYear: "0.5",
          exportEnabled: true,
          exportRate: "0.80",
          exportLimitKw: "10",
        },
      },
      generationProfiles: {
        create: {
          name: "Demo approximate monthly yield - draft",
          method: "approximate_yield",
          status: "demo",
          sourceUrl: null,
          province: "Bangkok demo",
          intervalMinutes: 60,
          annualGenerationKwh: "5936",
          monthlyGeneration: {
            monthlySpecificYieldKwhPerKwp: [
              112, 118, 126, 124, 118, 108, 104, 106, 110, 112, 108, 106,
            ],
            status: "demo",
            notes:
              "Synthetic monthly yield values; not verified irradiance data.",
          },
          assumptions: {
            systemLossPercent: 12,
            shadingLossPercent: 8,
            degradationPercentPerYear: 0.5,
          },
        },
      },
    },
  });

  await prisma.batteryScenario.upsert({
    where: {
      id: "demo-battery-phase6-export-home",
    },
    update: {},
    create: {
      id: "demo-battery-phase6-export-home",
      capacityKwh: "10",
      usableCapacityKwh: "9",
      minSocPercent: "10",
      maxSocPercent: "95",
      initialSocPercent: "40",
      chargePowerKw: "5",
      dischargePowerKw: "5",
      roundTripEfficiency: "0.9025",
      controlMode: "HYBRID",
      assumptions: {
        status: "demo",
        scenarioName: "Battery Demo A - solar export available",
        sourceUrl: null,
        authority: "Thai Energy Planner demo",
        notes:
          "Synthetic Phase 6 storage scenario. Equipment costs and performance are demo placeholders only.",
      },
      config: {
        create: {
          capacityKwh: "10",
          usableCapacityKwh: "9",
          initialSocPercent: "40",
          minSocPercent: "10",
          maxSocPercent: "95",
          chargePowerKw: "5",
          dischargePowerKw: "5",
          chargeEfficiency: "0.95",
          dischargeEfficiency: "0.95",
          roundTripEfficiency: "0.9025",
          degradationPercentPerYear: "2",
          cycleLife: 5000,
          capexThb: "320000",
          oAndMCostPerYear: "3200",
          replacementCostThb: "160000",
          replacementYear: 10,
          backupReservePercent: "20",
          dispatchStrategy: "HYBRID",
          sourceStatus: "demo",
          sourceUrl: null,
          notes:
            "Demo/draft battery cost. Replace with verified vendor quote before production analysis.",
        },
      },
    },
  });

  await prisma.batteryScenario.upsert({
    where: {
      id: "demo-battery-phase6-low-export-home",
    },
    update: {},
    create: {
      id: "demo-battery-phase6-low-export-home",
      capacityKwh: "5",
      usableCapacityKwh: "4.5",
      minSocPercent: "10",
      maxSocPercent: "95",
      initialSocPercent: "40",
      chargePowerKw: "5",
      dischargePowerKw: "5",
      roundTripEfficiency: "0.9025",
      controlMode: "BACKUP_RESERVE",
      assumptions: {
        status: "demo",
        scenarioName: "Battery Demo B - limited solar export",
        sourceUrl: null,
        authority: "Thai Energy Planner demo",
        notes:
          "Synthetic Phase 6 storage scenario for non-viable financial recommendation tests.",
      },
      config: {
        create: {
          capacityKwh: "5",
          usableCapacityKwh: "4.5",
          initialSocPercent: "40",
          minSocPercent: "10",
          maxSocPercent: "95",
          chargePowerKw: "5",
          dischargePowerKw: "5",
          chargeEfficiency: "0.95",
          dischargeEfficiency: "0.95",
          roundTripEfficiency: "0.9025",
          degradationPercentPerYear: "2",
          cycleLife: 5000,
          capexThb: "180000",
          oAndMCostPerYear: "1800",
          replacementCostThb: "90000",
          replacementYear: 10,
          backupReservePercent: "20",
          dispatchStrategy: "BACKUP_RESERVE",
          sourceStatus: "demo",
          sourceUrl: null,
          notes:
            "Demo/draft battery cost. Replace with verified vendor quote before production analysis.",
        },
      },
    },
  });

  for (const evDemo of [
    {
      id: "demo-ev-phase6-evening-immediate",
      strategy: "CHARGE_IMMEDIATELY",
      name: "EV Demo A - evening immediate charging",
    },
    {
      id: "demo-ev-phase6-off-peak",
      strategy: "OFF_PEAK",
      name: "EV Demo B - off-peak charging",
    },
    {
      id: "demo-ev-phase6-solar-surplus",
      strategy: "SOLAR_SURPLUS",
      name: "EV Demo C - solar surplus charging",
    },
  ]) {
    await prisma.evScenario.upsert({
      where: {
        id: evDemo.id,
      },
      update: {},
      create: {
        id: evDemo.id,
        dailyDistanceKm: "45",
        efficiencyKmPerKwh: "6",
        vehicleBatteryKwh: "60",
        chargerPowerKw: "7",
        arrivalTime: evDemo.strategy === "SOLAR_SURPLUS" ? "09:00" : "18:00",
        departureTime: evDemo.strategy === "SOLAR_SURPLUS" ? "16:00" : "07:00",
        travelDaysPerWeek: 5,
        targetSocPercent: "80",
        chargingStrategy: evDemo.strategy,
        assumptions: {
          status: "demo",
          scenarioName: evDemo.name,
          sourceUrl: null,
          authority: "Thai Energy Planner demo",
          notes:
            "Synthetic Phase 6 EV charging scenario. Vehicle and charger costs are demo placeholders only.",
        },
        config: {
          create: {
            vehicleName: "Demo EV",
            batteryCapacityKwh: "60",
            efficiencyKmPerKwh: "6",
            dailyDistanceKm: "45",
            weeklyDrivingDays: 5,
            chargerPowerKw: "7",
            chargerEfficiency: "0.90",
            arrivalTime:
              evDemo.strategy === "SOLAR_SURPLUS" ? "09:00" : "18:00",
            departureTime:
              evDemo.strategy === "SOLAR_SURPLUS" ? "16:00" : "07:00",
            targetSocPercent: "80",
            initialSocPercent: "40",
            minSocPercent: "20",
            chargingDays: [1, 2, 3, 4, 5],
            outsideChargingCostPerKwh: "8",
            allowSolarCharging: true,
            allowOffPeakCharging: true,
            allowSmartCharging: true,
            sourceStatus: "demo",
            sourceUrl: null,
            notes:
              "Demo/draft EV and charger inputs. Replace with verified vehicle and charger data before production analysis.",
          },
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
