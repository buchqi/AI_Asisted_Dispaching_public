import { BrokerProfile } from "@/types/load";

export const brokersApi = {
  list(): BrokerProfile[] {
    return [];
  },
  findByName(_name: string): BrokerProfile | undefined {
    return undefined;
  }
};
