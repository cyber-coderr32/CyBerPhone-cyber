export const monetizationService = {
  checkMonetizationEligibility: async (userId: string) => {
    return { eligible: false, reason: 'Stub' };
  },
  getEarnings: async (userId: string) => {
    return { balance: 0, total: 0 };
  },
  distributePremiumRevenue: async (userId: string, seconds: number) => {
    console.log(`Distributing revenue for ${userId}: ${seconds}s`);
  },
  issueStrike: async (userId: string, reason: string, level: string) => {
    console.log(`Issuing ${level} strike to ${userId}: ${reason}`);
  }
};
