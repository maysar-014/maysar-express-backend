export const messagingConnection = {
  publish: async (topic: string, message: any) => {
    console.log(`Publishing to ${topic}:`, message);
  }
};
