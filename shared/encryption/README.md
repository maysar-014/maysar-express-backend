# shared/encryption

AES-256-GCM PII encryption and HMAC-SHA256 deterministic hashing for sensitive data at rest.

## Purpose

Provides `PiiEncryptionService` for encrypting personally identifiable information (PII) stored in the database — phone numbers, bank account details, national IDs, etc. Uses AES-256-GCM for authenticated encryption and HMAC-SHA256 for deterministic hashing that enables indexed lookups without storing plaintext.

## Exports

| Export | Description |
|--------|-------------|
| `PiiEncryptionService` | Encrypt, decrypt, and hash PII values |

## Usage

```typescript
import { PiiEncryptionService } from '@shared/encryption/pii-encryption.service';

const pii = new PiiEncryptionService();

// Encrypt before storing
const encrypted = pii.encrypt('+255712345678');
// → "a1b2c3...:d4e5f6...:7g8h9i..."  (iv:authTag:ciphertext)

// Decrypt when reading
const phone = pii.decrypt(encrypted);
// → "+255712345678"

// Hash for indexed lookups (deterministic, non-reversible)
const phoneHash = pii.hash('+255712345678');
// Store hash in a separate indexed column for search
```

## Encryption Format

Encrypted values are stored as `iv:authTag:ciphertext` (all hex-encoded). The IV is randomly generated per encryption call, so the same plaintext produces different ciphertext each time.

## Configuration

| Env Var | Required | Description |
|---------|----------|-------------|
| `PII_ENCRYPTION_KEY` | Yes | 32-byte (64 hex chars) AES-256 key |
| `PII_HMAC_SECRET` | Yes | HMAC-SHA256 secret for deterministic hashing |

## Dependencies

- Node.js built-in `crypto` module — no external dependencies
