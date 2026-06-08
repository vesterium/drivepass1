# 📱 DrivePass+ PWA Installation Guide

DrivePass+ is now a **Progressive Web App (PWA)**! This means you can install it on your phone and use it like a native app, even with offline support.

## ✨ Features

### PWA Functionality
- 📲 **Install on Home Screen** - Works like a native app
- 🚀 **Offline Support** - Access key features without internet
- 🔔 **Push Notifications** - Get updates about washes and rewards
- 📱 **Mobile Optimized** - Perfect experience on iOS and Android

### Backend Integration (Supabase)
- 🔐 **Authentication** - Sign up and sign in securely
- 💾 **Real-time Data** - Wash history synced to cloud
- ⭐ **Reviews & Ratings** - Rate and review wash locations
- 🎁 **Loyalty Program** - Earn and redeem points
- 📊 **Partner Dashboard** - Manage wash stations

### Multi-language Support
- 🌍 **3 Languages** - English, Russian, Uzbek
- 🔄 **Switch Anytime** - Change language in settings

## 📥 Installation Instructions

### iOS (iPhone/iPad)

1. Open Safari browser
2. Navigate to your DrivePass+ URL
3. Tap the **Share** button (square with arrow pointing up)
4. Scroll down and tap **"Add to Home Screen"**
5. Tap **"Add"** in the top right corner
6. DrivePass+ icon will appear on your home screen!

### Android (Chrome)

1. Open Chrome browser
2. Navigate to your DrivePass+ URL
3. Tap the **three-dot menu** in the top right
4. Tap **"Add to Home Screen"** or **"Install App"**
5. Tap **"Add"** or **"Install"** to confirm
6. DrivePass+ icon will appear on your home screen!

### Android (Samsung Internet)

1. Open Samsung Internet browser
2. Navigate to your DrivePass+ URL
3. Tap the **three-line menu** at the bottom
4. Tap **"Add page to"** → **"Home screen"**
5. Tap **"Add"** to confirm

## 🎯 First Time Setup

### 1. Complete Onboarding
- View the 3-screen introduction
- Skip or complete to proceed

### 2. Create Account
- Sign up with email and password
- Your data is securely stored in Supabase
- **Note**: For testing only - not for real user data

### 3. Start Using
- **Scan QR** - Check in at wash stations
- **Find Locations** - View nearby car washes on map
- **Book Services** - Schedule premium detailing
- **Earn Points** - Get 10 points per wash
- **Write Reviews** - Rate your experience

## 🔑 Key Features

### For Customers

#### Dashboard
- Active subscription status ($25/month)
- Monthly wash count and savings
- Trust indicators (Verified Partners, Safe Payment, 100% Guarantee)
- Nearby locations with live status

#### QR Scanner
- Scan codes at partner locations
- Instant access confirmation
- Auto-record washes to history
- Earn loyalty points automatically

#### Locations
- Interactive map view
- Search and filter
- Ratings and reviews
- Get directions
- Operating hours

#### Premium Services
- Professional detailing
- Ceramic coating
- Interior cleaning
- Paint protection
- 15% member discount

#### Loyalty Program
- Earn 10 points per wash
- Redeem for rewards
- Four tiers: Bronze, Silver, Gold, Platinum
- Track points history

#### Reviews
- Write reviews for locations
- Rate 1-5 stars
- Verified wash badge
- Sort by recent or helpful

### For Partners

#### Partner Dashboard
- Revenue tracking
- Customer analytics
- Recent washes
- Performance metrics

## 🛠️ Technical Details

### Technologies Used
- **React** - Frontend framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Backend & auth
- **Service Worker** - Offline support
- **Web Manifest** - PWA configuration

### Backend API Routes
All routes prefixed with `/make-server-80c25f01/`:
- `POST /auth/signup` - Create account
- `GET /reviews/:locationId` - Get reviews
- `POST /reviews` - Submit review
- `GET /loyalty/points` - Get points
- `POST /loyalty/earn` - Earn points
- `POST /loyalty/redeem` - Redeem rewards
- `GET /washes` - Get wash history
- `POST /washes` - Record wash
- `GET /partner/stats` - Partner stats

### Browser Support
- ✅ Chrome (Android, Desktop)
- ✅ Safari (iOS 11.3+, macOS)
- ✅ Firefox (Android, Desktop)
- ✅ Samsung Internet
- ✅ Edge (Desktop, Android)

### Offline Capabilities
- View cached pages
- Access wash history
- View loyalty points
- Browse locations
- Read cached reviews

### Online Required For
- Sign in/Sign up
- QR scanning
- Booking services
- Writing reviews
- Earning/redeeming points

## 🔒 Security & Privacy

⚠️ **Important**: This is a **development/demo app** using Supabase backend.

- Do NOT use real personal information
- Do NOT use real payment details
- For testing and demonstration only
- Data may be reset or deleted

## 🎨 Branding

**DrivePass+**
*Unlimited clean. Unlimited drive.*

- Primary Color: Blue (#2563eb)
- Subscription: $25/month
- Target: Daily car wash users
- Value Prop: Unlimited washes

## 📞 Support

If you encounter any issues:
1. Clear browser cache
2. Reinstall PWA
3. Check internet connection
4. Try different browser

## 🚀 What's Next?

Future enhancements could include:
- Payment integration (Stripe)
- Social login (Google, Facebook, Apple)
- Real-time notifications
- Chat support
- Referral program
- Analytics dashboard
- Vehicle profiles
- Wash reminders

---

**Enjoy unlimited car washes with DrivePass+!** 🚗✨
