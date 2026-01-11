# Knowledge Base - Product Specification

---

## Document Purpose

This document describes the Knowledge Base feature from a product perspective, focusing on how it works and how users interact with it to provide their AI assistant with custom knowledge and structured data.

**Status**: Draft v2.0
**Date**: 2026-01-11
**Related Docs**:
- knowledge-base-service-architecture.md (technical architecture)
- product-catalog-kb-integration.md (product catalog integration)
- beauty-ai-product-specification.md (main product spec)

---

## Table of Contents

1. [Overview](#overview)
2. [Unstructured Content](#unstructured-content)
3. [Structured Data](#structured-data)
4. [Model Definition & Management](#model-definition--management)
5. [How AI Uses Knowledge](#how-ai-uses-knowledge)
6. [Content Organization](#content-organization)
7. [Real-World Workflows](#real-world-workflows)

---

## Overview

### What is the Knowledge Base?

The Knowledge Base is a dual-system for teaching AI about your business:

**Unstructured Content**: Documents, images, web pages, and text that the AI can search through and reference. Think of this as giving your AI a library to read from.

**Structured Data**: Organized information in defined formats (like a database). Think of this as giving your AI specific facts it can look up precisely.

### The Core Problem

An AI assistant without knowledge can only give generic answers. It doesn't know:
- Your specific products and their details
- Your company policies and procedures
- Your brand voice and messaging
- Your business rules and constraints

The Knowledge Base solves this by making business-specific information accessible to the AI during conversations.

### How It Works (High Level)

**For Unstructured Content**:
1. You provide documents, images, or web pages
2. System extracts and processes the content
3. Content is broken into searchable chunks
4. AI searches these chunks during conversations
5. AI cites relevant passages in responses

**For Structured Data**:
1. You define what type of information you have (a "model")
2. You add individual records to that model
3. AI can query, filter, and retrieve specific records
4. AI presents structured information accurately

---

## Unstructured Content

### What Counts as Unstructured?

**Documents**:
- PDFs (product catalogs, policies, guides)
- Word documents (.docx)
- Text files (.txt, .md)
- Presentations (in future)

**Images**:
- Product images with embedded text
- Infographics and charts
- Screenshots of policies or procedures
- Photos with captions

**Web Content**:
- Help center articles
- Blog posts
- Product pages
- FAQ pages on your website

### The Upload-to-Search Journey

**Step 1: Upload**
User provides content by:
- Uploading files directly
- Providing URLs to scrape
- Connecting entire website sections
- Pasting text content

**Step 2: Processing**

The system performs several operations:

**Text Extraction**:
- PDFs: Extract text while preserving formatting context
- Images: OCR (optical character recognition) to extract visible text
- Word docs: Convert to plain text with structure markers
- Web pages: Extract main content, ignore navigation/ads

**Chunking**:
Content is split into logical segments because:
- AI can't read entire documents at once
- Need to find specific relevant sections
- Improve search precision

Chunking strategies:
- **Paragraph-based**: Split on paragraph breaks (natural for articles)
- **Semantic**: Keep related ideas together (better for complex docs)
- **Fixed-size**: Set number of words with overlap (predictable results)

Example: A 10-page product guide becomes ~40 chunks, each representing a coherent section (one product, one Q&A, one procedure, etc.)

**Metadata Tagging**:
System automatically identifies:
- Document title and source
- Date information
- Section headings
- Key entities (product names, brands, categories)
- Language

**Making it Searchable**:
Each chunk becomes searchable through:
- **Keyword search**: Find exact words or phrases
- **Semantic search**: Find meaning, even with different words
  - Customer: "gentle cleanser for babies"
  - Finds: "mild, hypoallergenic face wash suitable for infants"

**Step 3: Indexing**

Content is indexed for fast retrieval:
- Chunks stored with their context (which document, which section)
- Searchable by keywords, semantics, metadata
- Ranked by relevance to queries

**Step 4: AI Access**

When customer asks a question:
1. AI generates search query from customer's question
2. System searches all indexed chunks
3. Returns top 5-10 most relevant chunks
4. AI reads chunks and composes answer
5. AI optionally cites which document/section it used

### Working with Images

**How Image Content Works**:

Images are processed differently than text:

**Text in Images** (OCR):
- System extracts any visible text
- Product labels, ingredient lists, instructions
- Charts, graphs, infographics
- Text becomes searchable like document content

**Image Descriptions** (Future: Vision AI):
- System can describe what's in the image
- "Product photo showing serum bottle with pump dispenser"
- "Before/after comparison showing skin improvement"
- Descriptions become searchable

**Image Metadata**:
- User can add captions and descriptions
- Alt text becomes searchable
- Tags help categorize images

**Example Use Case**:
You upload a product catalog PDF with images:
- Text extraction: Gets product names, prices, descriptions
- OCR: Reads text on product packaging in photos
- User adds: Tags like "skincare", "bestseller"
- Result: AI can answer "show me bestselling skincare products" and describe them using extracted info

### Website Syncing

**How It Works**:

Instead of manually uploading, you can sync website sections:

**Initial Sync**:
1. You provide starting URL (e.g., help.myshop.com)
2. System crawls all linked pages under that URL
3. Extracts main content from each page
4. Processes same as uploaded documents
5. Creates searchable knowledge base

**Ongoing Sync**:
- System re-checks pages on schedule (daily, weekly)
- Detects changes, additions, deletions
- Updates knowledge base automatically
- You see what changed in activity log

**Why This Matters**:
- Keep knowledge base current without manual work
- Your help center updates = AI knowledge updates
- Write once (on website), AI learns automatically

**Sync Scope Control**:
You control what gets synced:
- Include: /help/*, /blog/*, /guides/*
- Exclude: /admin/*, /cart/*, /checkout/*
- Follow: Sitemap XML for structured sites

### Content Quality

**What Makes Good Unstructured Content**:

**Clear Writing**:
- Use simple, direct language
- Short paragraphs and sentences
- Descriptive headings

**Comprehensive Coverage**:
- Answer questions fully
- Include context and examples
- Link related information

**Current Information**:
- Update outdated content
- Add dates to time-sensitive info
- Archive obsolete content

**Well-Organized**:
- Logical document structure
- Clear section headings
- Consistent formatting

**Example - Poor vs. Good**:

Poor document:
```
Returns
You can return stuff. Email us.
```

Good document:
```
Return Policy

Eligibility:
Items can be returned within 30 days of delivery if they are:
- Unopened and unused
- In original packaging
- Not marked as final sale

How to Return:
1. Email returns@myshop.com with your order number
2. We'll send a prepaid return label within 24 hours
3. Pack item securely and attach label
4. Drop off at any postal location
5. Refund processed within 5 business days of receiving return

Questions? Contact support@myshop.com or chat with us.
```

The good version gives AI everything needed to answer customer questions confidently.

---

## Structured Data

### What is Structured Data?

Structured data is information organized in a specific format, like a spreadsheet or database. Each piece of information has defined fields.

**Example**: A product record
- Name: Glow Serum
- Price: $45
- Category: Skincare
- In Stock: Yes
- Variants: 30ml, 50ml

Versus unstructured text: "We have a Glow Serum in our skincare line for $45, available in 30ml and 50ml sizes, currently in stock."

### Why Use Structured Data?

**Precision**:
- AI can find exact matches ("products under $50")
- No ambiguity or interpretation needed
- Reliable filtering and sorting

**Efficiency**:
- Faster lookups than searching documents
- Can combine multiple filters
- Results are consistent

**Data Integrity**:
- Required fields ensure completeness
- Type validation (numbers are numbers, dates are dates)
- Easier to maintain and update

**Example Query Comparison**:

Unstructured: "Find all vegan skincare products under $50 in stock"
- AI searches documents
- May miss some products
- Depends on how products are described
- Uncertain if found everything

Structured: Query with filters
- Category = "Skincare"
- Tags contains "vegan"
- Price < $50
- In Stock = true
- Guaranteed to find all matching products

### Predefined Models

We provide common models out-of-the-box:

**Product Model**:
For e-commerce catalogs. Includes fields like:
- Core: SKU, name, brand, category
- Pricing: price, currency, sale price
- Inventory: in stock, quantity
- Rich: description, images, attributes
- Discovery: tags, search keywords

**FAQ Model**:
For question/answer pairs. Fields:
- Question (searchable)
- Answer (rich text)
- Category (for grouping)
- Priority (AI ranking)
- Related FAQs

**Policy Model**:
For company policies. Fields:
- Title, category, summary
- Full policy content (rich text)
- Effective dates, version
- Keywords for search

**Order Model** (for customer support):
For looking up customer orders. Fields:
- Order number, customer info
- Items, prices, totals
- Status, tracking info
- Dates (ordered, shipped, delivered)

These models are ready to use immediately. You just add records to them.

### When to Use Structured vs. Unstructured

**Use Structured Data When**:
- Information fits a consistent format
- You need precise filtering/searching
- You'll update frequently
- Data has clear fields (name, price, date, etc.)
- You want guaranteed accuracy

Examples: Products, FAQs, promotions, store locations, team members

**Use Unstructured Content When**:
- Information is narrative or explanatory
- Format varies document to document
- Content is long-form (guides, articles)
- You're uploading existing documents
- Information is contextual rather than discrete facts

Examples: Help articles, brand stories, tutorials, blog posts, policies (can be either)

**Often Use Both**:
Example - Product knowledge:
- Structured: Product catalog (names, prices, stock)
- Unstructured: Product guides (how to use, tips, ingredients deep-dive)

AI uses both: Structured for factual lookups, unstructured for detailed explanations.

---

## Model Definition & Management

### Understanding Models

A **model** is a template that defines what information you'll store and how it's organized.

Think of it like designing a form:
- What questions do you need answers to?
- What type of answer (text, number, yes/no, etc.)?
- Which questions are required?
- How will you search this information later?

### Creating a Custom Model

**The Thinking Process**:

1. **What are you managing?**
   Example: "Customer loyalty tiers"

2. **What information defines each item?**
   Example: Each tier has:
   - Name (Bronze, Silver, Gold)
   - Points required to reach it
   - Benefits you get
   - Badge color

3. **What types of information are these?**
   - Name: Text (short)
   - Points: Number
   - Benefits: Text (long, formatted)
   - Badge color: Color/text

4. **How will you search/filter this?**
   - By tier name
   - By points threshold
   - By benefits (search text)

5. **What's required vs. optional?**
   - Name: Required
   - Points: Required
   - Benefits: Required
   - Badge color: Optional

### Model Creation Workflow

**Step 1: Name and Describe the Model**

Give it a clear name:
- ✓ "Loyalty Tiers"
- ✓ "Promotional Campaigns"
- ✓ "Store Locations"
- ✗ "Stuff" (too vague)
- ✗ "Data" (not descriptive)

Add description to help AI understand:
"Customer loyalty program tiers, including point thresholds and tier-specific benefits"

This description helps AI know when to use this model during conversations.

**Step 2: Define Fields**

For each field, specify:

**Field Name**: What you're storing
- Use clear, descriptive names
- Examples: "tier_name", "points_required", "benefits"

**Field Type**: What kind of data
- **Text (short)**: Names, titles, SKUs (< 200 chars)
- **Text (long)**: Descriptions, notes, content
- **Rich Text**: Formatted content (bullets, bold, links)
- **Number**: Prices, quantities, scores
- **True/False**: Yes/no questions, feature flags
- **Date**: Deadlines, effective dates, timestamps
- **List**: Multiple items (tags, categories)
- **Link**: URLs, references

**Required or Optional**:
- Required: Must have value to save record
- Optional: Can be blank

**Searchable**:
- Yes: Include in AI search queries
- No: Just store, don't search

**Example Field Definitions**:

Field: "tier_name"
- Type: Text (short)
- Required: Yes
- Searchable: Yes
- Description: "Name of the loyalty tier"

Field: "points_required"
- Type: Number
- Required: Yes
- Searchable: No
- Description: "Points needed to reach this tier"

Field: "benefits"
- Type: Rich Text
- Required: Yes
- Searchable: Yes
- Description: "List of benefits for this tier"

Field: "badge_icon"
- Type: Link (URL)
- Required: No
- Searchable: No
- Description: "URL to tier badge image"

**Step 3: Add Initial Records**

Once model is defined, add actual data:

Record 1:
- tier_name: "Bronze"
- points_required: 0
- benefits: "• Free shipping over $50\n• Birthday discount\n• Early sale access"
- badge_icon: "https://cdn.myshop.com/badges/bronze.png"

Record 2:
- tier_name: "Silver"
- points_required: 1000
- benefits: "• All Bronze benefits\n• 10% off all orders\n• Free express shipping\n• Priority support"
- badge_icon: "https://cdn.myshop.com/badges/silver.png"

And so on...

### Model Management

**Versioning**:

Models can evolve. When you change a model:

**Adding Fields**:
- Safe operation
- Existing records get new field (empty)
- Can set default value for new field

Example: Add "renewal_date" field to loyalty tiers
- Existing Bronze, Silver, Gold records unchanged
- New field available for future records
- Can backfill if needed

**Removing Fields**:
- Requires confirmation (data will be deleted)
- System warns which records are affected
- Option to export data first

**Changing Field Types**:
- Risky operation
- System attempts conversion (text → number, etc.)
- May fail if incompatible
- Preview changes before applying

**Field Renaming**:
- Safe operation
- System preserves data, just changes label
- AI re-trains with new field name

**Model Versions**:

System tracks version history:
- Version 1.0: Initial model (3 fields)
- Version 1.1: Added "badge_icon" field
- Version 2.0: Added "renewal_benefits" field, changed "points_required" to "points_threshold"

You can:
- View version history
- See what changed when
- Rollback if needed (with data migration)

### Working with Records

**Adding Records**:

Two ways to add data:

**Form Entry** (for small numbers):
- Fill out form for each record
- Validate as you type
- Save individually
- Good for 1-50 records

**Bulk Import** (for large numbers):
- Export template CSV
- Fill in spreadsheet
- Upload CSV
- System validates and imports
- Good for 50+ records

**Editing Records**:

Find and edit:
- Search or browse to find record
- Click to edit
- Change values
- Save (validates changes)

**Bulk Editing**:
- Select multiple records
- Change common field across all
- Example: Mark 20 products as "on sale"

**Deleting Records**:
- Individual: Delete one record
- Bulk: Select and delete multiple
- Soft delete: Mark deleted, can restore
- Hard delete: Permanent removal

**Data Validation**:

System enforces rules:
- Required fields must have values
- Numbers must be numeric
- Dates must be valid dates
- Links must be valid URLs
- Unique fields can't have duplicates

Example validation errors:
- ✗ "Price: abc" → Must be a number
- ✗ "Date: tomorrow" → Must be YYYY-MM-DD format
- ✗ "SKU: GLW-001" → Already exists, SKU must be unique

### Model Relationships

**Connecting Models**:

Sometimes models relate to each other:

**Example**: Products and Categories

Instead of typing category name in every product, create:
- Category model (list of all categories)
- Product model has "category" field that references Category model

Benefits:
- Consistency (can't misspell "Skincare" as "Skin care")
- Easy bulk changes (rename category once, all products update)
- Can add category metadata (description, image)

**Example**: Orders and Products

Order model can reference Product model:
- Order has "items" field
- Each item references a product ID
- AI can look up product details for each order item

**Relationship Types**:

**One-to-Many**:
- One category has many products
- One customer has many orders

**Many-to-Many**:
- Products have many tags
- Tags apply to many products

**Reference vs. Embed**:
- Reference: Store just the ID, look up details when needed (keeps data in sync)
- Embed: Copy all data into record (faster, but can become outdated)

For most use cases, references work better.

### Model Templates

To make model creation easier, we provide templates:

**Store Locations**:
Pre-configured fields:
- Name, address, city, state, zip, country
- Phone, email, hours
- Services available
- Coordinates (for maps)

**Team Members**:
Pre-configured fields:
- Name, role, department
- Bio, photo, specialties
- Contact info
- Availability/schedule

**Promotions**:
Pre-configured fields:
- Name, description, discount type
- Code, start/end dates
- Conditions, exclusions
- Active status

**Events**:
Pre-configured fields:
- Name, description, date/time
- Location, capacity
- Registration link
- Tags/categories

You can use these as-is or customize them to fit your needs.

### Migrating Data

**From External Systems**:

If you have data elsewhere (spreadsheet, another platform), you can import:

**Export from Source**:
- Download as CSV/Excel
- Clean up data if needed
- Map columns to model fields

**Import to Knowledge Base**:
- Create model (or use predefined)
- Map CSV columns to model fields
- Preview import (shows how data will look)
- Validate (shows errors)
- Import (creates all records)

**Example**: Shopify product export
- Export products from Shopify as CSV
- Create Product model in Knowledge Base
- Map: Shopify "Title" → Product "name"
- Map: Shopify "Price" → Product "price"
- Import 500 products at once

**Keeping in Sync**:

For ongoing sync:
- One-time import: Manual CSV uploads when needed
- Scheduled import: Auto-import CSV from URL daily
- API integration: Real-time sync via API (future)

---

## How AI Uses Knowledge

### Search and Retrieval Process

**Unstructured Content Search**:

1. **Customer asks question**: "What's your return policy?"

2. **AI analyzes question**:
   - Key concepts: return, policy
   - Intent: policy information
   - Entities: none specific

3. **AI searches knowledge base**:
   - Keyword search: "return policy"
   - Semantic search: documents about returns, refunds, exchanges
   - Filters: policy documents, FAQ category "returns"

4. **System returns relevant chunks**:
   - Return Policy document (chunk 1): Eligibility section
   - Return Policy document (chunk 2): Process section
   - FAQ: "How do I return an item?" (answer)
   - Ranked by relevance

5. **AI composes response**:
   - Reads top 3-5 chunks
   - Synthesizes into coherent answer
   - Cites source: "Per our Return Policy..."

**Structured Data Query**:

1. **Customer asks**: "Do you have vitamin C serums under $50?"

2. **AI analyzes question**:
   - Key concepts: vitamin C, serum, price constraint
   - Intent: product search
   - Filters needed: category, ingredients, price

3. **AI constructs query**:
   - Model: Products
   - Filters:
     - category contains "serum"
     - (description contains "vitamin C" OR tags contains "vitamin-c")
     - price < 5000 (in cents)
     - inStock = true
   - Sort: by price ascending

4. **System returns matching records**:
   - Glow Serum ($45) ✓
   - Bright Serum ($38) ✓
   - Radiance Boost ($42) ✓

5. **AI presents results**:
   - Lists products with details
   - Highlights relevant info
   - Offers to narrow down further

### Hybrid Search

Often AI uses both types together:

**Example**: "Tell me about your best vitamin C product"

AI performs:

1. **Structured search** (Products model):
   - Filter: tags contains "vitamin-c"
   - Sort: by rating or sales
   - Get top product: Glow Serum

2. **Unstructured search** (Documents):
   - Search: "glow serum vitamin c benefits"
   - Find: Product guide with detailed info
   - Find: Customer reviews/testimonials

3. **Combine**:
   - Product details from structured data (price, stock, variants)
   - Rich description from unstructured content
   - Complete, informative response

### Confidence Scoring

AI assesses confidence in its answers:

**High Confidence** (90-100%):
- Found exact match in structured data
- Or found clear, direct answer in document
- Response: AI answers confidently

**Medium Confidence** (70-89%):
- Found related information, not exact
- Or found answer but missing details
- Response: AI answers but may ask clarifying questions

**Low Confidence** (<70%):
- Couldn't find relevant information
- Or found conflicting information
- Response: AI says "I don't have that information, let me connect you with the team"

**Factors Affecting Confidence**:
- How well question matches knowledge base
- How recent the information is
- How complete the information is
- Whether multiple sources agree

### Knowledge Gaps

When AI can't answer confidently, system tracks this:

**Gap Detection**:
- Question asked: "Are your products cruelty-free?"
- AI confidence: 45% (low)
- Search results: No direct mention in documents
- Action: Log as potential knowledge gap

**Gap Analysis**:
After 20+ similar questions with low confidence:
- System identifies pattern
- Suggests adding content
- Can auto-generate FAQ from pattern

**Example Gap Report**:
"23 customers asked about cruelty-free products in the last 30 days. Your AI couldn't answer confidently because:
- No document mentions animal testing
- Products don't have 'cruelty-free' tag
- No FAQ covers this topic

Suggestion: Add an FAQ 'Are your products cruelty-free?' or add to policy documents"

### Citation and Sources

**When AI Cites Sources**:

Strong factual claims get citations:
- Policies (return terms, shipping times)
- Specific product details
- Prices and availability
- Dates and deadlines

**Citation Format**:
"Per our Return Policy, items can be returned within 30 days..."
"According to our Shipping Guide..."
"This product contains vitamin C (from Product Catalog)..."

**Why Citation Matters**:
- Builds trust (shows answer is from official source)
- Helps user verify information
- Makes it clear info is from business, not AI invention

**When AI Doesn't Cite**:
- General, common knowledge responses
- Conversational elements
- Synthesized information from multiple sources

---

## Content Organization

### Collections

**What Are Collections?**:

Collections are containers for grouping related knowledge. Think of them as folders or categories.

**Why Use Collections**:

**Organization**:
- Keep related content together
- Easier to find and manage
- Clear structure for you and AI

**Access Control** (future):
- Some collections public, others private
- Control which agents see which collections

**Search Scoping**:
- AI can search specific collections
- More precise results
- Faster searches

**Example Collection Structure**:

```
Your Knowledge Base
│
├── Product Information
│   ├── Product Catalog (structured: products)
│   ├── Product Guides (unstructured: documents)
│   └── Ingredient Glossary (unstructured: document)
│
├── Customer Support
│   ├── FAQs (structured: FAQ model)
│   ├── Policies (structured: policy model)
│   └── Help Articles (unstructured: documents)
│
├── Company Information
│   ├── Store Locations (structured: custom model)
│   ├── Team Bios (structured: custom model)
│   └── Brand Story (unstructured: document)
│
└── Internal Knowledge (private)
    ├── Training Materials (unstructured: documents)
    └── Procedures (unstructured: documents)
```

### Tagging and Categorization

**Tags on Documents**:

Add tags to documents for better discovery:
- Product-related: "skincare", "haircare", "makeup"
- Topic: "how-to", "ingredient-guide", "troubleshooting"
- Audience: "beginner", "advanced", "professional"
- Season: "summer-2026", "holiday", "back-to-school"

**Auto-Tagging**:
System can suggest tags based on content:
- Extracts keywords from document
- Identifies mentioned products/brands
- Detects document type (guide, policy, FAQ)

You review and approve suggested tags.

**Categories on Structured Data**:

Models can have category fields:
- Products → Category: Skincare, Makeup, Haircare
- FAQs → Category: Shipping, Returns, Account
- Locations → Type: Retail Store, Warehouse, Office

**Metadata for All Content**:

Everything has metadata:
- Created date
- Last updated date
- Created by (user)
- Source (upload, URL, API)
- Language
- Status (active, archived, draft)

### Search and Discovery

**For You (Managing Content)**:

Find content you need to update:
- Search by title, keyword, tag
- Filter by type (document, product, FAQ)
- Filter by date (recent, outdated)
- Filter by usage (frequently used by AI, never used)

**For AI (Finding Answers)**:

AI searches more sophisticatedly:
- Semantic search (meaning, not just keywords)
- Filters by relevance to customer question
- Considers recency (newer info preferred)
- Combines multiple sources

### Content Lifecycle

**Drafts**:
- Create content but don't publish to AI yet
- Preview how AI would use it
- Share with team for review
- Publish when ready

**Active**:
- Published and available to AI
- AI uses in conversations
- Can edit anytime (changes immediate)

**Archived**:
- No longer current but kept for records
- AI doesn't use in new conversations
- Can restore if needed

**Deleted**:
- Removed completely
- Can soft-delete (recoverable for 30 days)
- Or hard-delete (permanent)

**Outdated Content Detection**:

System warns about stale content:
- "Shipping Policy hasn't been updated in 18 months"
- "Product Guide PDF uploaded in 2024, may be outdated"
- "FAQ answered 0 times in last 90 days (unused)"

Helps keep knowledge fresh and relevant.

---

## Real-World Workflows

### Workflow 1: Setting Up Product Knowledge (Beauty Brand)

**Scenario**: New beauty brand launching with 15 products

**Day 1: Add Products (Structured)**
- Use predefined Product model
- Add 15 products with basic info:
  - Name, price, description
  - Category (serum, cream, cleanser, etc.)
  - Tags (vitamin-c, hydrating, anti-aging, etc.)
- Method: Form entry (small number of products)
- Time: ~30 minutes
- Result: AI can answer "what products do you have", check prices, filter by type

**Day 2: Add Product Details (Unstructured)**
- Upload product guide PDF (20 pages covering all products)
- Document includes: ingredients, how to use, skin types, benefits
- System processes, creates searchable chunks
- Time: 5 minutes upload, 10 minutes to process
- Result: AI can answer detailed questions about ingredients, usage, skin compatibility

**Day 3: Add FAQs**
- Create 10 common FAQs using FAQ model:
  - Shipping questions
  - Return policy
  - Product usage
  - Skin concerns
- Time: 20 minutes
- Result: AI handles repeat questions automatically

**Week 2: Monitor and Improve**
- Review knowledge gaps report
- See customers asking "are products vegan?" (15 times)
- Add FAQ "Are products vegan/cruelty-free?"
- Update product tags to include "vegan" where applicable
- Result: Gap closed, AI now answers confidently

**Month 2: Expand**
- Add blog posts about skincare routines (sync from website)
- Add ingredient glossary document
- Create custom model for "Skin Concerns" with product recommendations
- Result: AI becomes expert consultant, not just order-taker

### Workflow 2: Managing Large Catalog (E-commerce)

**Scenario**: Online shop with 500+ products across multiple brands

**Initial Setup: Bulk Product Import**
- Export products from e-commerce platform (Shopify/WooCommerce)
- Get CSV with 523 products
- Create Product model with fields mapped to CSV columns
- Import CSV
- System validates and imports all products
- Time: 30 minutes setup, 10 minutes import
- Result: AI knows entire catalog immediately

**Organizing Products**
- Products have categories and subcategories
- Add brands as separate field
- Tag products with features (waterproof, vegan, fragrance-free, etc.)
- Result: AI can filter and search precisely

**Keeping Catalog Current**
- Option 1: Manual updates
  - Edit products individually as they change
  - Or export-edit-import monthly

- Option 2: API integration (future)
  - Sync with e-commerce platform automatically
  - Changes in Shopify → auto-update Knowledge Base

**Adding Rich Content**
- Import brand stories (15 PDFs, one per brand)
- Sync help center articles (website sync)
- Add buying guides (documents)
- Result: AI can explain brand differences, help customers choose

### Workflow 3: Service Business (Spa/Salon)

**Scenario**: Spa with services, policies, and appointment booking

**Setup: Custom Model for Services**
- Create "Services" model with fields:
  - Service name, description, duration, price
  - Category (facial, massage, body treatment)
  - Therapist specializations needed
  - Preparation instructions
  - Contraindications

- Add 25 services
- Time: 1 hour
- Result: AI can describe services, recommend based on needs, explain what to expect

**Policies as Structured Data**
- Use Policy model for:
  - Cancellation policy
  - Late arrival policy
  - Gift card terms
  - COVID safety protocols

- Time: 30 minutes
- Result: AI answers policy questions accurately

**Treatment Details as Documents**
- Upload detailed treatment descriptions (PDFs)
- Include: step-by-step process, benefits, aftercare
- Upload FAQ PDF from website
- Time: 10 minutes
- Result: AI can walk customers through what to expect, answer nervous first-timer questions

**Team Profiles**
- Create custom "Team Members" model
- Add therapists with: name, bio, specializations, certifications
- Time: 30 minutes
- Result: AI can recommend therapist based on customer needs ("who specializes in sports massage?")

### Workflow 4: Evolving Knowledge Base

**Scenario**: Knowledge base that grows with business

**Month 1: Basics**
- Products, top 5 FAQs, return policy
- AI handle rate: 65%

**Month 3: Fill Gaps**
- Review knowledge gap reports
- Add 15 more FAQs based on actual customer questions
- Upload shipping guide (document)
- AI handle rate: 75%

**Month 6: Deepen Knowledge**
- Add how-to guides (documents)
- Create custom model for promotions (current sales)
- Sync blog for SEO content
- AI handle rate: 82%

**Month 12: Optimize**
- Archive unused FAQs
- Update outdated documents
- Reorganize collections
- Add seasonal content
- AI handle rate: 88%

**Ongoing: Maintenance**
- Monthly: Review gaps, add missing knowledge
- Quarterly: Update policies, remove outdated content
- When launching: Add new products/services immediately
- Maintain: 85-90% AI handle rate

---

## Summary

### Key Principles

**Unstructured Content**:
- Great for narratives, explanations, existing documents
- Upload → process → chunk → searchable
- AI searches semantically and cites sources
- Keep content clear, comprehensive, current

**Structured Data**:
- Great for precise facts, filterable information
- Define model → add records → AI queries exactly
- Predefined models for common needs
- Custom models for unique business data

**Together**:
- Use both for comprehensive knowledge
- Structured for facts, unstructured for context
- AI combines both for complete answers

### Best Practices

1. **Start Simple**: Core products + top FAQs + key policies
2. **Build Incrementally**: Add knowledge as questions arise
3. **Monitor Gaps**: Let customers tell you what's missing
4. **Keep Current**: Review and update quarterly
5. **Organize Well**: Use collections, tags, categories
6. **Quality Over Quantity**: Better to have 10 great docs than 100 mediocre ones

### Expected Outcomes

**AI Performance Improvement**:
- No knowledge base: 40-50% handle rate
- Basic setup: 65-70% handle rate
- Comprehensive setup: 80-90% handle rate

**Time Investment**:
- Initial setup: 2-4 hours
- Monthly maintenance: 1-2 hours
- ROI: Significant time saved on repetitive questions

---

**Document Status**: Draft v2.0
**Last Updated**: 2026-01-11
**Next Steps**: User testing on model creation flows, validate workflows
**Owner**: Product Team
