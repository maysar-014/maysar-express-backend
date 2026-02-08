import { BankAccount, AccountType } from '../bank-account.value-object';

describe('BankAccount Value Object', () => {
    const validProps = {
        accountNumber: '1234567890',
        bankCode: 'NMB',
        accountType: AccountType.SAVINGS,
        accountName: 'John Doe',
        branchCode: '001',
        swiftCode: 'NMBTZTZ'
    };

    describe('Constructor', () => {
        it('should create valid bank account', () => {
            const account = new BankAccount(
                validProps.accountNumber,
                validProps.bankCode,
                validProps.accountType,
                validProps.accountName,
                validProps.branchCode,
                validProps.swiftCode
            );

            expect(account.accountNumber).toBe(validProps.accountNumber);
            expect(account.bankCode).toBe(validProps.bankCode);
            expect(account.accountType).toBe(validProps.accountType);
            expect(account.accountName).toBe(validProps.accountName);
        });

        it('should validate account number length', () => {
            expect(() => new BankAccount('123', 'NMB', AccountType.SAVINGS)).toThrow('Account number must be between 10 and 20 digits');
        });

        it('should validate bank code', () => {
            expect(() => new BankAccount('1234567890', 'N', AccountType.SAVINGS)).toThrow('Bank code must be 2-10 alphanumeric characters');
        });

        it('should validate account type', () => {
            expect(() => new BankAccount('1234567890', 'NMB', 'INVALID' as AccountType)).toThrow('Invalid account type: INVALID');
        });

        it('should throw if account number is missing', () => {
            expect(() => new BankAccount('', 'NMB', AccountType.SAVINGS)).toThrow('Account number is required');
        });

        it('should throw if bank code is missing', () => {
            expect(() => new BankAccount('1234567890', '', AccountType.SAVINGS)).toThrow('Bank code is required');
        });
    });

    describe('Methods', () => {
        const account = new BankAccount(
            validProps.accountNumber,
            validProps.bankCode,
            validProps.accountType,
            undefined,
            undefined,
            'SWIFT123'
        );

        it('should mask account number', () => {
            expect(account.mask()).toBe('******7890');
        });

        it('should get bank name', () => {
            expect(account.getBankName()).toBe('NMB Bank');
            const unknownBank = new BankAccount('1234567890', 'UNKNOWN', AccountType.SAVINGS);
            expect(unknownBank.getBankName()).toBe('UNKNOWN');
        });

        it('should check validity', () => {
            expect(account.isValid()).toBe(true);
        });

        it('should check if supports international transfers', () => {
            expect(account.supportsInternationalTransfers()).toBe(true);
            const localAccount = new BankAccount('1234567890', 'NMB', AccountType.SAVINGS);
            expect(localAccount.supportsInternationalTransfers()).toBe(false);
        });

        it('should check equality', () => {
            const other = new BankAccount('1234567890', 'NMB', AccountType.SAVINGS);
            expect(account.equals(other)).toBe(true);

            const different = new BankAccount('0987654321', 'NMB', AccountType.SAVINGS);
            expect(account.equals(different)).toBe(false);
        });

        it('should convert to object', () => {
            const obj = account.toObject();
            expect(obj.accountNumber).toBe(validProps.accountNumber);
            expect(obj.swiftCode).toBe('SWIFT123');
        });

        it('should create from object', () => {
            const newAccount = BankAccount.fromObject(validProps);
            expect(newAccount.equals(account)).toBe(true);
        });
    });
});
