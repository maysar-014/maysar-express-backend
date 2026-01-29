// Existing use cases
export { GetUserUseCase, GetUserInput, GetUserOutput } from './get-user.use-case';
export { SearchUsersUseCase, SearchUsersInput, SearchUsersOutput } from './search-users.use-case';
export { CreateUserUseCase } from './create-user.use-case';
export { UpdateUserUseCase, UpdateUserInput, UpdateUserOutput } from './update-user.use-case';
export { VerifyEmailUseCase, VerifyEmailInput, VerifyEmailOutput } from './verify-email.use-case';

// New use cases with saga support
export { DeleteAccountUseCase, DeleteAccountInput, DeleteAccountOutput } from './delete-account.use-case';
export { ChangePasswordUseCase, ChangePasswordInput, ChangePasswordOutput } from './change-password.use-case';
export { SuspendAccountUseCase, SuspendAccountInput, SuspendAccountOutput } from './suspend-account.use-case';
export { ChangeRoleUseCase, ChangeRoleInput, ChangeRoleOutput } from './change-role.use-case';
export { VerifyPhoneUseCase, VerifyPhoneInput, VerifyPhoneOutput } from './verify-phone.use-case';
export { SetupTwoFactorUseCase, SetupTwoFactorInput, SetupTwoFactorOutput } from './setup-two-factor.use-case';
export { ReportSecurityBreachUseCase, ReportSecurityBreachInput, ReportSecurityBreachOutput } from './report-security-breach.use-case';
