# Maysar Supplier Console

Enterprise-grade wholesale supply chain management platform for Tanzanian suppliers.

## Overview

The Supplier Console is a comprehensive B2B platform designed for wholesale suppliers operating in Tanzania. It provides enterprise-level tools for supply chain management, bulk fulfillment, and wholesale operations.

## Features

### Supply Chain Management
- **Supply Catalog**: Comprehensive product catalog with bulk pricing tiers
- **Purchase Orders**: Advanced PO management with automated workflows
- **Raw Materials & Stock**: Inventory management for manufacturing inputs
- **Production & Manufacturing**: Production planning and capacity management
- **Wholesale Pricing**: Dynamic pricing models for bulk orders
- **Supply Chain Analytics**: Real-time insights and demand forecasting
- **Bulk Fulfillment**: Large-scale order processing and logistics
- **Wholesale Payments**: B2B payment processing and credit terms

### Supplier Tier System
- **Tier 1**: Basic Supplier (0-50 orders/month)
- **Tier 2**: Standard Supplier (51-200 orders/month)
- **Tier 3**: Premium Supplier (201-500 orders/month)
- **Tier 4**: Enterprise Supplier (501-1000 orders/month)
- **Tier 5**: Strategic Partner (1000+ orders/month)

### KYC Verification
- **Dual Flow System**: Corporate (5 steps) and Courier (4 steps)
- **Corporate KYC**: Company registration, tax compliance, financial verification
- **Courier KYC**: Individual verification for small-scale suppliers
- **Document Management**: Secure upload and verification system

### Enterprise Settings
- **Company Profile**: Business information and branding
- **Security & Privacy**: Access control and data protection
- **API & Integrations**: Third-party system connections

## Technology Stack

- **Frontend**: Next.js 14.2.5 with React 18
- **Styling**: Tailwind CSS 3.4.1
- **TypeScript**: Full type safety
- **Port**: 3017

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Navigate to supplier console
cd supplier-console

# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3017
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Configure required variables
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_CONSOLE_TYPE=supplier
```

## Project Structure

```
supplier-console/
├── src/
│   ├── app/
│   │   ├── supplier/
│   │   │   ├── dashboard/          # Supply chain dashboard
│   │   │   ├── catalog/            # Supply catalog management
│   │   │   ├── orders/             # Purchase order management
│   │   │   ├── inventory/          # Raw materials & stock
│   │   │   ├── production/         # Manufacturing management
│   │   │   ├── pricing/            # Wholesale pricing
│   │   │   ├── analytics/          # Supply chain analytics
│   │   │   ├── fulfillment/        # Bulk fulfillment
│   │   │   ├── payments/           # Wholesale payments
│   │   │   ├── kyc/                # KYC verification
│   │   │   └── settings/           # Enterprise settings
│   │   ├── globals.css
│   │   └── layout.tsx
│   └── lib/
│       └── permissions.ts          # Tier-based permissions
├── package.json
├── tailwind.config.js
└── README.md
```

## Key Features

### Supply Chain Dashboard
- Real-time supply chain metrics
- Demand forecasting and analytics
- Purchase order pipeline
- Production capacity monitoring
- Supplier performance tracking

### Tier-Based Permissions
Progressive feature unlocking based on supplier tier:
- **Tier 1-2**: Basic catalog and order management
- **Tier 3-4**: Advanced analytics and production planning
- **Tier 5**: Full enterprise features and API access

### Dual KYC System
- **Corporate Flow**: 5-step verification for registered companies
- **Courier Flow**: 4-step verification for individual suppliers
- Automated document processing and verification

### Enterprise Integration
- API endpoints for ERP integration
- Webhook support for real-time updates
- Bulk data import/export capabilities

## Development

### Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Code Style
- ESLint configuration for code quality
- Prettier for consistent formatting
- TypeScript for type safety
- Tailwind CSS for styling

## API Integration

The supplier console integrates with the main Maysar platform APIs:

- **Supply Service**: Product catalog and inventory management
- **Order Service**: Purchase order processing
- **Payment Service**: B2B payment processing
- **Analytics Service**: Supply chain insights
- **Auth Service**: Authentication and authorization

## Security

- Role-based access control (RBAC)
- Secure document upload and storage
- API key management for integrations
- Audit logging for compliance

## Support

For technical support and documentation:
- Internal documentation: `/docs`
- API reference: `/api-docs`
- Support tickets: Contact system administrator

## License

Internal use only - Maysar Digital Community Trade Network

---

**Built for enterprise-scale wholesale operations in Tanzania**