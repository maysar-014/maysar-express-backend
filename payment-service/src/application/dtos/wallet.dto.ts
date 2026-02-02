
export interface CreditWalletDto {
    userId: string;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
}

export interface DebitWalletDto {
    userId: string;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
}

export interface WalletResponseDto {
    id: string;
    userId: string;
    balance: number;
    currency: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TransactionResponseDto {
    id: string;
    walletId: string;
    type: string;
    amount: number;
    description: string;
    balanceAfter: number;
    createdAt: Date;
}
