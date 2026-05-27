export type DriverRecord = {
  name: string;
  phone: string;
  email: string;
  license: string;
  location: string;
  homeTerminal: string;
  status: "available" | "driving" | "calling" | "off";
  truck: string;
  loadsToday?: number;
  completedToday?: number;
  weeklyLoads?: number;
  onTimeRate?: number;
  avgRpm?: number;
};
