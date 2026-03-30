export interface SessionProps {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export class Session {
  private constructor(private props: SessionProps) {}

  static create(props: SessionProps): Session {
    return new Session({ ...props });
  }

  getId(): string {
    return this.props.id;
  }

  isExpired(): boolean {
    return this.props.expiresAt.getTime() <= Date.now();
  }

  refresh(ttlMs: number): void {
    this.props.expiresAt = new Date(Date.now() + ttlMs);
  }
}
