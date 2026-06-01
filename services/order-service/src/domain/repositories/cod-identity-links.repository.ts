export type IdentityAttributeType = 'PHONE' | 'NATIONAL_ID' | 'DEVICE' | 'ADDRESS';

export interface IdentityLink {
  id: string;
  accountAId: string;
  accountBId: string;
  attributeType: IdentityAttributeType;
  /** SHA-256 hash of the matching attribute value. Never store raw PII here. */
  attributeHash: string;
  disputedAt: Date | null;
  createdAt: Date;
}

export interface ICODIdentityLinksRepository {
  save(link: IdentityLink): Promise<void>;
  findByAccountId(accountId: string): Promise<IdentityLink[]>;
  findByAttributeHash(hash: string): Promise<IdentityLink[]>;
  setDisputedAt(linkId: string, disputedAt: Date): Promise<void>;
}
