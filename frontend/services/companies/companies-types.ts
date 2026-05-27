export type CompanyRecord = {
  name: string;
  type: "Carrier" | "Broker";
  verified: boolean;
  contacts: number;
  risk: "low" | "medium" | "review";
};
