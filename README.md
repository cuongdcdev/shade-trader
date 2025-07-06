# 🥷 Shade Trader - Conditional Limit Orders Frontend

This is the frontend for the NEAR Intents Conditional Limit Orders project. It provides a user interface for creating and managing conditional limit orders for crypto trading using NEAR blockchain.

## Features

- Create conditional limit orders with custom triggers
- View and manage your existing orders
- Configure wallet and notification settings
- Browse open orders across the system

## Tech Stack

- Next.js (App Router)
- TailwindCSS
- shadcn/ui for UI components
- React hooks for state management

## Getting Started

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

4. Start the order processor service (in a separate terminal):

```bash
npm run orders:process
```

## Pages

- `/` - Home page
- `/create` - Create new conditional order
- `/dashboard` - View your orders
- `/open-orders` - View all open orders in the system
- `/settings` - Configure wallet and notification preferences

## Integration with Backend

The API endpoints are available at the following routes:
- `POST /api/orders` - Create a new order
- `GET /api/orders` - Get user's orders
- `POST /api/orders/{orderId}/cancel` - Cancel an order
- `GET /api/intents-balance` - Get user's balance
- `GET /api/orders/all` - Get all open orders (public endpoint)
- `GET /api/user-config` - Get user configuration
- `PUT /api/user-config` - Create or update user configuration
- `DELETE /api/user-config` - Delete user configuration

## License

MIT

## API Documentation

### Authentication

All endpoints (except the public `/api/orders/all` endpoint) require authentication headers:

- `address` - The NEAR account address
- `private_key` - The private key for the NEAR account

Example:
```
headers: {
  'address': 'near_1a2b3c...7z',
  'private_key': 'your_private_key'
}
```

### API Endpoints

#### Create Order

Creates a new conditional limit order.

```
POST /api/orders
```

##### Request Body

```json
{
  "conditions": [
    {
      "token": "NEAR",
      "metric": "price",
      "operator": "<",
      "value": "3.00"
    },
    {
      "metric": "btc_dom",
      "operator": ">",
      "value": "45.5"
    }
  ],
  "action": {
    "type": "Buy",
    "amount": "100",
    "token": "NEAR"
  },
  "settings": {
    "repeatDaily": true,
    "telegramNotification": true,
    "expiryDays": 5
  }
}
```

#### Cancel Order

Cancels an active order.

```
POST /api/orders/{orderId}/cancel
```

#### List User Orders

Retrieves all orders for the authenticated user.

```
GET /api/orders
```

##### Query Parameters

- `status` (optional): Filter by order status (Open, Filled, Cancelled, Expired)
- `token` (optional): Filter by token (NEAR, DOGE, XRP, ZEC)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of orders per page (default: 10)

#### Get User Balance

Retrieves the user's balance in NEAR Intents.

```
GET /api/intents-balance
```

#### List All Orders (Public)

Retrieves all open orders across all users. This is a public endpoint that doesn't require authentication.

```
GET /api/orders/all
```

##### Query Parameters

- `status` (optional): Filter by order status (default: "Open")
- `token` (optional): Filter by token (NEAR, DOGE, XRP, ZEC)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of orders per page (default: 20)

#### User Configuration

Manages the user's configuration including wallet details and notification settings.

##### Get User Configuration

```
GET /api/user-config
```

Retrieves the configuration for the authenticated user.

##### Create/Update User Configuration

```
PUT /api/user-config
```

###### Request Body

```json
{
  "wallet": {
    "address": "near_1a2b3c...7z",
    "privateKey": "your_private_key"
  },
  "notifications": {
    "telegramId": "123456789",
    "isTelegramEnabled": true,
    "isEmailEnabled": false
  },
  "settings": {
    "defaultExpiryDays": 7
  }
}
```

Note: All fields are optional. Only the provided fields will be updated.

##### Delete User Configuration

```
DELETE /api/user-config
```

Deletes the configuration for the authenticated user.

### Response Format

All endpoints return JSON responses with the following structure:

#### Success Response

```json
{
  "status": "success",
  "data": {
    // Response data here...
  }
}
```

#### Error Response

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Error message"
}
```

Error codes include:
- `BAD_REQUEST`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `INTERNAL_ERROR`

### Implementation Notes

The API now uses a file-based database for persistent storage. Data is stored in JSON files in the `data` directory:
- `orders.json` - Stores all orders
- `balances.json` - Stores user balances

This file-based storage ensures data persistence between server restarts. The implementation can be found in `lib/database.ts`.

Future improvements could include:
- Migrating to a proper database like SQLite or PostgreSQL
- Adding database migrations
- Implementing more robust error handling and validation

### Whats Next

 - Shade Agent - securely execute orders powered by NEAR's Shade Agent.
 - Telegram notification 