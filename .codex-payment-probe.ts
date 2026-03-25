import { Container } from './services/payment-service/src/container';

async function main() {
  const container = Container.getInstance();
  try {
    const payment = await container.paymentRepository.findByProviderReference('pay_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    const paymentById = await container.paymentRepository.findById('pay_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    console.log(JSON.stringify({
      byProviderReference: payment ? { id: payment.id, status: payment.status, version: payment.version } : null,
      byId: paymentById ? { id: paymentById.id, status: paymentById.status, version: paymentById.version } : null
    }, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await container.prisma.$disconnect().catch(() => undefined);
  }
}

main();
