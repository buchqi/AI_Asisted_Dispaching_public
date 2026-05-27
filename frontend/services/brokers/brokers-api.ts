import { mockBrokerProfiles } from "@/entities/load/mock-loads";

export const brokersApi = {
  list() {
    return Object.values(mockBrokerProfiles);
  },
  findByName(name: string) {
    return mockBrokerProfiles[name];
  }
};
