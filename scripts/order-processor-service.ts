import { orderProcessor } from '../lib/order-processor';
import { tokenService } from '../lib/token-service';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

async function processOrders() {
  try {
    console.log(`[${new Date().toISOString()}] Initializing token data...`);
    await tokenService.getAllTokensData();
    
    console.log(`[${new Date().toISOString()}] Processing orders...`);
    await orderProcessor.checkAllOrders();
    
    console.log(`[${new Date().toISOString()}] Order processing complete.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing orders:`, error);
  }
}

async function main() {
    const tokenPath = path.resolve(__dirname, '../lib/near-intents/token_list.json');
    const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    
    console.log(`[NEAR Intents] Loaded token data: ${tokenData.length} tokens`);

  try {
    console.log('Starting Order Processor Service with cron scheduler...');
    
    // Run immediately on startup
    await processOrders();
    
    // Schedule to run every 1 minute
    // You can adjust the schedule as needed:
    // '*/30 * * * * *' = every 30 seconds
    // '* * * * *' = every minute
    // '*/5 * * * *' = every 5 minutes
    // '0 * * * *' = every hour
    cron.schedule('*/30 * * * * *', async () => {
      await processOrders();
    });
    
    console.log('Order processor service is running with cron schedule. Press Ctrl+C to exit.');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Received SIGINT. Shutting down order processor...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Shutting down order processor...');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error starting order processor service:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in order processor service:', error);
  process.exit(1);
});