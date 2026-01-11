# Product Catalog Management - Knowledge Base Integration

---

## Document Purpose

This document explains how product catalog management integrates with the Knowledge Base Service, supporting both new user onboarding and existing customer product management.

**Status**: Draft v1.0
**Date**: 2026-01-11
**Related Docs**:
- onboarding-experience.md (new users)
- knowledge-base-service-architecture.md (technical architecture)
- beauty-ai-product-specification.md (product features)

---

## Table of Contents

1. [Overview](#overview)
2. [New User Journey (Onboarding)](#new-user-journey-onboarding)
3. [Existing Customer Journey](#existing-customer-journey)
4. [Product Data Model Mapping](#product-data-model-mapping)
5. [Migration Path](#migration-path)

---

## Overview

### Two User Contexts

**New Users (Onboarding)**:
- Need to start quickly with minimal friction
- Simple product entry: name, price, optional variants
- Goal: First order captured in <10 minutes
- Simplified UI focused on essentials

**Existing Customers (Product Management)**:
- Need comprehensive product catalog management
- Full product schema: SKU, brand, stock, images, categories, etc.
- Goal: Manage products at scale with rich metadata
- Advanced UI with bulk operations, filtering, search

### Architecture Foundation

All products are stored in the **Knowledge Base Service** using:
- **Collection**: Tenant-specific product catalog
- **Model**: Predefined "product" model (flexible schema)
- **Records**: Individual product entries

This unified approach supports:
- ✅ Simple onboarding for new users
- ✅ Comprehensive management for existing customers
- ✅ Seamless migration from simple to advanced
- ✅ AI agent access to product data via knowledge base tools

---

## New User Journey (Onboarding)

### Simplified Product Entry

During onboarding (Step 3), new users see a streamlined interface:

```
┌──────────────────────────────────────────────────────────┐
│  Add your products                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  Product 1                                                │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Product name * (required)                           ││
│  │ Glow Serum                                           ││
│  │                                                      ││
│  │ Price * (required)    Currency                       ││
│  │ 45.00                 USD                            ││
│  │                                                      ││
│  │ Description (optional)                               ││
│  │ Brightening vitamin C serum                         ││
│  │                                                      ││
│  │ Variants (optional)                                  ││
│  │ • Size: 30ml ($45)                                  ││
│  │ • Size: 50ml ($55)                                  ││
│  │ [+ Add variant]                                     ││
│  └─────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### What Happens Behind the Scenes

When user creates a product during onboarding:

**1. Collection Creation** (first product):
```
POST /knowledge-base/collections.create
{
  tenantId: "user_123",
  name: "Product Catalog",
  type: "structured",
  modelId: "product", // Predefined model
  description: "Beauty products"
}
```

**2. Record Creation** (each product):
```
POST /knowledge-base/records.create
{
  tenantId: "user_123",
  collectionId: "collection_xyz",
  modelId: "product",
  data: {
    // Required fields from onboarding
    name: "Glow Serum",
    price: 4500, // Stored in cents
    currency: "USD",
    description: "Brightening vitamin C serum",

    // Default values for other fields
    inStock: true,
    category: "beauty", // Auto-set based on business type

    // Variant mapping
    attributes: {
      variants: [
        { type: "size", name: "30ml", priceModifier: 0 },
        { type: "size", name: "50ml", priceModifier: 1000 }
      ]
    }
  }
}
```

**3. AI Agent Access**:
The AI can now query products:
```
search_products(query="serum", filters={ inStock: true })
get_product(product_id="prod_123")
```

### Benefits of This Approach

✅ **Simple for users**: Only see essential fields during onboarding
✅ **Extensible**: Products are stored in full schema from day one
✅ **Future-proof**: Can add advanced fields later without data migration
✅ **Consistent**: Same underlying data model for all customers

---

## Existing Customer Journey

### Comprehensive Product Management

After onboarding, or for existing customers, the full product management interface is available:

```
┌──────────────────────────────────────────────────────────┐
│  Product Catalog (247 products)         [+ Add Product]  │
├──────────────────────────────────────────────────────────┤
│  🔍 Search: [                    ]  [Filters ▼] [Sort ▼] │
│                                                           │
│  Filters Active: Category: Skincare, In Stock: Yes       │
│  [Clear Filters]                                          │
├──────────────────────────────────────────────────────────┤
│  View: [Grid] [List] [Table]        Export: [CSV] [PDF]  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ [📷]  SKU: GLW-001                                 │ │
│  │       Glow Serum - Vitamin C Brightening           │ │
│  │       Brand: GlowCo | Category: Skincare > Serum   │ │
│  │       Price: $45.00 | Stock: 127 units             │ │
│  │       Variants: 2 (30ml, 50ml)                     │ │
│  │       Tags: vitamin-c, brightening, anti-aging     │ │
│  │       ● In Stock | 🌐 Online | ⭐ 4.8 (234 reviews)│ │
│  │       [Edit] [Duplicate] [View Analytics] [Delete]│ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ [📷]  SKU: HDR-002                                 │ │
│  │       Hydra Cream - Deep Hydration                 │ │
│  │       Brand: GlowCo | Category: Skincare > Cream   │ │
│  │       Price: $55.00 | Stock: 89 units              │ │
│  │       Sale: $44.00 (20% off) until 2026-02-01     │ │
│  │       ● In Stock | 🌐 Online | ⭐ 4.9 (189 reviews)│ │
│  │       [Edit] [Duplicate] [View Analytics] [Delete]│ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Advanced Product Editor

**Full Product Form** (accessed via "Edit" or "Add Product"):

```
┌──────────────────────────────────────────────────────────┐
│  Edit Product: Glow Serum                    [Save] [×]  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Basic Information                                        │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Product Name *                                      ││
│  │ Glow Serum - Vitamin C Brightening                  ││
│  │                                                      ││
│  │ SKU *              Brand                             ││
│  │ GLW-001            GlowCo                            ││
│  │                                                      ││
│  │ Category *         Subcategory                       ││
│  │ Skincare ▼         Serum ▼                           ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  Pricing & Stock                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Price *            Currency                          ││
│  │ 45.00              USD ▼                             ││
│  │                                                      ││
│  │ Sale Price         Valid Until                       ││
│  │ (optional)         (optional)                        ││
│  │                                                      ││
│  │ [✓] Track Inventory                                 ││
│  │ Stock Quantity: 127 units                           ││
│  │ [✓] In Stock    [ ] Allow Backorders                ││
│  │                                                      ││
│  │ Low Stock Alert: 10 units                           ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  Description & Media                                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Short Description (for listings)                     ││
│  │ Brightening vitamin C serum for radiant skin        ││
│  │                                                      ││
│  │ Full Description (rich text editor)                 ││
│  │ [B] [I] [U] [Link] [List] [Image]                   ││
│  │ ┌───────────────────────────────────────────────┐  ││
│  │ │ Our award-winning Glow Serum features 15%     │  ││
│  │ │ vitamin C to brighten and even skin tone...   │  ││
│  │ └───────────────────────────────────────────────┘  ││
│  │                                                      ││
│  │ Images (drag to reorder)                            ││
│  │ [📷] [📷] [📷] [+ Upload]                           ││
│  │ Main  Alt1 Alt2                                     ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  Variants                                                 │
│  ┌─────────────────────────────────────────────────────┐│
│  │ [+ Add Variant Type]                                ││
│  │                                                      ││
│  │ Size                                                 ││
│  │ ┌─────────────────────────────────────────────────┐││
│  │ │ • 30ml - $45.00 (base) - Stock: 65  [Edit] [×] │││
│  │ │ • 50ml - $55.00 (+$10) - Stock: 62  [Edit] [×] │││
│  │ └─────────────────────────────────────────────────┘││
│  │                                                      ││
│  │ [+ Add Size Option]                                 ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  Tags & Attributes                                        │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Tags (for search and organization)                  ││
│  │ [vitamin-c] [brightening] [anti-aging] [+ Add]      ││
│  │                                                      ││
│  │ Custom Attributes                                    ││
│  │ • Skin Type: All                                    ││
│  │ • Key Ingredient: Vitamin C 15%                     ││
│  │ • Cruelty Free: Yes                                 ││
│  │ • Vegan: Yes                                        ││
│  │ [+ Add Attribute]                                   ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  Online Presence                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Product URL                                          ││
│  │ https://glowco.com/products/glow-serum              ││
│  │                                                      ││
│  │ [✓] Show on Website    [✓] Available for Purchase   ││
│  │ [ ] Featured Product   [ ] New Arrival              ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  SEO & Metadata                                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Meta Title                                           ││
│  │ Glow Serum - Vitamin C Brightening Serum | GlowCo   ││
│  │                                                      ││
│  │ Meta Description                                     ││
│  │ Award-winning vitamin C serum for brighter skin...  ││
│  └─────────────────────────────────────────────────────┘│
│                                                           │
│  [Cancel] [Save as Draft] [Save & Publish]               │
└──────────────────────────────────────────────────────────┘
```

### Bulk Operations

**CSV Import/Export**:
```
┌──────────────────────────────────────────────────────────┐
│  Bulk Import Products                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  [📥 Download Full Template] - All available fields      │
│  [📥 Download Simple Template] - Essential fields only   │
│                                                           │
│  Upload CSV File                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Drag CSV file here or [Browse]                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  Options:                                                 │
│  ( ) Add new products only                                │
│  (•) Update existing + add new (match by SKU)             │
│  ( ) Replace entire catalog (destructive!)                │
│                                                           │
│  [Cancel] [Preview Import]                                │
└──────────────────────────────────────────────────────────┘
```

**CSV Format (Full Template)**:
```csv
sku,name,brand,category,subcategory,price,currency,salePrice,inStock,stockQuantity,description,shortDescription,imageUrl,productUrl,tags,attributes
GLW-001,Glow Serum - Vitamin C,GlowCo,Skincare,Serum,45.00,USD,,true,127,"Award-winning serum...","Brightening serum",https://cdn.../glow.jpg,https://glowco.com/products/glow-serum,"vitamin-c,brightening","{""skinType"":""All"",""vegan"":true}"
HDR-002,Hydra Cream,GlowCo,Skincare,Cream,55.00,USD,44.00,true,89,"Deep hydration...","Hydration cream",https://cdn.../hydra.jpg,https://glowco.com/products/hydra,"hydration,moisturizer","{""skinType"":""Dry"",""vegan"":true}"
```

### Advanced Features

**1. Inventory Management**:
- Real-time stock tracking
- Low stock alerts
- Automatic "out of stock" status
- Backorder support
- Inventory history log

**2. Product Analytics**:
```
┌──────────────────────────────────────────────────────────┐
│  Product Analytics: Glow Serum                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  Last 30 Days                                             │
│                                                           │
│  Performance Metrics                                      │
│  ┌────────────┬────────────┬────────────┬────────────┐  │
│  │  Views     │   Orders   │ Conversion │  Revenue   │  │
│  │  2,847     │     234    │   8.2%     │  $10,530   │  │
│  │  ↑ 12%     │   ↑ 18%    │  ↑ 4.2%    │  ↑ 21%     │  │
│  └────────────┴────────────┴────────────┴────────────┘  │
│                                                           │
│  Customer Questions (AI-handled)                          │
│  • "How much is this?" - 89 times                        │
│  • "What size should I get?" - 67 times                  │
│  • "Is this in stock?" - 45 times                        │
│                                                           │
│  Popular Variants                                         │
│  • 50ml (60%) - 141 orders                               │
│  • 30ml (40%) - 93 orders                                │
│                                                           │
│  [View Full Report] [Export Data]                        │
└──────────────────────────────────────────────────────────┘
```

**3. Product Relationships**:
- Related products
- Frequently bought together
- Upsell/cross-sell suggestions
- Product bundles

**4. Multi-channel Management**:
- Sync with e-commerce platforms (Shopify, WooCommerce)
- Manage across multiple sales channels
- Centralized product data

---

## Product Data Model Mapping

### Onboarding Fields → Knowledge Base Product Model

| Onboarding Field | Knowledge Base Field | Notes |
|------------------|---------------------|-------|
| **name** | `name` | Direct mapping |
| **price** | `price` | Converted to cents (45.00 → 4500) |
| **currency** | `currency` | Direct mapping (USD, EUR, VND) |
| **description** | `description` | Maps to richtext field |
| **variants** | `attributes.variants` | Structured array in attributes |
| - | `sku` | Auto-generated if not provided |
| - | `category` | Auto-set based on business type |
| - | `inStock` | Default: true |
| - | `brand` | Optional, can add later |
| - | `images` | Empty array initially |
| - | `tags` | Auto-generated from name/description |
| - | `stockQuantity` | null (not tracked initially) |
| - | `url` | null initially |

### Simple Product Example (Onboarding)

**User Input**:
```javascript
{
  name: "Glow Serum",
  price: 45.00,
  currency: "USD",
  description: "Brightening vitamin C serum",
  variants: [
    { type: "size", name: "30ml", priceModifier: 0 },
    { type: "size", name: "50ml", priceModifier: 10 }
  ]
}
```

**Stored in Knowledge Base**:
```javascript
{
  recordId: "prod_01HN7...",
  modelId: "product",
  data: {
    // From user input
    name: "Glow Serum",
    price: 4500, // Cents
    currency: "USD",
    description: "Brightening vitamin C serum",

    // Auto-generated
    sku: "PROD-01HN7",
    category: "beauty",
    subcategory: "serum",
    inStock: true,

    // Variant mapping
    attributes: {
      variants: [
        { type: "size", name: "30ml", priceModifier: 0 },
        { type: "size", name: "50ml", priceModifier: 1000 }
      ]
    },

    // Auto-generated from description
    tags: ["vitamin-c", "brightening", "serum"],

    // Optional fields (null/empty)
    brand: null,
    salePrice: null,
    stockQuantity: null,
    images: [],
    url: null
  },
  createdAt: "2026-01-11T10:00:00Z",
  updatedAt: "2026-01-11T10:00:00Z"
}
```

### Full Product Example (Existing Customer)

**Complete Product Record**:
```javascript
{
  recordId: "prod_01HN7...",
  modelId: "product",
  data: {
    // Core fields
    sku: "GLW-001",
    name: "Glow Serum - Vitamin C Brightening",
    description: "Award-winning vitamin C serum with 15% L-ascorbic acid...",
    category: "skincare",
    subcategory: "serum",
    brand: "GlowCo",

    // Pricing
    price: 4500, // $45.00
    currency: "USD",
    salePrice: null,

    // Inventory
    inStock: true,
    stockQuantity: 127,

    // Media
    images: [
      "https://cdn.glowco.com/products/glow-serum-main.jpg",
      "https://cdn.glowco.com/products/glow-serum-texture.jpg",
      "https://cdn.glowco.com/products/glow-serum-ingredients.jpg"
    ],

    // Attributes (includes variants)
    attributes: {
      variants: [
        {
          type: "size",
          name: "30ml",
          priceModifier: 0,
          sku: "GLW-001-30",
          stockQuantity: 65
        },
        {
          type: "size",
          name: "50ml",
          priceModifier: 1000,
          sku: "GLW-001-50",
          stockQuantity: 62
        }
      ],
      skinType: "All",
      keyIngredient: "Vitamin C 15%",
      crueltyFree: true,
      vegan: true,
      featured: false,
      newArrival: false
    },

    // Discoverability
    tags: ["vitamin-c", "brightening", "anti-aging", "bestseller"],
    url: "https://glowco.com/products/glow-serum",

    // SEO
    metaTitle: "Glow Serum - Vitamin C Brightening Serum | GlowCo",
    metaDescription: "Award-winning vitamin C serum for brighter, more radiant skin..."
  },
  searchText: "glow serum vitamin c brightening skincare...",
  createdAt: "2026-01-11T10:00:00Z",
  updatedAt: "2026-01-15T14:23:11Z"
}
```

---

## Migration Path

### From Simple to Advanced

As customers grow, they naturally migrate from simple to advanced product management:

**Phase 1: Onboarding (Day 1)**
- Add 3-5 products with basic info
- Name, price, optional variants
- Goal: Get started quickly

**Phase 2: Initial Operations (Weeks 1-4)**
- Add more products (10-50)
- Start adding descriptions for AI
- Maybe add images
- Using simple UI

**Phase 3: Growth (Months 2-6)**
- Bulk import 50+ products
- Add SKUs for inventory tracking
- Add brands and categories
- Enable stock management
- Start using filters and search

**Phase 4: Scale (6+ months)**
- Hundreds of products
- Full inventory tracking
- Product analytics
- Multi-channel sync
- Advanced bulk operations
- Custom attributes

### Progressive Disclosure

The UI adapts to customer maturity:

**New Customer** (first 30 days):
```
Product Form shows:
✓ Name, Price, Description
✓ Basic variants
× SKU (optional, hidden)
× Stock tracking (off by default)
× SEO fields (hidden)
× Analytics (not enough data)
```

**Established Customer** (30+ days, 20+ products):
```
Product Form shows:
✓ All basic fields
✓ SKU (encouraged)
✓ Stock tracking (suggested)
✓ Categories and tags
× Advanced attributes (hidden until enabled)
× SEO fields (optional)
✓ Analytics (basic metrics)
```

**Power Customer** (6+ months, 100+ products):
```
Product Form shows:
✓ All fields visible
✓ Bulk operations prominent
✓ Advanced filters
✓ Full analytics dashboard
✓ API access suggested
✓ Integration options
```

### Zero Data Migration

Because simple products are stored in the full schema from day one:
- ✅ No data migration needed
- ✅ Just reveal more fields in UI
- ✅ Gradual feature adoption
- ✅ Backward compatible

**Example**:
A product created during onboarding with just name and price already has the full product model structure. Adding a SKU later is just updating an existing field, not a schema migration.

---

## UI Decision Tree

### When to Show Simple vs. Advanced

```
Is user in onboarding flow?
├─ YES → Show Simple Product Entry
│         (name, price, variants only)
│
└─ NO → Check customer maturity
        │
        ├─ < 30 days, < 20 products
        │  → Show Intermediate UI
        │     (+ SKU, + stock toggle, + images)
        │
        ├─ 30+ days, 20-100 products
        │  → Show Advanced UI
        │     (+ categories, + full stock, + analytics)
        │
        └─ 100+ products
           → Show Power UI
              (+ bulk ops, + SEO, + integrations)
```

### UI Complexity Settings

Let users choose their UI complexity:

```
Settings > Product Management

View Complexity:
( ) Simple - Just the essentials
(•) Intermediate - Common fields (recommended)
( ) Advanced - All fields and options
( ) Power User - Everything + bulk tools

[Save Preferences]
```

---

## Summary

### Key Principles

1. **Same Model, Different Views**: All products use the Knowledge Base product model, but UI adapts to user needs
2. **Progressive Enhancement**: Start simple, reveal complexity as needed
3. **Zero Migration**: Products are "future-ready" from day one
4. **Context-Aware**: Onboarding vs. existing customer determines UI
5. **Flexible**: Customers can opt-in to advanced features anytime

### Benefits

**For New Users**:
- Fast onboarding (<10 minutes)
- Not overwhelmed by fields
- Can add products without learning curve

**For Existing Customers**:
- Full product management capabilities
- Rich metadata for better AI responses
- Scalable to hundreds/thousands of products
- Advanced operations (bulk, analytics, integrations)

**For Engineering**:
- Single data model to maintain
- No schema migrations
- Reusable Knowledge Base Service
- API-first design

---

**Document Status**: Draft v1.0
**Last Updated**: 2026-01-11
**Next Steps**: Review with engineering team, validate UI mockups with designers
**Owner**: Product Team
