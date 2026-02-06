export interface IRefundRepository {
    save(refund: any): Promise<void>;
    findByPaymentId(paymentId: string): Promise<any[]>;
}
