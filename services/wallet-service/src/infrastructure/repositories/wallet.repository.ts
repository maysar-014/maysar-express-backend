/**
 * Wallet Repository Implementation
 * Prisma-based repository for wallet persistence with atomic operations
 */

import { PrismaClient, Wallet_Wallet } from '@prisma/client';
import { Wallet, WalletProps, WalletStatus } from '../../domain/entities/wallet.entity';
import { IWalletRepository } from '../../domain/repositories/wallet.repository';

export class WalletRepository implements IWalletRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async save(wallet: Wallet): Promise<void> {
        const props = wallet.toObject();

        await this.prisma.wallet_Wallet.create({
            data: {
                id: props.id,
                userId: props.userId,
                balance: props.balance,
                currency: props.currency,
                status: props.status,
                frozenAmount: props.frozenAmount,
                createdAt: props.createdAt,
                updatedAt: props.updatedAt,
                codCommitmentLimit: props.codCommitmentLimit,
                codCommitmentUsed: props.codCommitmentUsed,
                codCommitmentCount: props.codCommitmentCount,
            },
        });
    }

    async findById(id: string): Promise<Wallet | null> {
        const wallet = await this.prisma.wallet_Wallet.findUnique({
            where: { id },
        });

        return wallet ? this.toDomain(wallet) : null;
    }

    async findByUserId(userId: string): Promise<Wallet | null> {
        const wallet = await this.prisma.wallet_Wallet.findFirst({
            where: { userId },
        });

        return wallet ? this.toDomain(wallet) : null;
    }

    async update(wallet: Wallet): Promise<void> {
        const props = wallet.toObject();

        await this.prisma.wallet_Wallet.update({
            where: { id: props.id },
            data: {
                balance: props.balance,
                status: props.status,
                frozenAmount: props.frozenAmount,
                updatedAt: props.updatedAt,
                codCommitmentUsed: props.codCommitmentUsed,
                codCommitmentCount: props.codCommitmentCount,
            },
        });
    }

    async updateBalance(
        walletId: string,
        balanceChange: number,
        frozenAmountChange: number
    ): Promise<void> {
        await this.prisma.wallet_Wallet.update({
            where: { id: walletId },
            data: {
                balance: {
                    increment: balanceChange,
                },
                frozenAmount: {
                    increment: frozenAmountChange,
                },
                updatedAt: new Date(),
            },
        });
    }

    async lockForTransaction(walletId: string): Promise<Wallet> {
        // Use Prisma transaction with row-level locking
        // Note: Table name in raw query must match DB table name exactly, which is mapped to "wallets"
        const wallet = await this.prisma.$queryRaw<Wallet_Wallet[]>`
      SELECT * FROM "wallets" WHERE id = ${walletId} FOR UPDATE
    `;

        if (!wallet || wallet.length === 0) {
            throw new Error(`Wallet ${walletId} not found`);
        }

        return this.toDomain(wallet[0]);
    }

    async getBalance(walletId: string): Promise<{ balance: number; frozenAmount: number }> {
        const wallet = await this.prisma.wallet_Wallet.findUnique({
            where: { id: walletId },
            select: {
                balance: true,
                frozenAmount: true,
            },
        });

        if (!wallet) {
            throw new Error(`Wallet ${walletId} not found`);
        }

        return {
            balance: Number(wallet.balance),
            frozenAmount: Number(wallet.frozenAmount),
        };
    }

    private toDomain(data: Wallet_Wallet): Wallet {
        const props: WalletProps = {
            id: data.id,
            userId: data.userId,
            balance: Number(data.balance),
            currency: data.currency,
            status: data.status as WalletStatus,
            frozenAmount: Number(data.frozenAmount),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            codCommitmentLimit: Number(data.codCommitmentLimit),
            codCommitmentUsed: Number(data.codCommitmentUsed),
            codCommitmentCount: data.codCommitmentCount,
        };

        return new Wallet(props);
    }
}
