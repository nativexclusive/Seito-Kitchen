# Build a Complete Liberian Food Ordering & Catering Mobile App

## Project Name: Mama's Kitchen

**App Type:** Mobile Food Ordering, Weekly Meal Preorders & Catering Management

**Platforms:** iOS and Android, with a responsive web ordering experience.

**Objective:** Build a beautiful, modern, easy-to-use food ordering application for a home-based Liberian chef who prepares and sells authentic Liberian meals every Saturday.

The chef typically publishes a menu every Thursday, customers select their meals and place preorders, and the chef prepares everything on Saturday.

The app must simplify the entire process, from creating menus and notifying customers to accepting orders, tracking payments, managing preparation, and notifying customers when their food is ready.

The application must have two distinct interfaces:

1. **Customer App:** Browse menus, customize meals, place orders, and receive notifications.
2. **Chef Admin Dashboard:** Manage menus, customers, orders, pricing, payments, and special events.

The design should match the provided reference mockup: premium, elegant, warm, modern, and mobile-first.

---

# 1. DESIGN SYSTEM & USER INTERFACE

Create a visually appealing interface inspired by upscale African cuisine and modern food delivery applications.

### Visual Style

- Elegant and minimalist
- Warm cream backgrounds
- Dark charcoal and forest green accents
- Golden-yellow primary buttons
- Rounded cards and smooth shadows
- High-quality food photography
- Clean, readable typography
- Subtle animations and transitions
- Modern iOS-style navigation
- Large, attractive food images

### Color Palette

- Primary: Golden Yellow (#F2AD32)
- Secondary: Deep Forest Green (#123D2B)
- Background: Warm Cream (#FFF9F0)
- Text: Charcoal (#242424)
- Success: Green (#16A365)
- Warning: Amber (#F4B544)
- Unpaid: Soft Red (#F47C78)

Use a consistent visual design across all screens.

The app should feel like a premium food ordering experience rather than a generic restaurant template.

---

# 2. CUSTOMER MOBILE APPLICATION

## Screen 1: Welcome & Home

Create a beautiful landing page with:

- Mama's Kitchen logo
- Hero image featuring authentic Liberian cuisine
- Tagline: "Good Food Brings People Together"
- View This Week's Menu button
- View Special Events button
- My Orders button
- Sign In / Create Account option

Display the next available Saturday pickup date.

Allow customers to browse the menu without signing in.

## Screen 2: Weekly Saturday Menu

Every Thursday, the chef should be able to publish the menu for the upcoming Saturday.

Display:

- Menu title: "This Saturday's Menu"
- Saturday pickup date
- Ordering deadline
- Available dishes
- Dish photos
- Descriptions
- Prices
- Availability
- Add to Order buttons

Support food categories such as:

- Rice Dishes
- Soups & Stews
- Traditional Liberian Meals
- Sides
- Drinks
- Weekly Specials

Example dishes:

- Jollof Rice & Chicken
- Cassava Leaf
- Potato Greens
- Palm Butter
- Pepper Soup
- Dry Rice
- Fufu & Soup
- Attieke
- Fried Plantains

These are examples only. The chef must be able to add, edit, or remove any dish.

## Screen 3: Food Details & Customization

When customers select a meal, display:

- Large food image
- Food name
- Description
- Base price
- Protein choices
- Portion sizes
- Add-ons
- Quantity selector
- Special instructions field

Example:

**Cassava Leaf — $16.00**

Protein:

- Chicken: Included
- Beef: +$2.00
- Goat: +$4.00
- Fish: +$3.00

Add-ons:

- Extra Rice: +$3.00
- Extra Meat: +$5.00
- Extra Pepper: Free

Special Instructions:

"Please make it spicy, no fish, extra sauce."

Automatically update the price as options are selected.

Allow the chef to configure different choices and prices for each dish.

## Screen 4: Shopping Cart & Checkout

Customers should be able to order multiple dishes.

Display:

- Selected meals
- Quantities
- Customizations
- Special instructions
- Individual prices
- Total order amount

Collect:

- Customer name
- Phone number
- Email address
- Pickup or delivery selection
- Requested pickup time, if available
- Order notes

Support configurable payment methods:

- Cash
- Zelle
- Cash App
- Apple Pay
- Credit/Debit Card

Initially, support manual payment confirmation for Zelle, Cash App, and cash.

Customers must be clearly informed when payment is pending. Do not automatically mark manually reported payments as paid.

Generate a unique order number after successful submission.

## Screen 5: Order Confirmation

After placing an order, display:

"Thank You! Your Order Has Been Received."

Include:

- Order number
- Customer name
- Ordered items
- Total
- Payment status
- Pickup date
- Pickup location
- Order status

Order statuses:

1. Order Received
2. Confirmed
3. Preparing
4. Ready for Pickup
5. Completed
6. Cancelled

Customers should be able to check their order status.

## Screen 6: Notifications

Implement push notifications, email, and optional SMS notifications.

Send notifications when:

- A new Thursday menu is published
- An order is placed
- An order is confirmed
- Payment is received
- Food preparation begins
- Food is ready for pickup
- An order is cancelled or changed
- Holiday menus become available

Example ready notification:

"Your Mama's Kitchen order #1024 is ready for pickup! Thank you for supporting us."

Customers should be able to choose their notification preferences.

---

# 3. CHEF ADMIN DASHBOARD

Build a separate, secure dashboard accessible only to the chef and authorized staff.

## Screen 7: Dashboard Overview

Display key business information:

- Total orders for Saturday
- Total expected revenue
- Total collected payments
- Outstanding unpaid balance
- Number of paid orders
- Number of unpaid orders
- Orders being prepared
- Orders ready for pickup
- Total customers

Include quick actions:

- Create Weekly Menu
- View Orders
- Manage Customers
- Create Special Event
- Send Notifications

Use clean summary cards and simple charts.

## Screen 8: Menu Management

Allow the chef to create unlimited menus.

Menu types:

- Weekly Saturday Menu
- Holiday Menu
- Special Event Menu
- Catering Menu
- Custom Gathering Menu

For each menu, allow:

- Menu name
- Description
- Cover photo
- Available dishes
- Prices
- Pickup date
- Order deadline
- Maximum available quantity
- Active/inactive status
- Draft/published status

The chef should be able to save a draft, preview it, publish it, duplicate an older menu, or archive it.

### Food Item Management

Allow the chef to:

- Add new food items
- Upload food photos
- Set base prices
- Enter food descriptions
- Configure protein choices
- Configure portion sizes
- Set add-on prices
- Mark dishes sold out
- Set available quantities
- Hide or delete dishes

Menu prices must be editable without modifying historical orders.

---

# 4. WEEKLY MENU SCHEDULING

The app must support the chef's weekly workflow.

### Thursday

The chef creates or publishes the Saturday menu.

Once published:

- Notify subscribed customers
- Generate a shareable menu link
- Allow sharing through SMS, WhatsApp, and email
- Display the ordering deadline

### Friday

- Continue accepting preorders until the deadline
- Send optional reminders
- Notify customers of approaching order cutoff
- Allow the chef to close ordering early

### Saturday

- Display all confirmed orders
- Show preparation requirements
- Track paid and unpaid orders
- Mark meals as preparing
- Mark orders ready for pickup
- Notify customers
- Mark orders completed

The chef should be able to override the schedule and publish menus on any day.

---

# 5. ORDER MANAGEMENT

## Screen 9: Orders List

Display every order in an organized list.

Each order should show:

- Order number
- Customer name
- Phone number
- Order date
- Pickup date
- Number of items
- Total amount
- Payment status
- Preparation status

Add filters:

- All Orders
- New
- Confirmed
- Preparing
- Ready
- Completed
- Paid
- Unpaid
- Cancelled

Allow searching by customer name, phone number, or order number.

## Screen 10: Order Details

When the chef selects an order, display:

- Customer contact information
- Full itemized order
- Quantities
- Protein choices
- Special instructions
- Total amount
- Payment method
- Payment status
- Pickup or delivery details
- Order history

Provide prominent action buttons:

**Mark as Paid**

**Mark as Unpaid**

**Start Preparing**

**Mark Ready**

**Notify Customer**

**Complete Order**

**Cancel Order**

Keep payment status separate from preparation status.

Require confirmation for destructive actions and record changes in an order activity history.

---

# 6. PAYMENT TRACKING

Implement a simple but effective payment management system.

Payment statuses:

- Unpaid
- Partially Paid
- Paid
- Refunded

The chef must be able to manually mark payments as received.

Track:

- Order total
- Amount received
- Outstanding balance
- Payment method
- Payment date
- Payment reference
- Refund amount

Show daily and weekly revenue summaries.

Allow exporting order and payment records to CSV and PDF.

Never mark an order paid based only on a customer's statement that they sent money.

---

# 7. HOLIDAY & SPECIAL EVENT MENUS

## Screen 11: Special Events

Create a dedicated section for menus outside the regular Saturday schedule.

Examples:

- Thanksgiving Specials
- Christmas Dinner
- New Year's Celebration
- Easter Specials
- Birthday Gatherings
- Graduation Parties
- Family Reunions
- Custom Catering Events

Each event should have:

- Event name
- Banner image
- Description
- Date
- Ordering deadline
- Special menu items
- Individual pricing
- Family packages
- Serving sizes
- Maximum order capacity

Allow customers to order directly from special-event menus.

Support both individual meals and large catering orders.

### Catering Requests

Include an optional catering inquiry form:

- Customer name
- Contact information
- Event date
- Event type
- Number of guests
- Requested dishes
- Estimated budget
- Special instructions

Allow the chef to review the inquiry, create a custom quote, and send it to the customer for approval.

---

# 8. CUSTOMER MANAGEMENT

## Screen 12: Customer Directory

Maintain a searchable list of customers.

Display:

- Customer name
- Phone number
- Email
- Number of previous orders
- Total amount spent
- Most frequently ordered meals
- Last order date

Allow the chef to:

- View order history
- Contact customers
- Send menu announcements
- Send individual order notifications
- Add customer notes
- Identify returning customers

Customers should be able to opt in or out of promotional notifications.

---

# 9. MENU SHARING & MARKETING

The chef currently sends menus to customers every Thursday.

Make this process extremely simple.

Provide a **Send This Week's Menu** button.

The app should generate a professional menu preview containing:

- Business name
- Food images
- Menu items
- Prices
- Ordering deadline
- Pickup date
- Order Now link

Allow sharing through:

- SMS
- WhatsApp
- Email
- Copy Link
- Social media

Support direct email delivery and optional bulk SMS through integrated providers.

Allow the chef to send announcements to all subscribed customers or selected customer groups.

Use customer consent and unsubscribe preferences for marketing communications.

---

# 10. ADDITIONAL BUSINESS FEATURES

Implement:

### Inventory and Availability

- Set the maximum number of portions per dish
- Automatically reduce available quantity when orders are accepted
- Display Sold Out when unavailable
- Prevent overselling during simultaneous checkouts

### Kitchen Preparation Summary

Generate a Saturday preparation report showing:

- Total orders
- Total portions per dish
- Protein breakdown
- Extra sides required
- Special instructions
- Outstanding payments

Example:

- Cassava Leaf: 18 portions
- Jollof Rice: 25 portions
- Pepper Soup: 12 portions
- Fried Plantains: 14 portions

### Business Analytics

Track:

- Weekly revenue
- Monthly revenue
- Best-selling dishes
- Repeat customers
- Average order value
- Unpaid balances
- Holiday sales

### Settings

Allow the chef to configure:

- Business name and logo
- Pickup address
- Contact details
- Weekly operating schedule
- Order cutoff time
- Payment methods
- Delivery availability and fees
- Notification templates
- Tax settings

---

# 11. TECHNICAL ARCHITECTURE

Build the application using a modern, maintainable architecture.

Preferred stack:

- React Native with Expo for iOS and Android
- TypeScript
- Supabase for database, authentication, and secure backend operations
- Supabase Storage for food photography
- Expo Notifications for mobile push notifications
- Stripe for optional online card and wallet payments
- Transactional email provider for confirmations
- SMS provider for optional text notifications

Also create a responsive customer ordering website so customers can order without downloading an app.

### Database Tables

Create a normalized database including:

- users
- customers
- menus
- menu_items
- item_options
- item_option_values
- orders
- order_items
- order_item_customizations
- payments
- special_events
- catering_requests
- notification_preferences
- notification_logs
- business_settings
- order_status_history

Ensure order records preserve historical item names, selected options, and prices.

Use secure role-based permissions for admin and customer access.

### Security & Reliability

- Protect customer information
- Implement database row-level security
- Validate all prices on the server
- Use authenticated admin operations
- Avoid storing card numbers directly
- Verify payment-provider webhooks
- Prevent duplicate orders
- Ensure order creation and inventory updates are atomic
- Handle notification failures with retry logic
- Store payment and order activity logs

---

# 12. REQUIRED MOBILE SCREENS

Build the following 12 screens based on the reference mockup.

**Customer Experience**

1. Welcome / Home
2. Weekly Menu
3. Food Details & Customization
4. Shopping Cart & Checkout
5. Order Confirmation
6. Order Ready Notification / Order Tracking

**Chef Administration**

7. Admin Dashboard
8. Create / Edit Menu
9. Special Events
10. Orders List
11. Order Details & Payment Tracking
12. Customer Directory

Also create supporting screens for login, settings, catering inquiries, business reports, and notification preferences.

---

# 13. USER EXPERIENCE REQUIREMENTS

The app must be extremely simple for customers.

A typical customer should be able to:

1. Open a Thursday menu link.
2. Browse available Liberian meals.
3. Select dishes and customize them.
4. Enter special instructions.
5. Enter contact details.
6. Choose pickup or delivery.
7. Submit an order.
8. Receive an order confirmation.
9. Receive a notification when food is ready.

The ordering process should take approximately 1–2 minutes for a returning customer.

Customers should not be forced to create an account before ordering.

For the chef, prioritize large, easy-to-use buttons, clear order status indicators, and quick payment tracking.

---

# 14. DELIVERABLES

Build a functioning application, not just static mockups.

Deliver:

1. Complete customer-facing mobile application.
2. Complete chef administration dashboard.
3. Responsive web ordering experience.
4. Database schema and migrations.
5. Authentication and authorization.
6. Working menu creation and publishing.
7. Working ordering and customization flow.
8. Payment tracking.
9. Order status management.
10. Push and email notification integration.
11. Weekly menu scheduling.
12. Special-event and catering management.
13. Customer management.
14. Business analytics.
15. Deployment and setup instructions.

Begin by creating the complete screen designs and navigation flow matching the reference image.

Then implement the database, backend services, and functional ordering workflows.

Use realistic Liberian food examples and attractive placeholder food photography.

Keep all payment-provider credentials, notification-provider keys, and business settings configurable.

Do not represent simulated payment or notification flows as fully operational integrations.

**Final Goal:** Create a polished, production-ready Liberian food ordering platform that lets one chef manage the entire business from a phone, from Thursday menu announcements through Saturday meal preparation, payment tracking, and pickup notifications.

