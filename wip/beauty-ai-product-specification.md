# Beauty AI DM Assistant - Detailed Product Specification

---

## Document Purpose

This document expands on the PRD to provide detailed product specifications for building the Beauty AI DM Assistant. It breaks down each feature into buildable components, data models, user interfaces, and business logic requirements.

**Status**: Draft v1.0
**Date**: 2026-01-11
**Related Docs**: beauty-ai-assistant-prd.md

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [User Management & Authentication](#user-management--authentication)
3. [Onboarding Flow](#onboarding-flow)
4. [Product Management](#product-management)
5. [Channel Integration](#channel-integration)
6. [Conversational AI Engine](#conversational-ai-engine)
7. [Order Capture System](#order-capture-system)
8. [Human Handoff System](#human-handoff-system)
9. [Notification System](#notification-system)
10. [Dashboard & Administration](#dashboard--administration)
11. [Data Models](#data-models)
12. [API Specifications](#api-specifications)
13. [Security & Compliance](#security--compliance)

---

## System Architecture Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Customer (End User)                       │
│              Instagram DM / Facebook Messenger               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Meta Platform APIs                         │
│              (Webhooks + Graph API)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Message Router                             │
│         (Receives, validates, routes messages)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Conversation Manager                           │
│    (State management, context, conversation history)         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Engine                                   │
│    (Intent detection, response generation, NLU)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Order Capture Engine                            │
│         (Collect details, validate, confirm)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Handoff & Notification                          │
│       (Alert seller, format order, enable takeover)          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Seller Dashboard                            │
│      (View orders, manage products, take over chats)         │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack Recommendations

**Backend**:
- Node.js/TypeScript (for real-time webhook processing)
- Serverless functions (AWS Lambda / Vercel Functions)
- WebSocket support for real-time dashboard updates

**AI/ML**:
- OpenAI GPT-4 or Claude API (conversational AI)
- Custom intent classification (fine-tuned model or prompt engineering)
- Context management system

**Database**:
- PostgreSQL (user data, products, orders, conversation history)
- Redis (session state, rate limiting, caching)
- S3 or similar (media storage for images)

**Frontend**:
- React/Next.js (seller dashboard)
- Tailwind CSS (styling)
- Real-time updates (WebSocket or Server-Sent Events)

**Integrations**:
- Meta Graph API v19+ (Facebook/Instagram)
- Email service (SendGrid/Postmark)
- SMS service (Twilio for WhatsApp notifications)

---

## User Management & Authentication

### Requirements

#### User Accounts

**Account Creation**:
- Email + password registration
- Social login (Google, Facebook)
- Email verification required
- Password reset flow

**Account Types**:
- **Free Trial**: 14 days, all features
- **Paid Account**: $29/month subscription
- **Suspended**: Payment failed, read-only access
- **Cancelled**: Retain data for 30 days

**User Profile Data**:
```typescript
interface UserProfile {
  id: string;
  email: string;
  businessName: string;
  timezone: string;
  currency: string; // USD, EUR, VND, etc.
  brandTone: 'friendly' | 'luxe' | 'influencer';
  notificationPreferences: NotificationSettings;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscriptionExpiresAt: Date;
  createdAt: Date;
  lastLoginAt: Date;
}

interface NotificationSettings {
  emailNotifications: boolean;
  emailAddress?: string; // Can be different from login email
  whatsappNotifications: boolean;
  whatsappNumber?: string;
  orderAlerts: boolean;
  weeklyDigest: boolean;
}
```

### User Flows

#### Sign Up Flow
```
1. Landing page → Click "Start Free Trial"
2. Enter email + password
3. Email verification (send code)
4. Enter business name
5. Set timezone & currency
6. Choose brand tone (Friendly/Luxe/Influencer)
7. Set notification preferences
8. Redirect to channel connection
```

#### Login Flow
```
1. Enter email + password
2. Optional: 2FA if enabled
3. Redirect to dashboard
```

#### Password Reset Flow
```
1. Click "Forgot Password"
2. Enter email
3. Receive reset link via email
4. Click link → Enter new password
5. Confirm password changed
6. Redirect to login
```

---

## Onboarding Flow

### Goal
Get user from signup to first message captured in under 10 minutes.

### Step-by-Step Flow

#### Step 1: Business Setup (1 minute)
**Screen**: Business Information

**Fields**:
- Business name (required)
- Business type: Shop / Influencer / Other
- Primary products: Skincare / Makeup / Both
- Timezone (auto-detected, editable)
- Currency (auto-detected from timezone)

**Validation**:
- Business name: 3-100 characters
- All fields required

**UI/UX**:
- Progress bar: "Step 1 of 4"
- Auto-save draft every 5 seconds
- Continue button enabled when valid

---

#### Step 2: Connect Social Media (3 minutes)
**Screen**: Channel Connection

**Options**:
- Facebook Page (OAuth flow)
- Instagram Business Account (OAuth flow)

**Facebook Connection Flow**:
```
1. Click "Connect Facebook Page"
2. Redirect to Facebook OAuth
3. User grants permissions:
   - pages_messaging
   - pages_read_engagement
   - pages_manage_metadata
4. User selects which Page to connect
5. Callback → Store page access token
6. Show "Connected ✓" status
```

**Instagram Connection Flow**:
```
1. Click "Connect Instagram"
2. Redirect to Facebook OAuth (Instagram requires FB)
3. User grants permissions:
   - instagram_basic
   - instagram_manage_messages
4. User selects Instagram Business Account
5. Callback → Store IG account token
6. Show "Connected ✓" status
```

**Validation**:
- At least 1 channel must be connected
- Verify webhook subscription successful

**Error Handling**:
- OAuth cancelled → Show "Connection cancelled, try again"
- Insufficient permissions → Show required permissions list
- Account not eligible (non-business IG) → Show upgrade instructions

---

#### Step 3: Add Products (4 minutes)
**Screen**: Product Setup

**Options**:
1. Manual entry (default)
2. CSV upload (advanced)

**Manual Product Entry**:

**Form Fields per Product**:
```typescript
interface ProductForm {
  name: string; // Required, 3-100 chars
  price: number; // Required, > 0
  currency: string; // Pre-filled from user profile
  description: string; // Optional, 0-500 chars
  variants: ProductVariant[]; // Optional
  imageUrl?: string; // Optional
  isAvailable: boolean; // Default: true
}

interface ProductVariant {
  type: 'size' | 'shade' | 'custom';
  name: string; // e.g., "30ml", "Light", "Pack of 3"
  priceModifier?: number; // Optional price difference
}
```

**UI/UX**:
- Quick add form: Name + Price (minimum)
- "Add another product" button
- Drag to reorder products
- Preview how AI will describe product
- Minimum 1 product required to continue

**CSV Upload**:
- Download template CSV
- Upload file
- Validate format
- Show preview of imported products
- Allow edit before confirming

**CSV Format**:
```csv
name,price,currency,description,variant_type,variant_name,variant_price
Glow Serum,45,USD,Brightening vitamin C serum,size,30ml,0
Glow Serum,45,USD,Brightening vitamin C serum,size,50ml,10
Hydra Cream,55,USD,Deep hydration moisturizer,,,
```

---

#### Step 4: Customize AI Behavior (2 minutes)
**Screen**: AI Assistant Settings

**Settings**:

**Brand Tone** (Choose one):
- **Friendly**: "Hey! 😊 Looking for something specific?"
- **Luxe**: "Good day. How may I assist you today?"
- **Influencer**: "Omg hi! 💕 What can I help you with?"

**Show preview** of how AI will respond in each tone.

**Auto-Handoff Triggers** (Checkboxes):
- [ ] Customer asks for custom/special orders
- [ ] Customer asks medical/health questions
- [ ] Customer is unhappy/complaining
- [ ] After order confirmation (always on)

**Response Speed**:
- Instant (default)
- Delayed (1-3 seconds, more "human-like")

**Operating Hours** (Optional):
- Always active (default)
- Custom hours (set timezone-specific schedule)
- Outside hours behavior: "I'll connect you with owner tomorrow"

---

#### Step 5: Test & Go Live (30 seconds)
**Screen**: Setup Complete

**What Happens**:
1. Show success message
2. Display test instructions:
   - "Send a test message to your connected page"
   - "Try asking: 'How much is [product name]?'"
3. Real-time status indicator
4. When first message received → Celebrate 🎉
5. Redirect to dashboard

**Checklist Display**:
- ✓ Business setup complete
- ✓ 1 channel connected
- ✓ 3 products added
- ✓ AI configured
- → Ready to capture orders!

---

## Product Management

### Requirements

#### Product CRUD Operations

**Create Product**:
- Via onboarding flow
- Via dashboard "Add Product" button
- Via CSV import

**Read/List Products**:
- Dashboard product list view
- Search by name
- Filter by availability
- Sort by: name, price, created date

**Update Product**:
- Edit any field inline or via modal
- Change availability status (toggle)
- Update variants
- Changes reflected in AI immediately

**Delete Product**:
- Soft delete (mark as deleted, keep in DB)
- Confirmation required
- Cannot delete if active orders reference it

#### Product Data Model

```typescript
interface Product {
  id: string;
  userId: string; // Owner
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  variants: ProductVariant[];
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface ProductVariant {
  id: string;
  productId: string;
  type: 'size' | 'shade' | 'scent' | 'custom';
  name: string; // "30ml", "Medium", "Rose"
  priceModifier: number; // +10, -5, 0
  isAvailable: boolean;
}
```

#### Product UI/UX

**Product List View**:
```
┌──────────────────────────────────────────────────────────┐
│  Products (12)                      [+ Add Product]      │
├──────────────────────────────────────────────────────────┤
│  🔍 Search products...                                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ [📷] Glow Serum                          $45.00   │ │
│  │      Brightening vitamin C serum                   │ │
│  │      Variants: 30ml, 50ml (+$10)                   │ │
│  │      ● Available  [Edit] [Delete]                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ [📷] Hydra Cream                         $55.00   │ │
│  │      Deep hydration moisturizer                    │ │
│  │      No variants                                    │ │
│  │      ○ Out of Stock  [Edit] [Delete]               │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Product Edit Modal**:
- Same fields as creation
- Show "Last updated: X minutes ago"
- Save button active only when changes made
- Cancel button discards changes

#### Bulk Operations

**Bulk CSV Import**:
- Upload CSV
- Validate format
- Show errors (row-by-row)
- Preview changes
- Confirm import

**Bulk Availability Toggle**:
- Select multiple products (checkbox)
- Mark all as available/unavailable
- Confirmation dialog

**Bulk Delete**:
- Select multiple products
- Delete button
- Confirmation: "Delete 5 products?"

---

## Channel Integration

### Requirements

#### Supported Channels (MVP)

1. **Facebook Messenger**
2. **Instagram Direct Messages**

#### Meta Platform Integration

**Required Permissions**:
- `pages_messaging` - Send and receive messages
- `pages_read_engagement` - Read page content
- `pages_manage_metadata` - Subscribe to webhooks
- `instagram_basic` - Access Instagram account
- `instagram_manage_messages` - Send/receive Instagram DMs

**Webhook Events to Subscribe**:
- `messages` - New message received
- `messaging_postbacks` - Button clicks
- `message_reads` - Message read receipts
- `message_deliveries` - Message delivered confirmations

#### Channel Data Model

```typescript
interface Channel {
  id: string;
  userId: string;
  platform: 'facebook' | 'instagram';
  platformAccountId: string; // Facebook Page ID or Instagram Account ID
  platformAccountName: string; // Display name
  platformAccountUsername?: string; // @handle for Instagram
  accessToken: string; // Encrypted
  tokenExpiresAt?: Date;
  webhookVerified: boolean;
  isActive: boolean;
  lastMessageAt?: Date;
  connectedAt: Date;
  disconnectedAt?: Date;
  metadata: {
    profilePictureUrl?: string;
    followerCount?: number;
    verifiedAccount?: boolean;
  };
}
```

#### Connection Flow

**Facebook Page Connection**:
```typescript
// 1. User clicks "Connect Facebook Page"
// 2. Redirect to OAuth URL
const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?
  client_id=${FB_APP_ID}&
  redirect_uri=${CALLBACK_URL}&
  scope=pages_messaging,pages_read_engagement,pages_manage_metadata&
  state=${securityToken}`;

// 3. User authorizes app
// 4. Facebook redirects to callback with code
// 5. Exchange code for access token
const tokenResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token`, {
  method: 'POST',
  body: JSON.stringify({
    client_id: FB_APP_ID,
    client_secret: FB_APP_SECRET,
    redirect_uri: CALLBACK_URL,
    code: authorizationCode
  })
});

// 6. Get user's pages
const pagesResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);

// 7. User selects which page to connect
// 8. Store page access token (long-lived)
// 9. Subscribe page to webhook
await fetch(`https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`, {
  method: 'POST',
  body: JSON.stringify({
    subscribed_fields: 'messages,messaging_postbacks',
    access_token: pageAccessToken
  })
});

// 10. Save channel to database
// 11. Show success message
```

**Instagram Connection**:
```typescript
// Similar flow, but:
// 1. Must connect Facebook first
// 2. Get Instagram Business Accounts linked to FB Page
const igAccounts = await fetch(
  `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
);

// 3. Subscribe IG account to webhooks
// 4. Store IG account details
```

#### Webhook Handler

**Webhook Endpoint**: `POST /webhooks/meta`

**Verification (GET request)**:
```typescript
app.get('/webhooks/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});
```

**Message Processing (POST request)**:
```typescript
app.post('/webhooks/meta', async (req, res) => {
  // 1. Immediately respond 200 (Meta requires quick response)
  res.status(200).send('EVENT_RECEIVED');

  // 2. Process webhook asynchronously
  const { object, entry } = req.body;

  if (object === 'page') {
    for (const event of entry) {
      const webhookEvent = event.messaging?.[0] || event.changes?.[0];

      if (webhookEvent?.message) {
        await handleIncomingMessage({
          platform: 'facebook',
          senderId: webhookEvent.sender.id,
          recipientId: webhookEvent.recipient.id,
          messageId: webhookEvent.message.mid,
          text: webhookEvent.message.text,
          timestamp: webhookEvent.timestamp,
          attachments: webhookEvent.message.attachments
        });
      }
    }
  }

  if (object === 'instagram') {
    // Handle Instagram DM
    // Similar structure
  }
});
```

#### Message Sending

**Send Message Function**:
```typescript
interface SendMessageParams {
  channelId: string;
  recipientId: string;
  message: {
    text?: string;
    quickReplies?: QuickReply[];
    buttons?: Button[];
  };
}

async function sendMessage(params: SendMessageParams) {
  const channel = await getChannel(params.channelId);

  const payload = {
    recipient: { id: params.recipientId },
    message: {
      text: params.message.text,
      quick_replies: params.message.quickReplies?.map(qr => ({
        content_type: 'text',
        title: qr.title,
        payload: qr.payload
      }))
    }
  };

  const response = await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${channel.accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    // Handle errors: rate limits, invalid token, etc.
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json();
}
```

#### Rate Limiting

**Meta API Limits**:
- Facebook: 10,000 messages per day per page
- Instagram: 1,000 messages per day per account
- 5 requests per second per app

**Implementation**:
```typescript
// Use Redis for distributed rate limiting
import Redis from 'ioredis';
const redis = new Redis();

async function checkRateLimit(channelId: string): Promise<boolean> {
  const key = `ratelimit:${channelId}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, 86400); // 24 hours
  }

  const limit = channel.platform === 'facebook' ? 10000 : 1000;
  return current <= limit;
}
```

#### Error Handling

**Common Errors**:
1. **Token Expired**: Re-authenticate user
2. **Rate Limited**: Queue message, retry later
3. **User Blocked Bot**: Mark conversation as ended
4. **24-hour Window Expired**: Cannot send message (Meta policy)

**Error Recovery**:
```typescript
async function sendMessageWithRetry(params: SendMessageParams, retries = 3) {
  try {
    return await sendMessage(params);
  } catch (error) {
    if (error.code === 'ETIMEDOUT' && retries > 0) {
      await sleep(1000 * (4 - retries)); // Exponential backoff
      return sendMessageWithRetry(params, retries - 1);
    }

    if (error.message.includes('rate limit')) {
      // Queue for later
      await queueMessage(params);
      return { queued: true };
    }

    throw error; // Unrecoverable
  }
}
```

---

## Conversational AI Engine

### Requirements

#### Core Capabilities

1. **Natural Language Understanding (NLU)**:
   - Intent classification
   - Entity extraction
   - Sentiment analysis

2. **Response Generation**:
   - Context-aware replies
   - Brand tone matching
   - Natural conversation flow

3. **Safety & Compliance**:
   - Beauty-specific guardrails
   - No medical claims
   - Auto-escalation triggers

#### Intent Classification

**Primary Intents**:
```typescript
enum Intent {
  GREETING = 'greeting',
  PRODUCT_INQUIRY = 'product_inquiry',
  PRICE_CHECK = 'price_check',
  AVAILABILITY_CHECK = 'availability_check',
  BUYING_INTENT = 'buying_intent',
  ORDER_MODIFICATION = 'order_modification',
  COMPLAINT = 'complaint',
  CUSTOM_REQUEST = 'custom_request',
  MEDICAL_QUESTION = 'medical_question',
  CHIT_CHAT = 'chit_chat',
  UNKNOWN = 'unknown'
}
```

**Intent Detection Logic**:
```typescript
async function detectIntent(message: string, context: ConversationContext): Promise<Intent> {
  // Use LLM for intent classification
  const prompt = `
You are analyzing a customer message in a beauty product shop conversation.

Context:
- Previous messages: ${context.previousMessages.slice(-3).join(', ')}
- Current conversation state: ${context.state}
- User has shown buying intent: ${context.hasBuyingIntent}

Customer message: "${message}"

Classify the intent as one of:
- greeting: Customer says hi, hello, etc.
- product_inquiry: Asking about what a product does, ingredients, benefits
- price_check: Asking how much something costs
- availability_check: Asking if something is in stock
- buying_intent: Wants to purchase, order, buy
- order_modification: Wants to change quantity, variant, address
- complaint: Unhappy, complaining, problem
- custom_request: Asking for special/custom order
- medical_question: Asking about skin conditions, treatments, medical advice
- chit_chat: Off-topic conversation
- unknown: Unclear intent

Return only the intent name.
`;

  const response = await callLLM(prompt);
  return response.trim() as Intent;
}
```

#### Entity Extraction

**Entities to Extract**:
```typescript
interface ExtractedEntities {
  products: string[]; // Product names mentioned
  quantities: number[]; // Numbers mentioned
  variants: string[]; // Size, shade, etc.
  location?: string; // Shipping address/city
  price?: number; // Price mentioned
  emotion?: 'positive' | 'negative' | 'neutral';
}
```

**Extraction Function**:
```typescript
async function extractEntities(message: string, products: Product[]): Promise<ExtractedEntities> {
  const prompt = `
Extract entities from this customer message.

Available products: ${products.map(p => p.name).join(', ')}

Customer message: "${message}"

Extract:
1. Product names mentioned (match to available products)
2. Quantities (numbers indicating how many)
3. Variants (size, shade, color, scent mentions)
4. Location (city, country, address)
5. Emotion (positive/negative/neutral)

Return as JSON.
`;

  const response = await callLLM(prompt);
  return JSON.parse(response);
}
```

#### Response Generation

**Response Builder**:
```typescript
interface ResponseGenerationParams {
  intent: Intent;
  entities: ExtractedEntities;
  context: ConversationContext;
  userSettings: {
    brandTone: 'friendly' | 'luxe' | 'influencer';
    products: Product[];
  };
}

async function generateResponse(params: ResponseGenerationParams): Promise<string> {
  const { intent, entities, context, userSettings } = params;

  // Handle specific intents
  switch (intent) {
    case Intent.GREETING:
      return generateGreeting(userSettings.brandTone);

    case Intent.PRICE_CHECK:
      return generatePriceResponse(entities.products, userSettings.products, userSettings.brandTone);

    case Intent.BUYING_INTENT:
      return generateBuyingResponse(entities, context, userSettings.brandTone);

    case Intent.MEDICAL_QUESTION:
      // Auto-escalate
      return generateEscalationMessage(userSettings.brandTone);

    default:
      return generateGenericResponse(params);
  }
}

function generateGreeting(tone: string): string {
  const greetings = {
    friendly: "Hey there! 😊 How can I help you today?",
    luxe: "Good day. How may I assist you with your beauty needs?",
    influencer: "Omg hiiii! 💕 What are you looking for today?"
  };
  return greetings[tone];
}

function generatePriceResponse(productNames: string[], products: Product[], tone: string): string {
  if (productNames.length === 0) {
    return "Which product would you like to know the price for?";
  }

  const product = products.find(p =>
    p.name.toLowerCase().includes(productNames[0].toLowerCase())
  );

  if (!product) {
    return "I don't think we have that product. Would you like to see what we do have?";
  }

  const toneTemplates = {
    friendly: `The ${product.name} is $${product.price}! ${product.description || ''} Want to order? 😊`,
    luxe: `The ${product.name} is priced at $${product.price}. ${product.description || ''} Would you like to place an order?`,
    influencer: `Omg the ${product.name} is $${product.price}! ${product.description || ''} It's sooo good! Want one? 💖`
  };

  return toneTemplates[tone];
}
```

#### Context Management

**Conversation Context**:
```typescript
interface ConversationContext {
  conversationId: string;
  userId: string; // Shop owner
  customerId: string; // End customer (sender ID)
  channelId: string;
  state: ConversationState;
  previousMessages: Message[];
  extractedData: {
    productId?: string;
    variantId?: string;
    quantity?: number;
    shippingLocation?: string;
  };
  hasBuyingIntent: boolean;
  createdAt: Date;
  updatedAt: Date;
  handedOffAt?: Date;
}

enum ConversationState {
  BROWSING = 'browsing',
  COLLECTING_PRODUCT = 'collecting_product',
  COLLECTING_VARIANT = 'collecting_variant',
  COLLECTING_QUANTITY = 'collecting_quantity',
  COLLECTING_LOCATION = 'collecting_location',
  CONFIRMING_ORDER = 'confirming_order',
  ORDER_CAPTURED = 'order_captured',
  HANDED_OFF = 'handed_off'
}
```

**Context Storage**:
- Use Redis for active conversations (TTL: 24 hours)
- Persist to PostgreSQL for history
- Load context on each message

#### Safety Guardrails

**Medical Question Detection**:
```typescript
const medicalKeywords = [
  'cure', 'treat', 'diagnosis', 'disease', 'infection',
  'acne medication', 'prescription', 'doctor', 'dermatologist',
  'allergic reaction', 'rash', 'burning', 'pain'
];

function containsMedicalLanguage(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return medicalKeywords.some(keyword => lowerMessage.includes(keyword));
}

// If detected, escalate immediately
if (containsMedicalLanguage(message)) {
  return {
    response: "That's a great question! Let me connect you with the owner who can help better with that. 💕",
    shouldHandoff: true,
    handoffReason: 'medical_question'
  };
}
```

**Unsafe Claims Prevention**:
```typescript
// Block AI from making these claims
const blockedPhrases = [
  'will cure',
  'guaranteed to fix',
  'medically proven',
  'treats acne',
  'eliminates wrinkles'
];

// System prompt instruction
const systemPrompt = `
CRITICAL SAFETY RULES:
- NEVER make medical claims (cure, treat, diagnose)
- NEVER guarantee results
- ONLY describe ingredients and general benefits
- If customer asks medical questions, politely hand off to human
- Keep responses factual and benefit-focused

ALLOWED: "This serum contains vitamin C, which is known for brightening"
NOT ALLOWED: "This will cure your acne"
`;
```

---

## Order Capture System

### Requirements

#### Order Capture Flow

**State Machine**:
```
BROWSING → (Buying intent detected) → COLLECTING_PRODUCT
  ↓
COLLECTING_PRODUCT → (Product identified) → COLLECTING_VARIANT
  ↓
COLLECTING_VARIANT → (Variant selected) → COLLECTING_QUANTITY
  ↓
COLLECTING_QUANTITY → (Quantity provided) → COLLECTING_LOCATION
  ↓
COLLECTING_LOCATION → (Location provided) → CONFIRMING_ORDER
  ↓
CONFIRMING_ORDER → (Confirmed) → ORDER_CAPTURED → HANDED_OFF
```

#### Buying Intent Detection

**Triggers**:
- Keywords: "buy", "order", "purchase", "want", "get", "I'll take"
- Phrases: "how do I buy", "can I order", "I need"
- Context: After price inquiry, follow-up with "yes"

**Intent Confidence**:
```typescript
async function detectBuyingIntent(message: string, context: ConversationContext): Promise<number> {
  // Return confidence score 0-1

  const buyingKeywords = ['buy', 'order', 'purchase', 'want', 'I\'ll take', 'get'];
  const hasKeyword = buyingKeywords.some(kw => message.toLowerCase().includes(kw));

  // Context-based scoring
  let confidence = 0;

  if (hasKeyword) confidence += 0.6;
  if (context.previousMessages.some(m => m.intent === Intent.PRICE_CHECK)) confidence += 0.3;
  if (message.toLowerCase() === 'yes' && context.lastBotQuestion?.includes('order')) confidence += 0.8;

  return Math.min(confidence, 1.0);
}

// Trigger order collection if confidence > 0.6
```

#### One-at-a-Time Collection

**Collection Questions**:
```typescript
const collectionQuestions = {
  product: {
    friendly: "Which product would you like to order? 😊",
    luxe: "Which product would you like to purchase?",
    influencer: "Omg yay! Which one do you want? 💕"
  },
  variant: {
    friendly: "What size/shade would you like?",
    luxe: "Which variant would you prefer?",
    influencer: "Which one? We have [list variants]!"
  },
  quantity: {
    friendly: "How many would you like?",
    luxe: "What quantity would you like to order?",
    influencer: "How many do you want? 😍"
  },
  location: {
    friendly: "Where should we ship it? (City/Country)",
    luxe: "What is your shipping location?",
    influencer: "Where are you located babe?"
  }
};
```

**Collection Logic**:
```typescript
async function handleCollectionState(
  message: string,
  context: ConversationContext,
  userSettings: any
): Promise<{
  response: string;
  nextState: ConversationState;
  updatedData: Partial<OrderData>;
}> {

  switch (context.state) {
    case ConversationState.COLLECTING_PRODUCT: {
      // Extract product from message
      const entities = await extractEntities(message, userSettings.products);
      const product = findMatchingProduct(entities.products, userSettings.products);

      if (!product) {
        return {
          response: "Hmm, I'm not sure which product you mean. We have: " +
                   userSettings.products.map(p => p.name).join(', '),
          nextState: ConversationState.COLLECTING_PRODUCT,
          updatedData: {}
        };
      }

      // Product found
      if (product.variants.length > 0) {
        return {
          response: `Great choice! The ${product.name} comes in: ${product.variants.map(v => v.name).join(', ')}. Which one?`,
          nextState: ConversationState.COLLECTING_VARIANT,
          updatedData: { productId: product.id }
        };
      } else {
        return {
          response: collectionQuestions.quantity[userSettings.brandTone],
          nextState: ConversationState.COLLECTING_QUANTITY,
          updatedData: { productId: product.id }
        };
      }
    }

    case ConversationState.COLLECTING_VARIANT: {
      // Extract variant
      const product = await getProduct(context.extractedData.productId);
      const variant = findMatchingVariant(message, product.variants);

      if (!variant) {
        return {
          response: "Which variant? " + product.variants.map(v => v.name).join(' or '),
          nextState: ConversationState.COLLECTING_VARIANT,
          updatedData: {}
        };
      }

      return {
        response: collectionQuestions.quantity[userSettings.brandTone],
        nextState: ConversationState.COLLECTING_QUANTITY,
        updatedData: { variantId: variant.id }
      };
    }

    case ConversationState.COLLECTING_QUANTITY: {
      // Extract number
      const quantity = extractQuantity(message);

      if (!quantity || quantity < 1 || quantity > 100) {
        return {
          response: "How many would you like? (Enter a number)",
          nextState: ConversationState.COLLECTING_QUANTITY,
          updatedData: {}
        };
      }

      return {
        response: collectionQuestions.location[userSettings.brandTone],
        nextState: ConversationState.COLLECTING_LOCATION,
        updatedData: { quantity }
      };
    }

    case ConversationState.COLLECTING_LOCATION: {
      // Extract location
      const location = message.trim();

      if (location.length < 2) {
        return {
          response: "Could you provide your city or country?",
          nextState: ConversationState.COLLECTING_LOCATION,
          updatedData: {}
        };
      }

      // Move to confirmation
      return {
        response: await generateOrderSummary(context.extractedData, userSettings),
        nextState: ConversationState.CONFIRMING_ORDER,
        updatedData: { shippingLocation: location }
      };
    }

    case ConversationState.CONFIRMING_ORDER: {
      // Check confirmation
      const confirmed = isConfirmation(message);

      if (confirmed) {
        // Create order and hand off
        const order = await createOrder(context);
        await notifySeller(order);

        return {
          response: "Perfect! The owner will message you soon to arrange payment and delivery. Thank you! 💖",
          nextState: ConversationState.ORDER_CAPTURED,
          updatedData: { orderId: order.id }
        };
      } else {
        return {
          response: "No problem! What would you like to change?",
          nextState: ConversationState.BROWSING,
          updatedData: {}
        };
      }
    }
  }
}

function extractQuantity(message: string): number | null {
  const match = message.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function isConfirmation(message: string): boolean {
  const confirmWords = ['yes', 'yeah', 'yep', 'correct', 'confirm', 'ok', 'okay', 'sure'];
  return confirmWords.some(word => message.toLowerCase().includes(word));
}
```

#### Order Summary Generation

```typescript
async function generateOrderSummary(orderData: OrderData, userSettings: any): Promise<string> {
  const product = await getProduct(orderData.productId);
  const variant = orderData.variantId ? await getVariant(orderData.variantId) : null;

  const productName = variant
    ? `${product.name} (${variant.name})`
    : product.name;

  const price = variant
    ? product.price + variant.priceModifier
    : product.price;

  const total = price * orderData.quantity;

  const tone = userSettings.brandTone;

  const summaries = {
    friendly: `
Let me confirm your order:
• ${productName} × ${orderData.quantity}
• Total: $${total}
• Shipping to: ${orderData.shippingLocation}

Is this correct? 😊
    `.trim(),

    luxe: `
Order Summary:
${productName} × ${orderData.quantity}
Subtotal: $${total}
Destination: ${orderData.shippingLocation}

Please confirm if the details are correct.
    `.trim(),

    influencer: `
Okay so you want:
${productName} × ${orderData.quantity} = $${total} 💕
Shipping to ${orderData.shippingLocation}

Right?? 😍
    `.trim()
  };

  return summaries[tone];
}
```

#### Order Data Model

```typescript
interface Order {
  id: string;
  userId: string; // Shop owner
  customerId: string; // End customer
  conversationId: string;
  channelId: string;

  // Order details
  productId: string;
  productName: string; // Snapshot at order time
  variantId?: string;
  variantName?: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  currency: string;

  // Shipping
  shippingLocation: string;

  // Status
  status: OrderStatus;
  capturedAt: Date;
  handedOffAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;

  // Communication
  conversationHistory: Message[];
  sellerNotes?: string;
}

enum OrderStatus {
  CAPTURED = 'captured', // AI captured, awaiting seller
  IN_PROGRESS = 'in_progress', // Seller contacted customer
  COMPLETED = 'completed', // Order fulfilled
  CANCELLED = 'cancelled' // Order cancelled
}
```

---

## Human Handoff System

### Requirements

#### When to Hand Off

**Automatic Handoff Triggers**:
1. Order confirmed (always)
2. Medical/health questions detected
3. Custom/special requests
4. Complaint/negative sentiment
5. AI confidence too low (< 0.5)
6. Customer explicitly asks for human

**Manual Handoff**:
- Seller can take over any conversation from dashboard

#### Handoff Flow

```typescript
async function initiateHandoff(
  conversationId: string,
  reason: HandoffReason,
  orderData?: OrderData
): Promise<void> {

  // 1. Update conversation state
  await updateConversation(conversationId, {
    state: ConversationState.HANDED_OFF,
    handedOffAt: new Date(),
    handoffReason: reason
  });

  // 2. Create order if applicable
  let order;
  if (orderData) {
    order = await createOrder({
      ...orderData,
      conversationId,
      status: OrderStatus.CAPTURED
    });
  }

  // 3. Send customer notification
  await sendMessage({
    conversationId,
    text: getHandoffMessage(reason, userSettings.brandTone)
  });

  // 4. Notify seller
  await notifySeller({
    userId: conversation.userId,
    type: 'new_order',
    order,
    conversation,
    reason
  });

  // 5. Disable AI for this conversation
  await disableAIForConversation(conversationId);
}

function getHandoffMessage(reason: HandoffReason, tone: string): string {
  const messages = {
    order_confirmed: {
      friendly: "Thanks so much! 💕 The owner will message you shortly to arrange payment and delivery!",
      luxe: "Thank you for your order. The owner will contact you shortly to finalize the details.",
      influencer: "Omg yay! 🎉 The owner will DM you soon to sort out payment and shipping!"
    },
    medical_question: {
      friendly: "That's a great question! Let me get the owner who knows more about that 😊",
      luxe: "I'll connect you with the owner who can better assist with your inquiry.",
      influencer: "Good question babe! Let me get the owner to help you with that 💕"
    },
    custom_request: {
      friendly: "Let me check with the owner about that special request!",
      luxe: "I'll have the owner contact you regarding your custom request.",
      influencer: "Ooh let me ask the owner about that!"
    },
    complaint: {
      friendly: "I'm sorry to hear that! Let me get the owner right away.",
      luxe: "My apologies. I'll have the owner reach out to you immediately.",
      influencer: "Oh no! 😟 Let me get the owner to help you right now"
    }
  };

  return messages[reason][tone];
}
```

#### Seller Notification

**Notification Channels**:
1. Email (always)
2. WhatsApp (if enabled)
3. Dashboard real-time alert
4. Push notification (if app installed)

**Email Template**:
```html
Subject: New Order Captured 🎉

Hi [Business Name],

Great news! Your AI assistant captured a new order:

ORDER DETAILS:
━━━━━━━━━━━━━━━━━━━
Product: [Product Name] ([Variant])
Quantity: [X]
Total: $[Amount]
Shipping: [Location]
━━━━━━━━━━━━━━━━━━━

CUSTOMER INFO:
Name: [Customer Name from profile]
Platform: [Instagram/Facebook]
Profile: [Link to customer profile]

CONVERSATION SUMMARY:
"Customer asked about pricing, showed interest, and confirmed order for delivery to [Location]."

[View Full Conversation] [Contact Customer] [Mark Complete]

Next steps:
1. Contact the customer to arrange payment
2. Confirm shipping details
3. Mark order as complete once fulfilled

View in Dashboard: [Dashboard Link]

—
Beauty AI Assistant
```

**WhatsApp Template**:
```
🎉 New Order!

Product: [Name] × [Qty]
Total: $[Amount]
Ship to: [Location]

[View Details] [Contact]
```

**Dashboard Alert**:
- Real-time toast notification
- Sound/vibration
- Red badge on "Orders" tab

#### Conversation Takeover

**Takeover UI**:
```
┌──────────────────────────────────────────────────────────┐
│  Conversation with @customer_name                        │
│  Platform: Instagram   Status: 🤖 AI Handling            │
│                                                           │
│  [💬 Full Chat History]                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Customer: How much is the glow serum?             │ │
│  │ AI Bot: The Glow Serum is $45! Want to order? 😊  │ │
│  │ Customer: Yes, 1 please                            │ │
│  │ AI Bot: Where should we ship it?                   │ │
│  │ Customer: Sydney                                    │ │
│  │ AI Bot: Perfect! Owner will message you soon! 💖   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  [🙋 Take Over Conversation]                             │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Type message to customer...                        │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│  [Send]                                                   │
└──────────────────────────────────────────────────────────┘
```

**Takeover Function**:
```typescript
async function takeOverConversation(conversationId: string, sellerId: string): Promise<void> {
  // 1. Verify seller owns this conversation
  const conversation = await getConversation(conversationId);
  if (conversation.userId !== sellerId) {
    throw new Error('Unauthorized');
  }

  // 2. Disable AI
  await updateConversation(conversationId, {
    aiEnabled: false,
    takenOverBy: sellerId,
    takenOverAt: new Date()
  });

  // 3. Optionally notify customer
  // (Meta doesn't allow automated "human is here" messages)

  // 4. Enable manual messaging in dashboard
  return { success: true };
}
```

---

## Notification System

### Requirements

#### Notification Types

1. **Order Captured** (High Priority)
2. **New Message** (Medium Priority)
3. **Customer Waiting** (Medium Priority - no response in 1 hour)
4. **Channel Disconnected** (High Priority)
5. **Weekly Summary** (Low Priority)

#### Notification Channels

**Email Notifications**:
```typescript
interface EmailNotification {
  to: string;
  subject: string;
  template: string;
  data: any;
  priority: 'high' | 'medium' | 'low';
}

async function sendEmailNotification(notification: EmailNotification): Promise<void> {
  // Use SendGrid or similar
  await emailClient.send({
    to: notification.to,
    from: 'notifications@beautyai.app',
    subject: notification.subject,
    html: renderTemplate(notification.template, notification.data),
    priority: notification.priority
  });
}
```

**WhatsApp Notifications** (via Twilio):
```typescript
async function sendWhatsAppNotification(
  phoneNumber: string,
  message: string
): Promise<void> {
  await twilioClient.messages.create({
    from: 'whatsapp:+14155238886', // Twilio sandbox
    to: `whatsapp:${phoneNumber}`,
    body: message
  });
}
```

**Push Notifications** (if mobile app):
```typescript
async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    data?: any;
  }
): Promise<void> {
  const userDevices = await getUserDevices(userId);

  for (const device of userDevices) {
    await firebaseAdmin.messaging().send({
      token: device.fcmToken,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data
    });
  }
}
```

#### Notification Preferences

```typescript
interface NotificationPreferences {
  userId: string;

  // Channels
  emailEnabled: boolean;
  emailAddress: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  pushEnabled: boolean;

  // Event preferences
  newOrderEmail: boolean;
  newOrderWhatsApp: boolean;
  newOrderPush: boolean;

  newMessageEmail: boolean;
  newMessageWhatsApp: boolean;
  newMessagePush: boolean;

  weeklyDigestEmail: boolean;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "08:00"
  quietHoursTimezone: string;
}
```

#### Notification Batching

**Problem**: Don't spam seller with 50 emails if 50 messages arrive

**Solution**: Batch notifications
```typescript
async function scheduleNotification(
  userId: string,
  type: NotificationType,
  data: any
): Promise<void> {
  const batchKey = `notifications:${userId}:${type}`;

  // Add to batch
  await redis.lpush(batchKey, JSON.stringify(data));

  // Set expiry for batch (5 minutes)
  const hasExpiry = await redis.ttl(batchKey);
  if (hasExpiry === -1) {
    await redis.expire(batchKey, 300);

    // Schedule batch send in 5 minutes
    await scheduleJob({
      runAt: new Date(Date.now() + 300000),
      job: 'send_batched_notifications',
      params: { userId, type }
    });
  }
}

async function sendBatchedNotifications(userId: string, type: NotificationType): Promise<void> {
  const batchKey = `notifications:${userId}:${type}`;
  const items = await redis.lrange(batchKey, 0, -1);

  if (items.length === 0) return;

  // Clear batch
  await redis.del(batchKey);

  // Send single summary notification
  if (type === 'new_message') {
    await sendEmailNotification({
      to: user.email,
      subject: `${items.length} new messages waiting`,
      template: 'batch_messages',
      data: { count: items.length, messages: items.map(JSON.parse) }
    });
  }
}
```

---

## Dashboard & Administration

### Requirements

#### Dashboard Layout

**Main Navigation**:
```
┌─────────────────────────────────────────────────────────┐
│  Beauty AI Assistant                  [👤 User Menu ▼]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [📦 Orders]  [💬 Conversations]  [📦 Products]         │
│  [📱 Channels]  [⚙️ Settings]                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Orders View

**Orders List**:
```
┌──────────────────────────────────────────────────────────┐
│  Orders (24)                     [📅 Filter ▼] [🔍]      │
├──────────────────────────────────────────────────────────┤
│  Status: [All ▼] [Captured] [In Progress] [Completed]   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🆕 Glow Serum × 1                        $45.00   │ │
│  │    @customer_name via Instagram                    │ │
│  │    Sydney • 2 minutes ago                          │ │
│  │    [View] [Contact] [Mark Complete]                │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ⏳ Hydra Cream × 2                       $110.00  │ │
│  │    @another_customer via Facebook                  │ │
│  │    Melbourne • 1 hour ago                          │ │
│  │    [View] [Contact] [Mark Complete]                │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Order Detail View**:
```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Orders                                        │
├──────────────────────────────────────────────────────────┤
│  Order #12345                          Status: Captured  │
│                                                           │
│  CUSTOMER                                                 │
│  @customer_name                                          │
│  Platform: Instagram                                      │
│  [📱 Contact on Instagram]                               │
│                                                           │
│  ORDER DETAILS                                            │
│  Product: Glow Serum (30ml)                              │
│  Quantity: 1                                              │
│  Price: $45.00                                            │
│  Shipping: Sydney, Australia                              │
│                                                           │
│  CONVERSATION HISTORY                                     │
│  ┌────────────────────────────────────────────────────┐ │
│  │ [Full conversation transcript here]                │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ACTIONS                                                  │
│  [Mark as In Progress] [Mark as Complete] [Cancel]       │
│                                                           │
│  NOTES                                                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Add notes (payment method, tracking number, etc.)  │ │
│  └────────────────────────────────────────────────────┘ │
│  [Save Notes]                                             │
└──────────────────────────────────────────────────────────┘
```

#### Conversations View

**Active Conversations**:
```
┌──────────────────────────────────────────────────────────┐
│  Conversations (8 active)                                │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🤖 @customer_name                    2 min ago     │ │
│  │    "Where should we ship it?"                      │ │
│  │    [View Conversation] [Take Over]                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 👤 @another_customer                 1 hour ago    │ │
│  │    "Thanks, I'll send payment now"                 │ │
│  │    [View Conversation] [Reply]                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

#### Products View
(Already covered in Product Management section)

#### Channels View

**Connected Channels**:
```
┌──────────────────────────────────────────────────────────┐
│  Channels (2 connected)              [+ Connect Channel] │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Instagram                                          │ │
│  │ @my_beauty_shop                                    │ │
│  │ ✅ Active • 145 messages today                     │ │
│  │ [View Stats] [Disconnect]                          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Facebook Page                                      │ │
│  │ My Beauty Shop                                     │ │
│  │ ✅ Active • 89 messages today                      │ │
│  │ [View Stats] [Disconnect]                          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

#### Settings View

**Sections**:
1. **Business Settings**
   - Business name
   - Timezone
   - Currency

2. **AI Assistant Settings**
   - Brand tone
   - Auto-handoff triggers
   - Response speed
   - Operating hours

3. **Notification Settings**
   - Email preferences
   - WhatsApp preferences
   - Quiet hours

4. **Account Settings**
   - Email & password
   - Subscription status
   - Billing information

5. **Danger Zone**
   - Export data
   - Delete account

---

## Data Models

### Complete Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',
  currency VARCHAR(3) DEFAULT 'USD',
  brand_tone VARCHAR(20) DEFAULT 'friendly',
  subscription_status VARCHAR(20) DEFAULT 'trial',
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  email_address VARCHAR(255),
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  whatsapp_number VARCHAR(20),
  new_order_email BOOLEAN DEFAULT TRUE,
  new_order_whatsapp BOOLEAN DEFAULT FALSE,
  weekly_digest_email BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone VARCHAR(100)
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_products_user_id ON products(user_id);

-- Product Variants
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- size, shade, scent, custom
  name VARCHAR(100) NOT NULL, -- 30ml, Medium, Rose
  price_modifier DECIMAL(10,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_variants_product_id ON product_variants(product_id);

-- Channels
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- facebook, instagram
  platform_account_id VARCHAR(255) NOT NULL,
  platform_account_name VARCHAR(255),
  platform_account_username VARCHAR(255),
  access_token TEXT NOT NULL, -- encrypted
  token_expires_at TIMESTAMP,
  webhook_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_message_at TIMESTAMP,
  connected_at TIMESTAMP DEFAULT NOW(),
  disconnected_at TIMESTAMP,
  metadata JSONB
);

CREATE INDEX idx_channels_user_id ON channels(user_id);
CREATE INDEX idx_channels_platform_account ON channels(platform, platform_account_id);

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  customer_id VARCHAR(255) NOT NULL, -- Platform sender ID
  customer_name VARCHAR(255),
  state VARCHAR(50) DEFAULT 'browsing',
  ai_enabled BOOLEAN DEFAULT TRUE,
  has_buying_intent BOOLEAN DEFAULT FALSE,
  handoff_reason VARCHAR(100),
  taken_over_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  handed_off_at TIMESTAMP,
  taken_over_at TIMESTAMP
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_channel_customer ON conversations(channel_id, customer_id);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  platform_message_id VARCHAR(255),
  sender_type VARCHAR(20) NOT NULL, -- customer, ai, seller
  sender_id VARCHAR(255),
  text TEXT,
  intent VARCHAR(50),
  entities JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  customer_id VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),

  -- Product details (snapshot)
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  variant_id UUID REFERENCES product_variants(id),
  variant_name VARCHAR(100),

  -- Order details
  quantity INTEGER NOT NULL,
  price_per_unit DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,

  -- Shipping
  shipping_location TEXT NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'captured',
  seller_notes TEXT,

  -- Timestamps
  captured_at TIMESTAMP DEFAULT NOW(),
  handed_off_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id, captured_at DESC);
CREATE INDEX idx_orders_status ON orders(status);

-- Conversation Context (Redis-backed, but also in DB for persistence)
CREATE TABLE conversation_contexts (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  extracted_data JSONB, -- { productId, variantId, quantity, shippingLocation }
  context_data JSONB, -- Additional context
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Specifications

### REST API Endpoints

#### Authentication

```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/verify-email?token=xxx
```

#### User Management

```
GET    /api/users/me
PATCH  /api/users/me
DELETE /api/users/me
GET    /api/users/me/subscription
POST   /api/users/me/subscription/upgrade
```

#### Products

```
GET    /api/products
POST   /api/products
GET    /api/products/:id
PATCH  /api/products/:id
DELETE /api/products/:id
POST   /api/products/import-csv
GET    /api/products/:id/variants
POST   /api/products/:id/variants
PATCH  /api/products/variants/:id
DELETE /api/products/variants/:id
```

#### Channels

```
GET    /api/channels
POST   /api/channels/connect/facebook
POST   /api/channels/connect/instagram
GET    /api/channels/:id
DELETE /api/channels/:id
GET    /api/channels/:id/stats
```

#### Conversations

```
GET    /api/conversations
GET    /api/conversations/:id
POST   /api/conversations/:id/takeover
POST   /api/conversations/:id/messages
GET    /api/conversations/:id/messages
```

#### Orders

```
GET    /api/orders
GET    /api/orders/:id
PATCH  /api/orders/:id/status
POST   /api/orders/:id/notes
```

#### Webhooks

```
GET    /api/webhooks/meta (verification)
POST   /api/webhooks/meta (incoming messages)
```

### Example API Request/Response

**Create Product**:
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Glow Serum",
  "description": "Brightening vitamin C serum",
  "price": 45.00,
  "currency": "USD",
  "variants": [
    { "type": "size", "name": "30ml", "priceModifier": 0 },
    { "type": "size", "name": "50ml", "priceModifier": 10 }
  ],
  "isAvailable": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "...",
    "name": "Glow Serum",
    "description": "Brightening vitamin C serum",
    "price": 45.00,
    "currency": "USD",
    "variants": [
      {
        "id": "...",
        "type": "size",
        "name": "30ml",
        "priceModifier": 0
      },
      {
        "id": "...",
        "type": "size",
        "name": "50ml",
        "priceModifier": 10
      }
    ],
    "isAvailable": true,
    "createdAt": "2026-01-11T10:00:00Z"
  }
}
```

---

## Security & Compliance

### Security Requirements

#### Authentication & Authorization

**JWT Tokens**:
- Access token: 1 hour expiry
- Refresh token: 30 days expiry
- Secure httpOnly cookies for refresh tokens

**Password Requirements**:
- Minimum 8 characters
- At least 1 uppercase, 1 lowercase, 1 number
- Bcrypt hashing with cost factor 12

**API Rate Limiting**:
- 100 requests per minute per user
- 1000 requests per hour per user
- 10 signup attempts per hour per IP

#### Data Encryption

**At Rest**:
- Database encryption (AWS RDS encryption)
- Encrypted access tokens (AES-256)
- Encrypted sensitive fields (phone numbers, tokens)

**In Transit**:
- HTTPS only (TLS 1.3)
- HSTS headers
- Certificate pinning for API clients

#### Input Validation

**All API Inputs**:
- Sanitize HTML/script tags
- Validate data types
- Length limits on all strings
- SQL injection prevention (parameterized queries)
- XSS prevention (escape output)

### Compliance Requirements

#### Data Privacy (GDPR, CCPA)

**User Rights**:
- Right to access data (export feature)
- Right to delete data (account deletion)
- Right to portability (CSV export)

**Data Retention**:
- Active users: Retain indefinitely
- Cancelled users: Retain 30 days, then delete
- Conversation history: Retain 90 days

**Cookie Consent**:
- Banner on first visit
- Essential cookies only without consent
- Analytics opt-in required

#### Platform Compliance

**Meta Platform Policies**:
- 24-hour messaging window enforcement
- No spam/bulk messaging
- Proper webhook security
- Respect user blocking/reporting

**Beauty Industry Compliance**:
- No medical claims
- Ingredient safety (no banned substances)
- Age restrictions (cosmetics 13+, some 18+)
- Country-specific regulations

#### PCI Compliance

**Payment Handling**:
- ⚠️ **NEVER** store credit card numbers
- ⚠️ **NEVER** process payments directly
- Seller handles payment outside platform
- No payment data in database

---

## Next Steps

### MVP Development Roadmap

**Phase 1: Foundation (Weeks 1-2)**
- [ ] User authentication & onboarding
- [ ] Product management CRUD
- [ ] Basic dashboard UI

**Phase 2: Integration (Weeks 3-4)**
- [ ] Meta OAuth & webhooks
- [ ] Channel connection flow
- [ ] Message sending/receiving

**Phase 3: AI Engine (Weeks 5-6)**
- [ ] LLM integration (OpenAI/Claude)
- [ ] Intent detection
- [ ] Response generation
- [ ] Conversation state management

**Phase 4: Order Capture (Weeks 7-8)**
- [ ] Buying intent detection
- [ ] One-at-a-time collection flow
- [ ] Order confirmation
- [ ] Order storage

**Phase 5: Handoff & Notifications (Week 9)**
- [ ] Human handoff logic
- [ ] Email notifications
- [ ] WhatsApp notifications
- [ ] Dashboard alerts

**Phase 6: Testing & Launch (Week 10)**
- [ ] End-to-end testing
- [ ] Beta user testing
- [ ] Performance optimization
- [ ] Production deployment

---

**Document Status**: Draft v1.0
**Last Updated**: 2026-01-11
**Next Review**: After technical architecture review
**Owner**: Product Team
