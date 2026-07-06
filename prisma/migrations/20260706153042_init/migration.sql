-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TariffStatus" AS ENUM ('DRAFT', 'VERIFIED', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "Authority" AS ENUM ('PEA', 'MEA');

-- CreateEnum
CREATE TYPE "CustomerSegment" AS ENUM ('RESIDENTIAL', 'SMALL_BUSINESS', 'MEDIUM_BUSINESS', 'LARGE_BUSINESS');

-- CreateEnum
CREATE TYPE "MeterMode" AS ENUM ('NORMAL', 'TOU');

-- CreateEnum
CREATE TYPE "LoadSource" AS ENUM ('BILL', 'CSV', 'XLSX', 'APPLIANCE', 'DEMO');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('DRAFT', 'PREVIEWED', 'IMPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportIssueSeverity" AS ENUM ('WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "ScenarioKind" AS ENUM ('CURRENT_NORMAL', 'CURRENT_TOU', 'SWITCH_TO_TOU_NO_BEHAVIOR_CHANGE', 'LOAD_SHIFT_TO_OFF_PEAK', 'CUSTOM_LOAD_SHIFT', 'BASELINE_NORMAL', 'TOU_NO_SHIFT', 'TOU_LOAD_SHIFT', 'NORMAL_SOLAR', 'TOU_SOLAR', 'SOLAR_BATTERY', 'TOU_SOLAR_BATTERY', 'EV_CURRENT_CHARGING', 'EV_OFF_PEAK_CHARGING');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'CSV', 'JSON', 'PRINT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "province" TEXT,
    "customerSegment" "CustomerSegment" NOT NULL DEFAULT 'RESIDENTIAL',
    "authority" "Authority",
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meter" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authority" "Authority" NOT NULL,
    "mode" "MeterMode" NOT NULL DEFAULT 'NORMAL',
    "meterSize" TEXT,
    "voltage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricityBill" (
    "id" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "billMonth" TIMESTAMP(3) NOT NULL,
    "energyKwh" DECIMAL(14,4) NOT NULL,
    "totalCostThb" DECIMAL(14,4) NOT NULL,
    "ftThbPerKwh" DECIMAL(10,6),
    "serviceCharge" DECIMAL(12,4),
    "vatThb" DECIMAL(12,4),
    "rawBillData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectricityBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadProfile" (
    "id" TEXT NOT NULL,
    "meterId" TEXT,
    "name" TEXT NOT NULL,
    "source" "LoadSource" NOT NULL,
    "intervalMinutes" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "qualityScore" INTEGER,
    "validationSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadInterval" (
    "id" TEXT NOT NULL,
    "loadProfileId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "energyKwh" DECIMAL(14,6) NOT NULL,
    "powerKw" DECIMAL(14,6),
    "voltage" DECIMAL(10,4),
    "powerFactor" DECIMAL(6,5),
    "metadata" JSONB,

    CONSTRAINT "LoadInterval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appliance" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "powerWatt" DECIMAL(12,4) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "loadFactor" DECIMAL(6,5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplianceSchedule" (
    "id" TEXT NOT NULL,
    "applianceId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "workingDayOnly" BOOLEAN NOT NULL DEFAULT false,
    "holidayOnly" BOOLEAN NOT NULL DEFAULT false,
    "seasonalMonths" INTEGER[],
    "hoursPerDay" DECIMAL(6,2),
    "daysPerWeek" DECIMAL(6,2),

    CONSTRAINT "ApplianceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "loadProfileId" TEXT,
    "source" "LoadSource" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'DRAFT',
    "originalFileName" TEXT,
    "fileMimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "intervalMinutes" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "columnMapping" JSONB NOT NULL,
    "previewSummary" JSONB,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "importedRowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportValidationIssue" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "severity" "ImportIssueSeverity" NOT NULL,
    "code" TEXT NOT NULL,
    "messageTh" TEXT NOT NULL,
    "rowNumber" INTEGER,
    "field" TEXT,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportValidationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffPlan" (
    "id" TEXT NOT NULL,
    "authority" "Authority" NOT NULL,
    "customerSegment" "CustomerSegment" NOT NULL,
    "meterMode" "MeterMode" NOT NULL,
    "voltageLevel" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TariffPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffVersion" (
    "id" TEXT NOT NULL,
    "tariffPlanId" TEXT NOT NULL,
    "status" "TariffStatus" NOT NULL DEFAULT 'DRAFT',
    "versionLabel" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "authority" "Authority" NOT NULL,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "notes" TEXT,
    "serviceChargeThb" DECIMAL(12,4),
    "roundingPolicy" JSONB,
    "tariffSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TariffVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyRateTier" (
    "id" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "fromKwh" DECIMAL(14,4) NOT NULL,
    "toKwh" DECIMAL(14,4),
    "rateThbPerKwh" DECIMAL(12,6) NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "EnergyRateTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TouPeriod" (
    "id" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "periodType" TEXT NOT NULL DEFAULT 'off_peak',
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "includesHoliday" BOOLEAN NOT NULL DEFAULT false,
    "rateThbPerKwh" DECIMAL(12,6) NOT NULL,

    CONSTRAINT "TouPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandRate" (
    "id" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rateThbPerKw" DECIMAL(12,6) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "daysOfWeek" INTEGER[],

    CONSTRAINT "DemandRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FtPeriod" (
    "id" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "ftThbPerKwh" DECIMAL(12,6) NOT NULL,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "FtPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ratePercent" DECIMAL(8,5) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "isSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "authority" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyIncentive" (
    "id" TEXT NOT NULL,
    "tariffVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "value" DECIMAL(14,6),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "PolicyIncentive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarProfile" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT NOT NULL,
    "province" TEXT,
    "method" TEXT NOT NULL,
    "intervalMinutes" INTEGER,
    "assumptions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolarProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarScenario" (
    "id" TEXT NOT NULL,
    "solarProfileId" TEXT,
    "analysisRunId" TEXT,
    "loadProfileId" TEXT,
    "tariffPlanId" TEXT,
    "tariffVersionId" TEXT,
    "scenarioName" TEXT,
    "systemSizeKwp" DECIMAL(10,4) NOT NULL,
    "panelWatt" DECIMAL(10,4),
    "numberOfPanels" INTEGER,
    "inverterSizeKw" DECIMAL(10,4),
    "roofAreaSqm" DECIMAL(12,4),
    "roofAzimuth" DECIMAL(8,3),
    "roofTilt" DECIMAL(8,3),
    "province" TEXT,
    "systemLossPercent" DECIMAL(8,5),
    "shadingLossPercent" DECIMAL(8,5),
    "degradationPercentPerYear" DECIMAL(8,5),
    "capex" DECIMAL(14,4),
    "oAndMCostPerYear" DECIMAL(14,4),
    "inverterReplacementCost" DECIMAL(14,4),
    "inverterReplacementYear" INTEGER,
    "projectLifeYears" INTEGER,
    "exportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "exportRate" DECIMAL(12,6),
    "exportLimitKw" DECIMAL(12,4),
    "installCostThb" DECIMAL(14,4),
    "assumptions" JSONB NOT NULL,
    "assumptionsSnapshot" JSONB,
    "tariffSnapshot" JSONB,

    CONSTRAINT "SolarScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarSystemConfig" (
    "id" TEXT NOT NULL,
    "solarScenarioId" TEXT NOT NULL,
    "systemSizeKwp" DECIMAL(10,4) NOT NULL,
    "panelWatt" DECIMAL(10,4),
    "numberOfPanels" INTEGER,
    "inverterSizeKw" DECIMAL(10,4),
    "roofAreaSqm" DECIMAL(12,4),
    "roofAzimuth" DECIMAL(8,3),
    "roofTilt" DECIMAL(8,3),
    "systemLossPercent" DECIMAL(8,5) NOT NULL,
    "shadingLossPercent" DECIMAL(8,5) NOT NULL,
    "degradationPercentPerYear" DECIMAL(8,5) NOT NULL,
    "exportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "exportRate" DECIMAL(12,6),
    "exportLimitKw" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolarSystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarGenerationProfile" (
    "id" TEXT NOT NULL,
    "solarProfileId" TEXT,
    "solarScenarioId" TEXT,
    "name" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'demo',
    "sourceUrl" TEXT,
    "province" TEXT,
    "intervalMinutes" INTEGER NOT NULL,
    "annualGenerationKwh" DECIMAL(14,6),
    "monthlyGeneration" JSONB NOT NULL,
    "assumptions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolarGenerationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarGenerationInterval" (
    "id" TEXT NOT NULL,
    "solarGenerationProfileId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "generationKwh" DECIMAL(14,6) NOT NULL,
    "powerKw" DECIMAL(14,6),

    CONSTRAINT "SolarGenerationInterval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarSizingOption" (
    "id" TEXT NOT NULL,
    "solarScenarioId" TEXT NOT NULL,
    "systemSizeKwp" DECIMAL(10,4) NOT NULL,
    "annualGenerationKwh" DECIMAL(14,6) NOT NULL,
    "selfConsumedKwh" DECIMAL(14,6) NOT NULL,
    "exportedKwh" DECIMAL(14,6) NOT NULL,
    "selfConsumptionRatio" DECIMAL(8,5) NOT NULL,
    "annualSavingsThb" DECIMAL(14,4) NOT NULL,
    "exportRevenueThb" DECIMAL(14,4) NOT NULL,
    "capexThb" DECIMAL(14,4) NOT NULL,
    "paybackYears" DECIMAL(10,4),
    "npvThb" DECIMAL(14,4),
    "irrPercent" DECIMAL(10,4),
    "roiPercent" DECIMAL(10,4),
    "recommendationTag" TEXT,
    "trace" JSONB NOT NULL,

    CONSTRAINT "SolarSizingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatteryScenario" (
    "id" TEXT NOT NULL,
    "capacityKwh" DECIMAL(12,4) NOT NULL,
    "usableCapacityKwh" DECIMAL(12,4) NOT NULL,
    "minSocPercent" DECIMAL(8,5) NOT NULL,
    "maxSocPercent" DECIMAL(8,5) NOT NULL,
    "initialSocPercent" DECIMAL(8,5) NOT NULL,
    "chargePowerKw" DECIMAL(12,4) NOT NULL,
    "dischargePowerKw" DECIMAL(12,4) NOT NULL,
    "roundTripEfficiency" DECIMAL(8,5) NOT NULL,
    "controlMode" TEXT NOT NULL,
    "assumptions" JSONB NOT NULL,

    CONSTRAINT "BatteryScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatteryConfig" (
    "id" TEXT NOT NULL,
    "batteryScenarioId" TEXT NOT NULL,
    "capacityKwh" DECIMAL(12,4) NOT NULL,
    "usableCapacityKwh" DECIMAL(12,4) NOT NULL,
    "initialSocPercent" DECIMAL(8,5) NOT NULL,
    "minSocPercent" DECIMAL(8,5) NOT NULL,
    "maxSocPercent" DECIMAL(8,5) NOT NULL,
    "chargePowerKw" DECIMAL(12,4) NOT NULL,
    "dischargePowerKw" DECIMAL(12,4) NOT NULL,
    "chargeEfficiency" DECIMAL(8,5) NOT NULL,
    "dischargeEfficiency" DECIMAL(8,5) NOT NULL,
    "roundTripEfficiency" DECIMAL(8,5) NOT NULL,
    "degradationPercentPerYear" DECIMAL(8,5),
    "cycleLife" INTEGER,
    "capexThb" DECIMAL(14,4),
    "oAndMCostPerYear" DECIMAL(14,4),
    "replacementCostThb" DECIMAL(14,4),
    "replacementYear" INTEGER,
    "backupReservePercent" DECIMAL(8,5) NOT NULL,
    "dispatchStrategy" TEXT NOT NULL,
    "sourceStatus" TEXT NOT NULL DEFAULT 'demo',
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatteryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatteryDispatchInterval" (
    "id" TEXT NOT NULL,
    "batteryScenarioId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "loadKwh" DECIMAL(14,6) NOT NULL,
    "solarKwh" DECIMAL(14,6) NOT NULL,
    "availableSolarSurplusKwh" DECIMAL(14,6) NOT NULL,
    "socBeforeKwh" DECIMAL(14,6) NOT NULL,
    "socAfterKwh" DECIMAL(14,6) NOT NULL,
    "chargeKwh" DECIMAL(14,6) NOT NULL,
    "dischargeKwh" DECIMAL(14,6) NOT NULL,
    "chargeFromSolarKwh" DECIMAL(14,6) NOT NULL,
    "chargeFromGridKwh" DECIMAL(14,6) NOT NULL,
    "dischargeToLoadKwh" DECIMAL(14,6) NOT NULL,
    "gridImportBeforeKwh" DECIMAL(14,6) NOT NULL,
    "gridImportAfterKwh" DECIMAL(14,6) NOT NULL,
    "gridExportBeforeKwh" DECIMAL(14,6) NOT NULL,
    "gridExportAfterKwh" DECIMAL(14,6) NOT NULL,
    "curtailedKwh" DECIMAL(14,6) NOT NULL,
    "trace" JSONB NOT NULL,

    CONSTRAINT "BatteryDispatchInterval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatteryOperationSummary" (
    "id" TEXT NOT NULL,
    "batteryScenarioId" TEXT NOT NULL,
    "dispatchStrategy" TEXT NOT NULL,
    "totalChargedKwh" DECIMAL(14,6) NOT NULL,
    "totalDischargedKwh" DECIMAL(14,6) NOT NULL,
    "chargedFromSolarKwh" DECIMAL(14,6) NOT NULL,
    "chargedFromGridKwh" DECIMAL(14,6) NOT NULL,
    "dischargedToLoadKwh" DECIMAL(14,6) NOT NULL,
    "gridImportBeforeKwh" DECIMAL(14,6) NOT NULL,
    "gridImportAfterKwh" DECIMAL(14,6) NOT NULL,
    "gridExportBeforeKwh" DECIMAL(14,6) NOT NULL,
    "gridExportAfterKwh" DECIMAL(14,6) NOT NULL,
    "peakDemandBeforeKw" DECIMAL(14,6) NOT NULL,
    "peakDemandAfterKw" DECIMAL(14,6) NOT NULL,
    "selfConsumptionBeforeRatio" DECIMAL(8,5),
    "selfConsumptionAfterRatio" DECIMAL(8,5),
    "backupReserveKwh" DECIMAL(14,6) NOT NULL,
    "estimatedBackupHours" DECIMAL(12,4),
    "energyBalanceDeltaKwh" DECIMAL(14,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatteryOperationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatteryFinancialResult" (
    "id" TEXT NOT NULL,
    "batteryScenarioId" TEXT NOT NULL,
    "billBeforeBatteryThb" DECIMAL(14,4) NOT NULL,
    "billAfterBatteryThb" DECIMAL(14,4) NOT NULL,
    "annualBillSavingsThb" DECIMAL(14,4) NOT NULL,
    "increasedSelfConsumptionKwh" DECIMAL(14,6),
    "exportRevenueReductionThb" DECIMAL(14,4),
    "simplePaybackYears" DECIMAL(10,4),
    "discountedPaybackYears" DECIMAL(10,4),
    "roiPercent" DECIMAL(10,4),
    "npvThb" DECIMAL(14,4),
    "irrPercent" DECIMAL(10,4),
    "costPerUsableKwh" DECIMAL(12,6),
    "costPerCycle" DECIMAL(12,6),
    "assumptionsSnapshot" JSONB NOT NULL,
    "trace" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatteryFinancialResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatteryRecommendation" (
    "id" TEXT NOT NULL,
    "batteryScenarioId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "supportingMetrics" JSONB NOT NULL,
    "limitations" JSONB NOT NULL,
    "nextAction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatteryRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvScenario" (
    "id" TEXT NOT NULL,
    "dailyDistanceKm" DECIMAL(10,4) NOT NULL,
    "efficiencyKmPerKwh" DECIMAL(10,4) NOT NULL,
    "vehicleBatteryKwh" DECIMAL(10,4) NOT NULL,
    "chargerPowerKw" DECIMAL(10,4) NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "travelDaysPerWeek" INTEGER NOT NULL,
    "targetSocPercent" DECIMAL(8,5) NOT NULL,
    "chargingStrategy" TEXT NOT NULL,
    "assumptions" JSONB NOT NULL,

    CONSTRAINT "EvScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvConfig" (
    "id" TEXT NOT NULL,
    "evScenarioId" TEXT NOT NULL,
    "vehicleName" TEXT NOT NULL,
    "batteryCapacityKwh" DECIMAL(10,4) NOT NULL,
    "efficiencyKmPerKwh" DECIMAL(10,4) NOT NULL,
    "dailyDistanceKm" DECIMAL(10,4) NOT NULL,
    "weeklyDrivingDays" INTEGER NOT NULL,
    "chargerPowerKw" DECIMAL(10,4) NOT NULL,
    "chargerEfficiency" DECIMAL(8,5) NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "targetSocPercent" DECIMAL(8,5) NOT NULL,
    "initialSocPercent" DECIMAL(8,5) NOT NULL,
    "minSocPercent" DECIMAL(8,5) NOT NULL,
    "chargingDays" JSONB NOT NULL,
    "outsideChargingCostPerKwh" DECIMAL(12,6),
    "allowSolarCharging" BOOLEAN NOT NULL DEFAULT false,
    "allowOffPeakCharging" BOOLEAN NOT NULL DEFAULT true,
    "allowSmartCharging" BOOLEAN NOT NULL DEFAULT true,
    "sourceStatus" TEXT NOT NULL DEFAULT 'demo',
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvChargingSchedule" (
    "id" TEXT NOT NULL,
    "evScenarioId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "targetEnergyKwh" DECIMAL(14,6) NOT NULL,
    "completedEnergyKwh" DECIMAL(14,6) NOT NULL,
    "isComplete" BOOLEAN NOT NULL,
    "warnings" JSONB NOT NULL,
    "trace" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvChargingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvChargingInterval" (
    "id" TEXT NOT NULL,
    "evScenarioId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "strategy" TEXT NOT NULL,
    "energyKwh" DECIMAL(14,6) NOT NULL,
    "powerKw" DECIMAL(14,6) NOT NULL,
    "source" TEXT NOT NULL,
    "costThb" DECIMAL(14,4),
    "isAtHome" BOOLEAN NOT NULL,
    "trace" JSONB NOT NULL,

    CONSTRAINT "EvChargingInterval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvFinancialResult" (
    "id" TEXT NOT NULL,
    "evScenarioId" TEXT NOT NULL,
    "addedEvKwh" DECIMAL(14,6) NOT NULL,
    "chargingCostThb" DECIMAL(14,4) NOT NULL,
    "monthlyBillIncreaseThb" DECIMAL(14,4) NOT NULL,
    "annualBillIncreaseThb" DECIMAL(14,4) NOT NULL,
    "averageCostPerKm" DECIMAL(12,6),
    "costPer100Km" DECIMAL(12,6),
    "gridImportIncreaseKwh" DECIMAL(14,6) NOT NULL,
    "peakDemandIncreaseKw" DECIMAL(14,6) NOT NULL,
    "bestChargingStrategy" TEXT,
    "savingsVsImmediateThb" DECIMAL(14,4),
    "assumptionsSnapshot" JSONB NOT NULL,
    "trace" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvFinancialResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvRecommendation" (
    "id" TEXT NOT NULL,
    "evScenarioId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "supportingMetrics" JSONB NOT NULL,
    "limitations" JSONB NOT NULL,
    "nextAction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAssumption" (
    "id" TEXT NOT NULL,
    "projectYears" INTEGER NOT NULL,
    "discountRatePercent" DECIMAL(8,5) NOT NULL,
    "electricityEscalation" DECIMAL(8,5) NOT NULL,
    "inflationPercent" DECIMAL(8,5),
    "oAndMEscalation" DECIMAL(8,5),
    "degradationRatePercent" DECIMAL(8,5),
    "taxRatePercent" DECIMAL(8,5),
    "loanAmountThb" DECIMAL(14,4),
    "interestRatePercent" DECIMAL(8,5),
    "loanTermYears" INTEGER,
    "subsidyAmountThb" DECIMAL(14,4),
    "meterChangeCostThb" DECIMAL(14,4),
    "otherInitialCostThb" DECIMAL(14,4),
    "loanAssumptions" JSONB,
    "incentiveAssumptions" JSONB,

    CONSTRAINT "FinancialAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialResult" (
    "id" TEXT NOT NULL,
    "solarScenarioId" TEXT,
    "financialAssumptionId" TEXT,
    "initialInvestmentThb" DECIMAL(14,4) NOT NULL,
    "simplePaybackYears" DECIMAL(10,4),
    "discountedPaybackYears" DECIMAL(10,4),
    "roiPercent" DECIMAL(10,4),
    "npvThb" DECIMAL(14,4),
    "irrPercent" DECIMAL(10,4),
    "lcoeThbPerKwh" DECIMAL(12,6),
    "totalBenefitThb" DECIMAL(14,4),
    "totalCostThb" DECIMAL(14,4),
    "assumptionsSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlow" (
    "id" TEXT NOT NULL,
    "financialResultId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "billSavingsThb" DECIMAL(14,4) NOT NULL,
    "exportRevenueThb" DECIMAL(14,4) NOT NULL,
    "oAndMCostThb" DECIMAL(14,4) NOT NULL,
    "replacementCostThb" DECIMAL(14,4) NOT NULL,
    "incentiveThb" DECIMAL(14,4) NOT NULL,
    "loanPaymentThb" DECIMAL(14,4) NOT NULL,
    "netCashFlowThb" DECIMAL(14,4) NOT NULL,
    "cumulativeCashFlowThb" DECIMAL(14,4) NOT NULL,
    "presentValueThb" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "CashFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensitivityResult" (
    "id" TEXT NOT NULL,
    "solarScenarioId" TEXT,
    "factor" TEXT NOT NULL,
    "variantLabel" TEXT NOT NULL,
    "inputValue" DECIMAL(14,6),
    "paybackYears" DECIMAL(10,4),
    "npvThb" DECIMAL(14,4),
    "impactScore" DECIMAL(14,6),
    "trace" JSONB NOT NULL,

    CONSTRAINT "SensitivityResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentivePolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "valueType" TEXT NOT NULL,
    "value" DECIMAL(14,6),
    "sourceUrl" TEXT,
    "authority" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentivePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "siteId" TEXT,
    "meterId" TEXT,
    "loadProfileId" TEXT,
    "tariffVersionId" TEXT,
    "name" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "tariffSnapshot" JSONB NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "assumptions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TariffSnapshot" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT,
    "tariffVersionId" TEXT,
    "engineVersion" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "status" "TariffStatus" NOT NULL,
    "authority" "Authority" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TariffSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "kind" "ScenarioKind" NOT NULL,
    "name" TEXT NOT NULL,
    "solarScenarioId" TEXT,
    "batteryScenarioId" TEXT,
    "evScenarioId" TEXT,
    "financialAssumptionId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioResult" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "totalKwh" DECIMAL(14,6),
    "peakKwh" DECIMAL(14,6),
    "offPeakKwh" DECIMAL(14,6),
    "baseEnergyCharge" DECIMAL(14,4),
    "peakEnergyCharge" DECIMAL(14,4),
    "offPeakEnergyCharge" DECIMAL(14,4),
    "demandCharge" DECIMAL(14,4),
    "ftCharge" DECIMAL(14,4),
    "serviceCharge" DECIMAL(14,4),
    "vat" DECIMAL(14,4),
    "grandTotal" DECIMAL(14,4),
    "effectiveRatePerKwh" DECIMAL(12,6),
    "monthlyEstimatedBill" DECIMAL(14,4),
    "annualEstimatedBill" DECIMAL(14,4),
    "savingsMonthly" DECIMAL(14,4),
    "savingsAnnual" DECIMAL(14,4),
    "savingsPercent" DECIMAL(10,4),
    "paybackMonths" DECIMAL(10,4),
    "assumptions" JSONB,
    "calculationTrace" JSONB,
    "monthlyCostThb" DECIMAL(14,4),
    "annualCostThb" DECIMAL(14,4),
    "investmentThb" DECIMAL(14,4),
    "annualSavingThb" DECIMAL(14,4),
    "exportRevenueThb" DECIMAL(14,4),
    "paybackYears" DECIMAL(10,4),
    "discountedPaybackYears" DECIMAL(10,4),
    "roiPercent" DECIMAL(10,4),
    "npvThb" DECIMAL(14,4),
    "irrPercent" DECIMAL(10,4),
    "selfConsumptionRatio" DECIMAL(8,5),
    "gridImportKwh" DECIMAL(14,4),
    "gridExportKwh" DECIMAL(14,4),
    "billBeforeSolar" DECIMAL(14,4),
    "billAfterSolar" DECIMAL(14,4),
    "billSavings" DECIMAL(14,4),
    "exportRevenue" DECIMAL(14,4),
    "netAnnualBenefit" DECIMAL(14,4),
    "annualSolarGenerationKwh" DECIMAL(14,4),
    "co2ReductionKg" DECIMAL(14,4),
    "rawResult" JSONB NOT NULL,

    CONSTRAINT "ScenarioResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioInputSnapshot" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "kind" "ScenarioKind" NOT NULL,
    "loadProfileSnapshot" JSONB NOT NULL,
    "tariffSnapshot" JSONB NOT NULL,
    "assumptions" JSONB NOT NULL,
    "validationSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioInputSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadShiftRule" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sourceStartTime" TEXT,
    "sourceEndTime" TEXT,
    "targetStartTime" TEXT,
    "targetEndTime" TEXT,
    "shiftKwhPerDay" DECIMAL(14,6),
    "shiftKwhPerMonth" DECIMAL(14,6),
    "shiftPercentOfPeak" DECIMAL(8,5),
    "maxShiftKwh" DECIMAL(14,6),
    "maxPostShiftPowerKw" DECIMAL(14,6),
    "preservesTotalKwh" BOOLEAN NOT NULL DEFAULT true,
    "assumptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadShiftRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioComparison" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "baselineScenarioId" TEXT NOT NULL,
    "candidateScenarioId" TEXT NOT NULL,
    "monthlySavingsThb" DECIMAL(14,4),
    "annualSavingsThb" DECIMAL(14,4),
    "savingsPercent" DECIMAL(10,4),
    "paybackMonths" DECIMAL(10,4),
    "offPeakRatioBefore" DECIMAL(8,5),
    "offPeakRatioAfter" DECIMAL(8,5),
    "requiredShiftKwhPerMonth" DECIMAL(14,6),
    "recommendation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculationBreakdown" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "labelTh" TEXT NOT NULL,
    "amountThb" DECIMAL(14,4),
    "quantity" DECIMAL(14,6),
    "unit" TEXT,
    "formulaRef" TEXT,
    "trace" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CalculationBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "type" TEXT,
    "priority" INTEGER,
    "titleTh" TEXT NOT NULL,
    "bodyTh" TEXT NOT NULL,
    "reasonTh" TEXT NOT NULL,
    "explanation" TEXT,
    "supportingData" JSONB NOT NULL,
    "assumptions" JSONB NOT NULL,
    "confidence" TEXT NOT NULL,
    "limitations" TEXT[],
    "nextAction" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedReport" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ElectricityBill_meterId_billMonth_idx" ON "ElectricityBill"("meterId", "billMonth");

-- CreateIndex
CREATE INDEX "LoadInterval_timestamp_idx" ON "LoadInterval"("timestamp");

-- CreateIndex
CREATE INDEX "LoadInterval_loadProfileId_timestamp_idx" ON "LoadInterval"("loadProfileId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "LoadInterval_loadProfileId_timestamp_key" ON "LoadInterval"("loadProfileId", "timestamp");

-- CreateIndex
CREATE INDEX "ImportJob_loadProfileId_idx" ON "ImportJob"("loadProfileId");

-- CreateIndex
CREATE INDEX "ImportJob_status_createdAt_idx" ON "ImportJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportValidationIssue_importJobId_severity_idx" ON "ImportValidationIssue"("importJobId", "severity");

-- CreateIndex
CREATE INDEX "ImportValidationIssue_code_idx" ON "ImportValidationIssue"("code");

-- CreateIndex
CREATE INDEX "TariffPlan_authority_customerSegment_meterMode_idx" ON "TariffPlan"("authority", "customerSegment", "meterMode");

-- CreateIndex
CREATE INDEX "TariffVersion_tariffPlanId_status_effectiveFrom_effectiveTo_idx" ON "TariffVersion"("tariffPlanId", "status", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "TariffVersion_authority_effectiveFrom_idx" ON "TariffVersion"("authority", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_nameTh_key" ON "Holiday"("date", "nameTh");

-- CreateIndex
CREATE INDEX "SolarScenario_analysisRunId_idx" ON "SolarScenario"("analysisRunId");

-- CreateIndex
CREATE INDEX "SolarScenario_loadProfileId_idx" ON "SolarScenario"("loadProfileId");

-- CreateIndex
CREATE INDEX "SolarScenario_tariffVersionId_idx" ON "SolarScenario"("tariffVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "SolarSystemConfig_solarScenarioId_key" ON "SolarSystemConfig"("solarScenarioId");

-- CreateIndex
CREATE INDEX "SolarGenerationProfile_solarProfileId_idx" ON "SolarGenerationProfile"("solarProfileId");

-- CreateIndex
CREATE INDEX "SolarGenerationProfile_solarScenarioId_idx" ON "SolarGenerationProfile"("solarScenarioId");

-- CreateIndex
CREATE INDEX "SolarGenerationInterval_timestamp_idx" ON "SolarGenerationInterval"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "SolarGenerationInterval_solarGenerationProfileId_timestamp_key" ON "SolarGenerationInterval"("solarGenerationProfileId", "timestamp");

-- CreateIndex
CREATE INDEX "SolarSizingOption_solarScenarioId_idx" ON "SolarSizingOption"("solarScenarioId");

-- CreateIndex
CREATE INDEX "SolarSizingOption_systemSizeKwp_idx" ON "SolarSizingOption"("systemSizeKwp");

-- CreateIndex
CREATE UNIQUE INDEX "BatteryConfig_batteryScenarioId_key" ON "BatteryConfig"("batteryScenarioId");

-- CreateIndex
CREATE INDEX "BatteryDispatchInterval_timestamp_idx" ON "BatteryDispatchInterval"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "BatteryDispatchInterval_batteryScenarioId_timestamp_key" ON "BatteryDispatchInterval"("batteryScenarioId", "timestamp");

-- CreateIndex
CREATE INDEX "BatteryOperationSummary_batteryScenarioId_idx" ON "BatteryOperationSummary"("batteryScenarioId");

-- CreateIndex
CREATE INDEX "BatteryFinancialResult_batteryScenarioId_idx" ON "BatteryFinancialResult"("batteryScenarioId");

-- CreateIndex
CREATE INDEX "BatteryRecommendation_batteryScenarioId_idx" ON "BatteryRecommendation"("batteryScenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "EvConfig_evScenarioId_key" ON "EvConfig"("evScenarioId");

-- CreateIndex
CREATE INDEX "EvChargingSchedule_evScenarioId_idx" ON "EvChargingSchedule"("evScenarioId");

-- CreateIndex
CREATE INDEX "EvChargingInterval_evScenarioId_timestamp_idx" ON "EvChargingInterval"("evScenarioId", "timestamp");

-- CreateIndex
CREATE INDEX "EvFinancialResult_evScenarioId_idx" ON "EvFinancialResult"("evScenarioId");

-- CreateIndex
CREATE INDEX "EvRecommendation_evScenarioId_idx" ON "EvRecommendation"("evScenarioId");

-- CreateIndex
CREATE INDEX "FinancialResult_solarScenarioId_idx" ON "FinancialResult"("solarScenarioId");

-- CreateIndex
CREATE INDEX "FinancialResult_financialAssumptionId_idx" ON "FinancialResult"("financialAssumptionId");

-- CreateIndex
CREATE UNIQUE INDEX "CashFlow_financialResultId_year_key" ON "CashFlow"("financialResultId", "year");

-- CreateIndex
CREATE INDEX "SensitivityResult_solarScenarioId_idx" ON "SensitivityResult"("solarScenarioId");

-- CreateIndex
CREATE INDEX "SensitivityResult_factor_idx" ON "SensitivityResult"("factor");

-- CreateIndex
CREATE INDEX "IncentivePolicy_status_effectiveFrom_idx" ON "IncentivePolicy"("status", "effectiveFrom");

-- CreateIndex
CREATE INDEX "AnalysisRun_userId_createdAt_idx" ON "AnalysisRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_siteId_createdAt_idx" ON "AnalysisRun"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_meterId_createdAt_idx" ON "AnalysisRun"("meterId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_loadProfileId_createdAt_idx" ON "AnalysisRun"("loadProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TariffSnapshot_analysisRunId_key" ON "TariffSnapshot"("analysisRunId");

-- CreateIndex
CREATE INDEX "TariffSnapshot_tariffVersionId_idx" ON "TariffSnapshot"("tariffVersionId");

-- CreateIndex
CREATE INDEX "TariffSnapshot_snapshotHash_idx" ON "TariffSnapshot"("snapshotHash");

-- CreateIndex
CREATE INDEX "TariffSnapshot_status_authority_idx" ON "TariffSnapshot"("status", "authority");

-- CreateIndex
CREATE INDEX "Scenario_analysisRunId_kind_idx" ON "Scenario"("analysisRunId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioResult_scenarioId_key" ON "ScenarioResult"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioInputSnapshot_scenarioId_key" ON "ScenarioInputSnapshot"("scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioInputSnapshot_analysisRunId_idx" ON "ScenarioInputSnapshot"("analysisRunId");

-- CreateIndex
CREATE INDEX "ScenarioInputSnapshot_kind_idx" ON "ScenarioInputSnapshot"("kind");

-- CreateIndex
CREATE INDEX "LoadShiftRule_scenarioId_idx" ON "LoadShiftRule"("scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioComparison_analysisRunId_idx" ON "ScenarioComparison"("analysisRunId");

-- CreateIndex
CREATE INDEX "ScenarioComparison_baselineScenarioId_idx" ON "ScenarioComparison"("baselineScenarioId");

-- CreateIndex
CREATE INDEX "ScenarioComparison_candidateScenarioId_idx" ON "ScenarioComparison"("candidateScenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioComparison_baselineScenarioId_candidateScenarioId_key" ON "ScenarioComparison"("baselineScenarioId", "candidateScenarioId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meter" ADD CONSTRAINT "Meter_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBill" ADD CONSTRAINT "ElectricityBill_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadProfile" ADD CONSTRAINT "LoadProfile_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadInterval" ADD CONSTRAINT "LoadInterval_loadProfileId_fkey" FOREIGN KEY ("loadProfileId") REFERENCES "LoadProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appliance" ADD CONSTRAINT "Appliance_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplianceSchedule" ADD CONSTRAINT "ApplianceSchedule_applianceId_fkey" FOREIGN KEY ("applianceId") REFERENCES "Appliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_loadProfileId_fkey" FOREIGN KEY ("loadProfileId") REFERENCES "LoadProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportValidationIssue" ADD CONSTRAINT "ImportValidationIssue_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffVersion" ADD CONSTRAINT "TariffVersion_tariffPlanId_fkey" FOREIGN KEY ("tariffPlanId") REFERENCES "TariffPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyRateTier" ADD CONSTRAINT "EnergyRateTier_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TouPeriod" ADD CONSTRAINT "TouPeriod_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandRate" ADD CONSTRAINT "DemandRate_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FtPeriod" ADD CONSTRAINT "FtPeriod_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyIncentive" ADD CONSTRAINT "PolicyIncentive_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarProfile" ADD CONSTRAINT "SolarProfile_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarScenario" ADD CONSTRAINT "SolarScenario_solarProfileId_fkey" FOREIGN KEY ("solarProfileId") REFERENCES "SolarProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarSystemConfig" ADD CONSTRAINT "SolarSystemConfig_solarScenarioId_fkey" FOREIGN KEY ("solarScenarioId") REFERENCES "SolarScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarGenerationProfile" ADD CONSTRAINT "SolarGenerationProfile_solarProfileId_fkey" FOREIGN KEY ("solarProfileId") REFERENCES "SolarProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarGenerationProfile" ADD CONSTRAINT "SolarGenerationProfile_solarScenarioId_fkey" FOREIGN KEY ("solarScenarioId") REFERENCES "SolarScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarGenerationInterval" ADD CONSTRAINT "SolarGenerationInterval_solarGenerationProfileId_fkey" FOREIGN KEY ("solarGenerationProfileId") REFERENCES "SolarGenerationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolarSizingOption" ADD CONSTRAINT "SolarSizingOption_solarScenarioId_fkey" FOREIGN KEY ("solarScenarioId") REFERENCES "SolarScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatteryConfig" ADD CONSTRAINT "BatteryConfig_batteryScenarioId_fkey" FOREIGN KEY ("batteryScenarioId") REFERENCES "BatteryScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatteryDispatchInterval" ADD CONSTRAINT "BatteryDispatchInterval_batteryScenarioId_fkey" FOREIGN KEY ("batteryScenarioId") REFERENCES "BatteryScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatteryOperationSummary" ADD CONSTRAINT "BatteryOperationSummary_batteryScenarioId_fkey" FOREIGN KEY ("batteryScenarioId") REFERENCES "BatteryScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatteryFinancialResult" ADD CONSTRAINT "BatteryFinancialResult_batteryScenarioId_fkey" FOREIGN KEY ("batteryScenarioId") REFERENCES "BatteryScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatteryRecommendation" ADD CONSTRAINT "BatteryRecommendation_batteryScenarioId_fkey" FOREIGN KEY ("batteryScenarioId") REFERENCES "BatteryScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvConfig" ADD CONSTRAINT "EvConfig_evScenarioId_fkey" FOREIGN KEY ("evScenarioId") REFERENCES "EvScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvChargingSchedule" ADD CONSTRAINT "EvChargingSchedule_evScenarioId_fkey" FOREIGN KEY ("evScenarioId") REFERENCES "EvScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvChargingInterval" ADD CONSTRAINT "EvChargingInterval_evScenarioId_fkey" FOREIGN KEY ("evScenarioId") REFERENCES "EvScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvFinancialResult" ADD CONSTRAINT "EvFinancialResult_evScenarioId_fkey" FOREIGN KEY ("evScenarioId") REFERENCES "EvScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvRecommendation" ADD CONSTRAINT "EvRecommendation_evScenarioId_fkey" FOREIGN KEY ("evScenarioId") REFERENCES "EvScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialResult" ADD CONSTRAINT "FinancialResult_solarScenarioId_fkey" FOREIGN KEY ("solarScenarioId") REFERENCES "SolarScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialResult" ADD CONSTRAINT "FinancialResult_financialAssumptionId_fkey" FOREIGN KEY ("financialAssumptionId") REFERENCES "FinancialAssumption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlow" ADD CONSTRAINT "CashFlow_financialResultId_fkey" FOREIGN KEY ("financialResultId") REFERENCES "FinancialResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensitivityResult" ADD CONSTRAINT "SensitivityResult_solarScenarioId_fkey" FOREIGN KEY ("solarScenarioId") REFERENCES "SolarScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_loadProfileId_fkey" FOREIGN KEY ("loadProfileId") REFERENCES "LoadProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffSnapshot" ADD CONSTRAINT "TariffSnapshot_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TariffSnapshot" ADD CONSTRAINT "TariffSnapshot_tariffVersionId_fkey" FOREIGN KEY ("tariffVersionId") REFERENCES "TariffVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_solarScenarioId_fkey" FOREIGN KEY ("solarScenarioId") REFERENCES "SolarScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_batteryScenarioId_fkey" FOREIGN KEY ("batteryScenarioId") REFERENCES "BatteryScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_evScenarioId_fkey" FOREIGN KEY ("evScenarioId") REFERENCES "EvScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_financialAssumptionId_fkey" FOREIGN KEY ("financialAssumptionId") REFERENCES "FinancialAssumption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioResult" ADD CONSTRAINT "ScenarioResult_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioInputSnapshot" ADD CONSTRAINT "ScenarioInputSnapshot_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioInputSnapshot" ADD CONSTRAINT "ScenarioInputSnapshot_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadShiftRule" ADD CONSTRAINT "LoadShiftRule_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioComparison" ADD CONSTRAINT "ScenarioComparison_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioComparison" ADD CONSTRAINT "ScenarioComparison_baselineScenarioId_fkey" FOREIGN KEY ("baselineScenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioComparison" ADD CONSTRAINT "ScenarioComparison_candidateScenarioId_fkey" FOREIGN KEY ("candidateScenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalculationBreakdown" ADD CONSTRAINT "CalculationBreakdown_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
