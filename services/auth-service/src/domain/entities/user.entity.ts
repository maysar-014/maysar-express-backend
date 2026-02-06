export interface UserProps {
  id: string;
  email: string;
  role: string;
  status: string;
  profile: any;
  kycStatus?: string;
}

export class User {
  private constructor(private props: UserProps) { }

  public static create(props: UserProps): User {
    return new User(props);
  }

  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get role(): string { return this.props.role; }
  get status(): string { return this.props.status; }
  get profile(): any { return this.props.profile; }

  public isApproved(): boolean {
    return this.props.kycStatus === 'APPROVED';
  }

  public isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }
}