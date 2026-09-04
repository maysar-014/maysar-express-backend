import { Prisma, PrismaClient } from '@prisma/client';

type AttributeType = 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN';

type AttributeSeed = {
  name: string;
  displayLabel: string;
  type: AttributeType;
  options?: string[];
  isRequired?: boolean;
  placeholder?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  searchable?: boolean;
  filterable?: boolean;
  comparable?: boolean;
  multiValue?: boolean;
  validationHint?: string;
};

type CategorySeed = {
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  attributes: AttributeSeed[];
};

const CATEGORY_TAXONOMY: CategorySeed[] = [
  {
    name: 'Electronics & Electrical',
    slug: 'electronics-electrical',
    description: 'Consumer electronics, electrical appliances, and accessories',
    displayOrder: 10,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Smartphones', 'Feature phones', 'Tablets', 'Laptops', 'Desktop computers',
          'Televisions', 'Audio equipment', 'Cameras', 'Wearables', 'Networking equipment',
          'Power & charging', 'Computer accessories', 'Phone accessories', 'Home appliances'
        ],
        isRequired: false,
        placeholder: 'Select product category',
        filterable: true,
      },
      {
        name: 'brand',
        displayLabel: 'Brand',
        type: 'TEXT',
        isRequired: false,
        placeholder: 'e.g. Samsung, Apple, TECNO',
        searchable: true,
        filterable: true,
      },
      {
        name: 'model_number',
        displayLabel: 'Model number or name',
        type: 'TEXT',
        isRequired: false,
        placeholder: 'Manufacturer model identifier',
        searchable: true,
      },
      {
        name: 'condition',
        displayLabel: 'Condition',
        type: 'SELECT',
        options: ['New', 'Used - Like new', 'Used - Good', 'Used - Fair', 'Refurbished', 'Open box'],
        isRequired: false,
        placeholder: 'Select condition',
        filterable: true,
      },
      {
        name: 'warranty_period',
        displayLabel: 'Warranty period',
        type: 'SELECT',
        options: ['No warranty', '30 days', '3 months', '6 months', '1 year', '2 years', 'Manufacturer warranty'],
        isRequired: false,
        placeholder: 'Select warranty period',
        filterable: true,
      },
      {
        name: 'key_features',
        displayLabel: 'Key features',
        type: 'TEXT',
        placeholder: 'Main features buyers should know',
        searchable: true,
      },
      {
        name: 'color',
        displayLabel: 'Color',
        type: 'TEXT',
        placeholder: 'Primary color',
        filterable: true,
      },
      {
        name: 'power_requirements',
        displayLabel: 'Power requirements',
        type: 'TEXT',
        placeholder: 'e.g. 220-240V, 50Hz',
      },
      {
        name: 'battery_type',
        displayLabel: 'Battery type',
        type: 'SELECT',
        options: ['Lithium-ion', 'Lithium-polymer', 'NiMH', 'Alkaline', 'Lead-acid', 'No battery required'],
        placeholder: 'Select battery type if applicable',
        filterable: true,
      },
      {
        name: 'battery_capacity',
        displayLabel: 'Battery capacity',
        type: 'NUMBER',
        unit: 'mAh',
        minValue: 0,
        maxValue: 100000,
        placeholder: 'Battery capacity in mAh',
        comparable: true,
      },
      {
        name: 'charging_interface',
        displayLabel: 'Charging interface',
        type: 'SELECT',
        options: ['USB-A', 'USB-C', 'Micro-USB', 'Lightning', 'Wireless', 'Proprietary', 'Multiple interfaces'],
        placeholder: 'Select charging interface',
        filterable: true,
      },
      {
        name: 'charging_methods',
        displayLabel: 'Charging methods',
        type: 'SELECT',
        options: ['USB', 'Mains adapter', 'Solar', 'Wireless', 'Car charger', 'Power bank'],
        placeholder: 'Select all applicable charging methods',
        filterable: true,
      },
      {
        name: 'connectivity',
        displayLabel: 'Connectivity options',
        type: 'SELECT',
        options: ['Wi-Fi', 'Bluetooth', '4G LTE', '5G', 'NFC', 'GPS', 'HDMI', 'USB', 'Ethernet', 'Radio'],
        placeholder: 'Select all applicable connectivity options',
        filterable: true,
      },
      {
        name: 'compatibility',
        displayLabel: 'Compatibility',
        type: 'TEXT',
        placeholder: 'Compatible devices, systems, or operating systems',
        searchable: true,
      },
      {
        name: 'included_accessories',
        displayLabel: 'Included accessories',
        type: 'TEXT',
        placeholder: 'List included accessories in the package',
      },
      {
        name: 'certification',
        displayLabel: 'Certification',
        type: 'SELECT',
        options: ['TBS certified', 'CE marked', 'ISO certified', 'FCC certified', 'RoHS compliant', 'None stated'],
        placeholder: 'Select applicable certifications',
        filterable: true,
      },
    ],
  },
  {
    name: 'Energy & Solar',
    slug: 'energy-solar',
    description: 'Solar products, power solutions, and energy equipment',
    displayOrder: 20,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Solar panels', 'Solar batteries', 'Inverters', 'Generators', 'Charge controllers',
          'Solar lighting', 'Solar water heaters', 'Solar kits', 'Wind turbines', 'Power banks'
        ],
        isRequired: false,
        placeholder: 'Select energy product type',
        filterable: true,
      },
      {
        name: 'brand',
        displayLabel: 'Brand or manufacturer',
        type: 'TEXT',
        placeholder: 'Brand or manufacturer name',
        searchable: true,
        filterable: true,
      },
      {
        name: 'model_number',
        displayLabel: 'Model number',
        type: 'TEXT',
        placeholder: 'Manufacturer model identifier',
        searchable: true,
      },
      {
        name: 'rated_power',
        displayLabel: 'Rated power',
        type: 'NUMBER',
        unit: 'W',
        minValue: 0,
        maxValue: 1000000,
        placeholder: 'Rated power in watts',
        comparable: true,
        filterable: true,
      },
      {
        name: 'power_capacity',
        displayLabel: 'Power capacity',
        type: 'TEXT',
        placeholder: 'e.g. 5kW, 10kVA, 200Ah',
        comparable: true,
      },
      {
        name: 'voltage',
        displayLabel: 'Voltage',
        type: 'SELECT',
        options: ['12V', '24V', '48V', '110V', '220-240V', '380V', 'Multiple voltages'],
        placeholder: 'Select voltage',
        filterable: true,
      },
      {
        name: 'technology_type',
        displayLabel: 'Technology',
        type: 'SELECT',
        options: [
          'Monocrystalline solar', 'Polycrystalline solar', 'Thin-film solar',
          'Lithium-ion battery', 'Lead-acid battery', 'Gel battery', 'AGM battery',
          'Diesel generator', 'Petrol generator', 'Hybrid system', 'Pure sine wave',
          'Modified sine wave', 'MPPT', 'PWM'
        ],
        placeholder: 'Select technology type',
        filterable: true,
      },
      {
        name: 'efficiency_rating',
        displayLabel: 'Efficiency rating',
        type: 'NUMBER',
        unit: '%',
        minValue: 0,
        maxValue: 100,
        placeholder: 'Efficiency percentage',
        comparable: true,
      },
      {
        name: 'installation_required',
        displayLabel: 'Professional installation required',
        type: 'BOOLEAN',
        isRequired: false,
        placeholder: 'Does this require professional installation?',
        filterable: true,
      },
      {
        name: 'warranty_period',
        displayLabel: 'Warranty period',
        type: 'SELECT',
        options: ['No warranty', '6 months', '1 year', '2 years', '5 years', '10 years', '25 years', 'Manufacturer warranty'],
        placeholder: 'Select warranty period',
        filterable: true,
      },
      {
        name: 'ip_rating',
        displayLabel: 'IP protection rating',
        type: 'SELECT',
        options: ['IP20', 'IP44', 'IP54', 'IP65', 'IP66', 'IP67', 'IP68', 'No IP rating'],
        placeholder: 'Select IP rating for outdoor/indoor use',
        filterable: true,
      },
      {
        name: 'included_components',
        displayLabel: 'Included components',
        type: 'TEXT',
        placeholder: 'List included cables, mounts, brackets, or accessories',
      },
      {
        name: 'certification',
        displayLabel: 'Certification',
        type: 'SELECT',
        options: ['TBS certified', 'CE marked', 'ISO certified', 'IEC compliant', 'No certification stated'],
        placeholder: 'Select applicable certifications',
        filterable: true,
      },
    ],
  },
  {
    name: 'Food & Beverages',
    slug: 'food-beverages',
    description: 'Fresh produce, packaged foods, and beverages',
    displayOrder: 30,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Grains & staples', 'Fresh produce', 'Dairy products', 'Meat & poultry',
          'Fish & seafood', 'Beverages', 'Spices & condiments', 'Packaged foods',
          'Baked goods', 'Snacks', 'Baby food', 'Organic products'
        ],
        isRequired: false,
        placeholder: 'Select food category',
        filterable: true,
      },
      {
        name: 'brand_or_producer',
        displayLabel: 'Brand or producer',
        type: 'TEXT',
        placeholder: 'Brand, farm, or producer name',
        searchable: true,
        filterable: true,
      },
      {
        name: 'ingredients',
        displayLabel: 'Ingredients or composition',
        type: 'TEXT',
        isRequired: false,
        placeholder: 'List main ingredients or composition',
        searchable: true,
      },
      {
        name: 'packaging_type',
        displayLabel: 'Packaging type',
        type: 'SELECT',
        options: ['Bottle', 'Pouch', 'Box', 'Can', 'Sack', 'Jar', 'Carton', 'Vacuum packed', 'Bulk', 'No packaging'],
        isRequired: false,
        placeholder: 'Select packaging type',
        filterable: true,
      },
      {
        name: 'net_weight',
        displayLabel: 'Net weight',
        type: 'NUMBER',
        unit: 'kg',
        minValue: 0,
        maxValue: 100000,
        placeholder: 'Net weight in kilograms',
        comparable: true,
      },
      {
        name: 'net_volume',
        displayLabel: 'Net volume',
        type: 'NUMBER',
        unit: 'L',
        minValue: 0,
        maxValue: 10000,
        placeholder: 'Net volume in liters',
        comparable: true,
      },
      {
        name: 'origin',
        displayLabel: 'Place of origin',
        type: 'TEXT',
        placeholder: 'Country, region, or farm of origin',
        searchable: true,
      },
      {
        name: 'shelf_life',
        displayLabel: 'Shelf life',
        type: 'TEXT',
        placeholder: 'e.g. 12 months, 3 days refrigerated',
      },
      {
        name: 'expiry_date',
        displayLabel: 'Expiry date',
        type: 'TEXT',
        placeholder: 'Expiry date or best before date',
      },
      {
        name: 'storage_instructions',
        displayLabel: 'Storage instructions',
        type: 'TEXT',
        placeholder: 'How should this product be stored?',
      },
      {
        name: 'dietary_information',
        displayLabel: 'Dietary information',
        type: 'SELECT',
        options: ['Vegetarian', 'Vegan', 'Halal certified', 'Kosher', 'Gluten-free', 'Lactose-free', 'Organic', 'No allergens'],
        placeholder: 'Select applicable dietary information',
        filterable: true,
      },
      {
        name: 'certification',
        displayLabel: 'Quality certification',
        type: 'SELECT',
        options: ['TBS certified', 'ISO certified', 'Organic certified', 'HACCP certified', 'No certification stated'],
        placeholder: 'Select quality certifications',
        filterable: true,
      },
    ],
  },
  {
    name: 'Agriculture & Farming',
    slug: 'agriculture-farming',
    description: 'Agricultural inputs, equipment, and produce',
    displayOrder: 40,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Seeds', 'Fertilizers', 'Animal feed', 'Farm tools', 'Irrigation systems',
          'Pesticides & herbicides', 'Farm machinery', 'Greenhouse equipment', 'Harvest produce',
          'Livestock', 'Veterinary products'
        ],
        isRequired: false,
        placeholder: 'Select agricultural product type',
        filterable: true,
      },
      {
        name: 'brand_or_manufacturer',
        displayLabel: 'Brand or manufacturer',
        type: 'TEXT',
        placeholder: 'Brand or manufacturer name',
        searchable: true,
        filterable: true,
      },
      {
        name: 'crop_or_application',
        displayLabel: 'Crop or application',
        type: 'TEXT',
        placeholder: 'Target crop, livestock, or agricultural use',
        searchable: true,
      },
      {
        name: 'variety_or_formulation',
        displayLabel: 'Variety or formulation',
        type: 'TEXT',
        placeholder: 'Variety, grade, or formulation details',
        searchable: true,
      },
      {
        name: 'pack_size',
        displayLabel: 'Pack size',
        type: 'TEXT',
        isRequired: false,
        placeholder: 'e.g. 5kg, 25kg, 1L, 500g',
      },
      {
        name: 'active_ingredients',
        displayLabel: 'Active ingredients or composition',
        type: 'TEXT',
        placeholder: 'Key active ingredients or nutritional composition',
      },
      {
        name: 'application_rate',
        displayLabel: 'Application rate',
        type: 'TEXT',
        placeholder: 'Recommended application rate per hectare or animal',
      },
      {
        name: 'recommended_season',
        displayLabel: 'Recommended season',
        type: 'SELECT',
        options: ['Year-round', 'Rainy season', 'Dry season', 'Short rains', 'Long rains', 'Winter', 'Summer'],
        placeholder: 'Select recommended seasons',
        filterable: true,
      },
      {
        name: 'expiry_or_viability',
        displayLabel: 'Expiry or viability period',
        type: 'TEXT',
        placeholder: 'Expiry date or seed viability period',
      },
      {
        name: 'certification',
        displayLabel: 'Certification',
        type: 'SELECT',
        options: ['TBS certified', 'KEPHIS certified', 'Organic certified', 'ISO certified', 'No certification stated'],
        placeholder: 'Select certifications',
        filterable: true,
      },
    ],
  },
  {
    name: 'Construction & Building',
    slug: 'construction-building',
    description: 'Building materials, construction equipment, and supplies',
    displayOrder: 50,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Cement & aggregates', 'Steel & metals', 'Timber & wood', 'Roofing materials',
          'Plumbing & sanitary', 'Electrical materials', 'Paint & finishes', 'Construction tools',
          'Safety equipment', 'Insulation materials', 'Tiles & flooring', 'Doors & windows'
        ],
        isRequired: false,
        placeholder: 'Select construction product type',
        filterable: true,
      },
      {
        name: 'brand_or_manufacturer',
        displayLabel: 'Brand or manufacturer',
        type: 'TEXT',
        placeholder: 'Brand or manufacturer name',
        searchable: true,
        filterable: true,
      },
      {
        name: 'material_specification',
        displayLabel: 'Material or specification',
        type: 'TEXT',
        isRequired: false,
        placeholder: 'Grade, specification, or material composition',
        searchable: true,
      },
      {
        name: 'dimensions',
        displayLabel: 'Dimensions',
        type: 'TEXT',
        placeholder: 'Length, width, thickness, or size specifications',
        comparable: true,
      },
      {
        name: 'unit_of_measurement',
        displayLabel: 'Unit of measurement',
        type: 'SELECT',
        options: ['Piece', 'Bag', 'Box', 'Meter', 'Square meter', 'Cubic meter', 'Roll', 'Tonne', 'Kilogram', 'Set', 'Bundle'],
        isRequired: false,
        placeholder: 'Select unit of measurement',
        filterable: true,
      },
      {
        name: 'application_area',
        displayLabel: 'Application area',
        type: 'TEXT',
        placeholder: 'Where or how this product is typically used',
        searchable: true,
      },
      {
        name: 'finish_or_color',
        displayLabel: 'Finish or color',
        type: 'TEXT',
        placeholder: 'Color, coating, or finish details',
        filterable: true,
      },
      {
        name: 'strength_rating',
        displayLabel: 'Strength rating',
        type: 'TEXT',
        placeholder: 'e.g. M20 concrete grade, Grade 40 steel',
        comparable: true,
      },
      {
        name: 'compliance_standard',
        displayLabel: 'Compliance standard',
        type: 'SELECT',
        options: ['TBS certified', 'ISO certified', 'ASTM compliant', 'BS compliant', 'EN compliant', 'No standard stated'],
        placeholder: 'Select compliance standards',
        filterable: true,
      },
      {
        name: 'weather_resistance',
        displayLabel: 'Weather resistance',
        type: 'SELECT',
        options: ['Indoor use only', 'Outdoor use', 'Water resistant', 'Weather proof', 'Extreme conditions'],
        placeholder: 'Select weather resistance level',
        filterable: true,
      },
      {
        name: 'warranty_period',
        displayLabel: 'Warranty period',
        type: 'SELECT',
        options: ['No warranty', '1 year', '2 years', '5 years', '10 years', 'Lifetime warranty'],
        placeholder: 'Select warranty period',
        filterable: true,
      },
    ],
  },
  {
    name: 'Clothing & Fashion',
    slug: 'clothing-fashion',
    description: 'Apparel, footwear, and fashion accessories',
    displayOrder: 60,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Shirts', 'T-shirts', 'Trousers', 'Dresses', 'Skirts', 'Jackets & coats',
          'Knitwear', 'Sportswear', 'Traditional wear', 'School uniforms', 'Work uniforms',
          'Underwear', 'Baby clothing', 'Footwear', 'Fashion accessories'
        ],
        isRequired: false,
        placeholder: 'Select clothing category',
        filterable: true,
      },
      {
        name: 'brand',
        displayLabel: 'Brand',
        type: 'TEXT',
        placeholder: 'Brand name',
        searchable: true,
        filterable: true,
      },
      {
        name: 'target_wearer',
        displayLabel: 'Target wearer',
        type: 'SELECT',
        options: ['Women', 'Men', 'Unisex', 'Girls', 'Boys', 'Babies', 'Maternity'],
        isRequired: false,
        placeholder: 'Select target wearer',
        filterable: true,
      },
      {
        name: 'size',
        displayLabel: 'Size',
        type: 'SELECT',
        options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free size', 'Custom size', 'Numeric size'],
        isRequired: false,
        placeholder: 'Select size',
        filterable: true,
      },
      {
        name: 'size_details',
        displayLabel: 'Size details',
        type: 'TEXT',
        placeholder: 'e.g. EU 42, UK 8, 32x32',
      },
      {
        name: 'fabric_composition',
        displayLabel: 'Fabric composition',
        type: 'TEXT',
        isRequired: false,
        placeholder: 'e.g. 100% cotton, cotton-polyester blend',
        searchable: true,
      },
      {
        name: 'color',
        displayLabel: 'Primary color',
        type: 'TEXT',
        isRequired: false,
        placeholder: 'Primary color',
        filterable: true,
      },
      {
        name: 'pattern',
        displayLabel: 'Pattern',
        type: 'SELECT',
        options: ['Solid', 'Striped', 'Checked', 'Printed', 'Floral', 'Embroidered', 'Tie-dye', 'Plaid', 'Polka dot'],
        placeholder: 'Select pattern',
        filterable: true,
      },
      {
        name: 'fit_type',
        displayLabel: 'Fit type',
        type: 'SELECT',
        options: ['Slim fit', 'Regular fit', 'Relaxed fit', 'Oversized', 'Tailored fit', 'Stretch fit'],
        placeholder: 'Select fit type',
        filterable: true,
      },
      {
        name: 'care_instructions',
        displayLabel: 'Care instructions',
        type: 'TEXT',
        placeholder: 'Washing, drying, and care instructions',
      },
      {
        name: 'season_suitability',
        displayLabel: 'Season suitability',
        type: 'SELECT',
        options: ['All season', 'Summer', 'Winter', 'Rainy season', 'School term', 'Work wear'],
        placeholder: 'Select suitable seasons',
        filterable: true,
      },
      {
        name: 'country_of_manufacture',
        displayLabel: 'Country of manufacture',
        type: 'TEXT',
        placeholder: 'Manufacturing country',
      },
    ],
  },
  {
    name: 'Office & Business',
    slug: 'office-business',
    description: 'Office supplies, business equipment, and professional services',
    displayOrder: 70,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Stationery', 'Paper products', 'Office furniture', 'Printer supplies',
          'Storage solutions', 'Presentation equipment', 'Cleaning supplies',
          'Business machines', 'Office technology', 'School supplies'
        ],
        isRequired: false,
        placeholder: 'Select office product type',
        filterable: true,
      },
      {
        name: 'brand_or_manufacturer',
        displayLabel: 'Brand or manufacturer',
        type: 'TEXT',
        placeholder: 'Brand or manufacturer name',
        searchable: true,
        filterable: true,
      },
      {
        name: 'material',
        displayLabel: 'Material',
        type: 'TEXT',
        placeholder: 'Main material composition',
      },
      {
        name: 'dimensions',
        displayLabel: 'Dimensions or size',
        type: 'TEXT',
        placeholder: 'Product dimensions, paper size, or capacity',
        comparable: true,
      },
      {
        name: 'quantity_per_pack',
        displayLabel: 'Quantity per pack',
        type: 'NUMBER',
        minValue: 1,
        maxValue: 10000,
        placeholder: 'Number of items per pack',
        comparable: true,
      },
      {
        name: 'color',
        displayLabel: 'Color',
        type: 'TEXT',
        placeholder: 'Color or color assortment',
        filterable: true,
      },
      {
        name: 'compatibility',
        displayLabel: 'Compatibility',
        type: 'TEXT',
        placeholder: 'Compatible devices, systems, or furniture',
      },
      {
        name: 'eco_friendly',
        displayLabel: 'Eco-friendly',
        type: 'BOOLEAN',
        placeholder: 'Is this product environmentally friendly?',
        filterable: true,
      },
      {
        name: 'warranty_period',
        displayLabel: 'Warranty period',
        type: 'SELECT',
        options: ['No warranty', '30 days', '3 months', '6 months', '1 year', '2 years', '5 years'],
        placeholder: 'Select warranty period',
      },
    ],
  },
  {
    name: 'Automotive & Transport',
    slug: 'automotive-transport',
    description: 'Vehicles, parts, and transportation equipment',
    displayOrder: 80,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Cars', 'Motorcycles', 'Bicycles', 'Trucks', 'Vehicle parts', 'Tires & wheels',
          'Vehicle accessories', 'Vehicle maintenance', 'Fuel & lubricants', 'Transport equipment'
        ],
        isRequired: false,
        placeholder: 'Select automotive category',
        filterable: true,
      },
      {
        name: 'brand',
        displayLabel: 'Brand',
        type: 'TEXT',
        placeholder: 'Vehicle or part brand',
        searchable: true,
        filterable: true,
      },
      {
        name: 'model',
        displayLabel: 'Model',
        type: 'TEXT',
        placeholder: 'Model name or number',
        searchable: true,
      },
      {
        name: 'year',
        displayLabel: 'Year',
        type: 'NUMBER',
        minValue: 1950,
        maxValue: 2030,
        placeholder: 'Year of manufacture',
        comparable: true,
        filterable: true,
      },
      {
        name: 'condition',
        displayLabel: 'Condition',
        type: 'SELECT',
        options: ['New', 'Used', 'Refurbished', 'Damaged', 'For parts'],
        isRequired: false,
        placeholder: 'Select condition',
        filterable: true,
      },
      {
        name: 'mileage',
        displayLabel: 'Mileage',
        type: 'NUMBER',
        unit: 'km',
        minValue: 0,
        maxValue: 1000000,
        placeholder: 'Mileage in kilometers',
        comparable: true,
      },
      {
        name: 'fuel_type',
        displayLabel: 'Fuel type',
        type: 'SELECT',
        options: ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG', 'None'],
        placeholder: 'Select fuel type',
        filterable: true,
      },
      {
        name: 'engine_capacity',
        displayLabel: 'Engine capacity',
        type: 'NUMBER',
        unit: 'cc',
        minValue: 0,
        maxValue: 20000,
        placeholder: 'Engine capacity in cubic centimeters',
        comparable: true,
      },
      {
        name: 'transmission',
        displayLabel: 'Transmission',
        type: 'SELECT',
        options: ['Manual', 'Automatic', 'CVT', 'Semi-automatic'],
        placeholder: 'Select transmission type',
        filterable: true,
      },
      {
        name: 'color',
        displayLabel: 'Color',
        type: 'TEXT',
        placeholder: 'Vehicle or part color',
        filterable: true,
      },
    ],
  },
  {
    name: 'Industrial & Commercial',
    slug: 'industrial-commercial',
    description: 'Industrial machinery, commercial equipment, and business supplies',
    displayOrder: 90,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Manufacturing equipment', 'Commercial kitchen equipment', 'Agricultural machinery',
          'Printing equipment', 'Packaging machinery', 'Material handling', 'Safety equipment',
          'Testing equipment', 'Industrial tools', 'Commercial vehicles'
        ],
        isRequired: false,
        placeholder: 'Select industrial category',
        filterable: true,
      },
      {
        name: 'brand_or_manufacturer',
        displayLabel: 'Brand or manufacturer',
        type: 'TEXT',
        placeholder: 'Brand or manufacturer name',
        searchable: true,
        filterable: true,
      },
      {
        name: 'model_number',
        displayLabel: 'Model number',
        type: 'TEXT',
        placeholder: 'Manufacturer model identifier',
        searchable: true,
      },
      {
        name: 'capacity',
        displayLabel: 'Capacity',
        type: 'TEXT',
        placeholder: 'Production capacity, load capacity, or processing capacity',
        comparable: true,
      },
      {
        name: 'power_requirements',
        displayLabel: 'Power requirements',
        type: 'TEXT',
        placeholder: 'Power supply requirements',
      },
      {
        name: 'dimensions',
        displayLabel: 'Dimensions',
        type: 'TEXT',
        placeholder: 'Equipment dimensions and weight',
      },
      {
        name: 'installation_required',
        displayLabel: 'Professional installation required',
        type: 'BOOLEAN',
        placeholder: 'Does this require professional installation?',
        filterable: true,
      },
      {
        name: 'warranty_period',
        displayLabel: 'Warranty period',
        type: 'SELECT',
        options: ['No warranty', '3 months', '6 months', '1 year', '2 years', '5 years', 'Lifetime warranty'],
        placeholder: 'Select warranty period',
      },
      {
        name: 'certification',
        displayLabel: 'Certification',
        type: 'SELECT',
        options: ['TBS certified', 'ISO certified', 'CE marked', 'SGS certified', 'No certification stated'],
        placeholder: 'Select certifications',
        filterable: true,
      },
    ],
  },
  {
    name: 'Household & General',
    slug: 'household-general',
    description: 'Home goods, furniture, and general merchandise',
    displayOrder: 100,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Furniture', 'Kitchenware', 'Home decor', 'Bedding & linens', 'Cleaning supplies',
          'Storage solutions', 'Gardening supplies', 'Pet supplies', 'Baby products',
          'Personal care', 'Sports & fitness', 'Toys & games'
        ],
        isRequired: false,
        placeholder: 'Select household category',
        filterable: true,
      },
      {
        name: 'brand',
        displayLabel: 'Brand',
        type: 'TEXT',
        placeholder: 'Brand name',
        searchable: true,
        filterable: true,
      },
      {
        name: 'material',
        displayLabel: 'Material',
        type: 'TEXT',
        placeholder: 'Main material composition',
        searchable: true,
      },
      {
        name: 'dimensions',
        displayLabel: 'Dimensions',
        type: 'TEXT',
        placeholder: 'Product dimensions',
        comparable: true,
      },
      {
        name: 'weight',
        displayLabel: 'Weight',
        type: 'NUMBER',
        unit: 'kg',
        minValue: 0,
        maxValue: 10000,
        placeholder: 'Weight in kilograms',
        comparable: true,
      },
      {
        name: 'color',
        displayLabel: 'Color',
        type: 'TEXT',
        placeholder: 'Primary color or finish',
        filterable: true,
      },
      {
        name: 'condition',
        displayLabel: 'Condition',
        type: 'SELECT',
        options: ['New', 'Used - Like new', 'Used - Good', 'Used - Fair', 'Refurbished'],
        placeholder: 'Select condition',
        filterable: true,
      },
      {
        name: 'assembly_required',
        displayLabel: 'Assembly required',
        type: 'BOOLEAN',
        placeholder: 'Does this item require assembly?',
        filterable: true,
      },
      {
        name: 'care_instructions',
        displayLabel: 'Care instructions',
        type: 'TEXT',
        placeholder: 'Cleaning and maintenance instructions',
      },
      {
        name: 'warranty_period',
        displayLabel: 'Warranty period',
        type: 'SELECT',
        options: ['No warranty', '30 days', '3 months', '6 months', '1 year', '2 years', '5 years'],
        placeholder: 'Select warranty period',
      },
    ],
  },
  {
    name: 'Packaging & Materials',
    slug: 'packaging-materials',
    description: 'Packaging solutions, containers, and raw materials',
    displayOrder: 110,
    attributes: [
      {
        name: 'product_category',
        displayLabel: 'Product category',
        type: 'SELECT',
        options: [
          'Cartons & boxes', 'Bags & pouches', 'Bottles & containers', 'Labels & tags',
          'Protective packaging', 'Food packaging', 'Industrial packaging', 'Raw materials',
          'Adhesives & tapes', 'Strapping & wrapping'
        ],
        isRequired: false,
        placeholder: 'Select packaging category',
        filterable: true,
      },
      {
        name: 'material',
        displayLabel: 'Material',
        type: 'TEXT',
        isRequired: false,
        placeholder: 'Material composition',
        searchable: true,
      },
      {
        name: 'dimensions',
        displayLabel: 'Dimensions',
        type: 'TEXT',
        placeholder: 'Length, width, height, or capacity',
        comparable: true,
      },
      {
        name: 'quantity_per_pack',
        displayLabel: 'Quantity per pack',
        type: 'NUMBER',
        minValue: 1,
        maxValue: 100000,
        placeholder: 'Number of items per pack',
        comparable: true,
      },
      {
        name: 'food_safe',
        displayLabel: 'Food safe',
        type: 'BOOLEAN',
        placeholder: 'Is this packaging food safe?',
        filterable: true,
      },
      {
        name: 'recyclable',
        displayLabel: 'Recyclable',
        type: 'BOOLEAN',
        placeholder: 'Is this packaging recyclable?',
        filterable: true,
      },
      {
        name: 'biodegradable',
        displayLabel: 'Biodegradable',
        type: 'BOOLEAN',
        placeholder: 'Is this packaging biodegradable?',
        filterable: true,
      },
      {
        name: 'certification',
        displayLabel: 'Certification',
        type: 'SELECT',
        options: ['TBS certified', 'ISO certified', 'Food grade certified', 'No certification stated'],
        placeholder: 'Select certifications',
        filterable: true,
      },
    ],
  },
  {
    name: 'Logistics & Delivery Services',
    slug: 'logistics-delivery',
    description: 'Transportation, delivery, and logistics services',
    displayOrder: 120,
    attributes: [
      {
        name: 'service_category',
        displayLabel: 'Service category',
        type: 'SELECT',
        options: [
          'Courier services', 'Freight forwarding', 'Warehousing', 'Moving services',
          'Last-mile delivery', 'Packaging services', 'Cold chain logistics',
          'International shipping', 'Local delivery'
        ],
        isRequired: false,
        placeholder: 'Select service type',
        filterable: true,
      },
      {
        name: 'coverage_area',
        displayLabel: 'Coverage area',
        type: 'TEXT',
        isRequired: false,
        placeholder: 'Cities, regions, or countries served',
        searchable: true,
      },
      {
        name: 'delivery_time',
        displayLabel: 'Delivery time',
        type: 'SELECT',
        options: ['Same day', 'Next day', '2-3 days', '3-5 days', '1-2 weeks', '2-4 weeks', 'Custom schedule'],
        isRequired: false,
        placeholder: 'Select delivery timeframe',
        filterable: true,
      },
      {
        name: 'max_weight',
        displayLabel: 'Maximum weight capacity',
        type: 'NUMBER',
        unit: 'kg',
        minValue: 0,
        maxValue: 100000,
        placeholder: 'Maximum supported weight in kg',
        comparable: true,
      },
      {
        name: 'vehicle_type',
        displayLabel: 'Vehicle type',
        type: 'SELECT',
        options: ['Motorcycle', 'Car', 'Van', 'Small truck', 'Medium truck', 'Large truck', 'Container truck', 'Air freight', 'Sea freight'],
        placeholder: 'Select vehicle type',
        filterable: true,
      },
      {
        name: 'tracking_available',
        displayLabel: 'Tracking available',
        type: 'BOOLEAN',
        placeholder: 'Is shipment tracking available?',
        filterable: true,
      },
      {
        name: 'insurance_included',
        displayLabel: 'Insurance included',
        type: 'BOOLEAN',
        placeholder: 'Is shipment insurance included?',
        filterable: true,
      },
      {
        name: 'special_handling',
        displayLabel: 'Special handling capabilities',
        type: 'SELECT',
        options: ['Fragile items', 'Cold chain', 'Hazardous materials', 'Oversized items', 'Security escorts', 'White glove service'],
        placeholder: 'Select special handling capabilities',
        filterable: true,
      },
    ],
  },
];

// Keep the public taxonomy stable while allowing each domain to retain its
// detailed attribute schema. These aliases prevent repeated seed runs from
// creating both a broad category and a verbose duplicate of it.
const CANONICAL_CATEGORY_ALIASES: Record<string, { slug: string; name: string }> = {
  'electronics-electrical': { slug: 'electronics', name: 'Electronics' },
  'energy-solar': { slug: 'energy', name: 'Energy' },
  'food-beverages': { slug: 'food', name: 'Food' },
  'agriculture-farming': { slug: 'agriculture', name: 'Agriculture' },
  'construction-building': { slug: 'construction', name: 'Construction' },
  'clothing-fashion': { slug: 'clothing', name: 'Clothing' },
  'office-business': { slug: 'office-supplies', name: 'Office Supplies' },
  'logistics-delivery': { slug: 'logistics', name: 'Logistics' },
};

const LEGACY_CATEGORY_IDS = [
  'cat_electronics-electrical', 'cat_energy-solar', 'cat_food-beverages',
  'cat_agriculture-farming', 'cat_construction-building', 'cat_clothing-fashion',
  'cat_office-business', 'cat_logistics-delivery',
];
function stableCategoryId(slug: string): string {
  return 'cat_' + slug;
}

function stableAttributeId(categorySlug: string, attributeName: string): string {
  return 'cat_attr_' + categorySlug + '_' + attributeName;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    let categoriesCreated = 0;
    let categoriesUpdated = 0;
    let attributesCreated = 0;
    let attributesUpdated = 0;

    console.log('[category-attributes] Starting professional taxonomy seeding...');

    for (const categorySeed of CATEGORY_TAXONOMY) {
      const canonical = CANONICAL_CATEGORY_ALIASES[categorySeed.slug] ?? { slug: categorySeed.slug, name: categorySeed.name };
      const categoryId = stableCategoryId(canonical.slug);

      // Upsert category
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });

      await prisma.category.upsert({
        where: { id: categoryId },
        update: {
          name: canonical.name,
          slug: canonical.slug,
          description: categorySeed.description,
          displayOrder: categorySeed.displayOrder,
          isActive: true,
        },
        create: {
          id: categoryId,
          name: canonical.name,
          slug: canonical.slug,
          description: categorySeed.description,
          displayOrder: categorySeed.displayOrder,
          isActive: true,
        },
      });

      if (existingCategory) {
        categoriesUpdated += 1;
      } else {
        categoriesCreated += 1;
        console.log(`[category-attributes] Created category: ${canonical.name}`);
      }

      // Upsert attributes for this category
      for (const [displayOrder, attribute] of categorySeed.attributes.entries()) {
        const attributeId = stableAttributeId(canonical.slug, attribute.name);
        const existingAttribute = await prisma.categoryAttribute.findUnique({
          where: { id: attributeId },
          select: { id: true },
        });

        const attributeData = {
          categoryId: categoryId,
          name: attribute.name,
          displayLabel: attribute.displayLabel,
          type: attribute.type,
          options: attribute.options ?? Prisma.JsonNull,
          isRequired: false,
          displayOrder,
          placeholder: attribute.placeholder ?? null,
        };

        await prisma.categoryAttribute.upsert({
          where: { id: attributeId },
          update: attributeData,
          create: {
            id: attributeId,
            ...attributeData,
          },
        });

        if (existingAttribute) {
          attributesUpdated += 1;
        } else {
          attributesCreated += 1;
        }
      }

      console.log(
        `[category-attributes] Processed ${canonical.name}: ${categorySeed.attributes.length} attributes`
      );
    }

    // Attributes are guidance, never blockers: sellers may provide whatever details apply.
    await prisma.categoryAttribute.updateMany({ data: { isRequired: false } });

    // Reassign products from duplicate verbose IDs before hiding those IDs.
    for (const legacyId of LEGACY_CATEGORY_IDS) {
      const legacySlug = legacyId.slice('cat_'.length);
      const canonical = CANONICAL_CATEGORY_ALIASES[legacySlug];
      if (!canonical) continue;
      const canonicalId = stableCategoryId(canonical.slug);
      if (legacyId === canonicalId) continue;
      await prisma.product.updateMany({ where: { categoryId: legacyId }, data: { categoryId: canonicalId } });
      await prisma.category.updateMany({ where: { id: legacyId }, data: { isActive: false } });
    }
    console.log('\n[category-attributes] Seeding completed successfully:');
    console.log(`  Categories: ${categoriesCreated} created, ${categoriesUpdated} updated`);
    console.log(`  Attributes: ${attributesCreated} created, ${attributesUpdated} updated`);
    console.log(`  Total categories: ${CATEGORY_TAXONOMY.length}`);
    console.log(`  Total attributes: ${CATEGORY_TAXONOMY.reduce((sum, cat) => sum + cat.attributes.length, 0)}`);
  } catch (error) {
    console.error('[category-attributes] Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error('[category-attributes] Fatal error:', error);
  process.exitCode = 1;
});