import { PrismaClient } from '@prisma/client';

export interface SavedSellerLocationRecord {
  id: string;
  sellerId: string;
  businessId: string;
  city: string;
  region: string;
  country: string;
  displayName: string;
  isPrimary: boolean;
}

export class PrismaSellerLocationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByIdForSeller(locationId: string, sellerId: string): Promise<SavedSellerLocationRecord | null> {
    const normalizedLocationId = locationId.trim();
    const normalizedSellerId = sellerId.trim();

    if (!normalizedLocationId || !normalizedSellerId) {
      return null;
    }

    const address = await (this.prisma as any).businessAddress.findFirst({
      where: {
        id: normalizedLocationId,
        business: {
          ownerId: normalizedSellerId
        }
      },
      include: {
        business: {
          select: {
            id: true,
            ownerId: true
          }
        }
      }
    });

    if (!address?.business) {
      return null;
    }

    return {
      id: address.id,
      sellerId: address.business.ownerId,
      businessId: address.businessId,
      city: this.normalizePart(address.city),
      region: this.normalizePart(address.region),
      country: this.normalizePart(address.country) || 'Tanzania',
      displayName: this.buildDisplayName(address),
      isPrimary: Boolean(address.isPrimary)
    };
  }

  private buildDisplayName(address: {
    street?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
  }): string {
    const city = this.normalizePart(address.city);
    const region = this.normalizePart(address.region);
    const country = this.normalizePart(address.country);
    const street = this.normalizePart(address.street);
    const parts = Array.from(
      new Set(
        [city, region]
          .filter((value): value is string => Boolean(value))
      )
    );

    if (country && !this.isDefaultCountry(country)) {
      parts.push(country);
    }

    if (parts.length > 0) {
      return parts.join(', ');
    }

    if (street) {
      return country && !this.isDefaultCountry(country)
        ? `${street}, ${country}`
        : street;
    }

    return country || 'Unknown location';
  }

  private normalizePart(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private isDefaultCountry(country: string): boolean {
    const normalized = country.trim().toLowerCase();
    return normalized === 'tanzania' || normalized === 'tz';
  }
}
