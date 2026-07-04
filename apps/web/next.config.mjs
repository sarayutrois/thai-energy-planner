/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@thai-energy-planner/shared-types",
    "@thai-energy-planner/tariff-engine",
    "@thai-energy-planner/calculation-engine",
    "@thai-energy-planner/report-engine"
  ]
};

export default nextConfig;
