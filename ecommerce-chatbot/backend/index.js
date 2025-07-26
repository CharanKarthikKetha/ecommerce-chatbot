const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory data stores
let products = [];
let orders = [];
let orderItems = [];
let inventoryItems = [];
let users = [];
let distributionCenters = [];

// Load CSV Data
function loadCSVData() {
  fs.createReadStream('products.csv')
    .pipe(csv())
    .on('data', (data) => products.push(data))
    .on('end', () => console.log('✅ products.csv loaded'));

  fs.createReadStream('orders.csv')
    .pipe(csv())
    .on('data', (data) => orders.push(data))
    .on('end', () => console.log('✅ orders.csv loaded'));

  fs.createReadStream('order_items.csv')
    .pipe(csv())
    .on('data', (data) => orderItems.push(data))
    .on('end', () => console.log('✅ order_items.csv loaded'));

  fs.createReadStream('inventory_items.csv')
    .pipe(csv())
    .on('data', (data) => inventoryItems.push(data))
    .on('end', () => console.log('✅ inventory_items.csv loaded'));

  fs.createReadStream('users.csv')
    .pipe(csv())
    .on('data', (data) => users.push(data))
    .on('end', () => console.log('✅ users.csv loaded'));

  fs.createReadStream('distribution_centers.csv')
    .pipe(csv())
    .on('data', (data) => distributionCenters.push(data))
    .on('end', () => console.log('✅ distribution_centers.csv loaded'));
}

// Root route
app.get('/', (req, res) => {
  res.send('🛍️ E-commerce Chatbot Backend is running');
});

// Chatbot Endpoint
app.post('/chat', (req, res) => {
  const message = req.body.message.toLowerCase();

  // 🏢 Distribution Center Lookup
if (message.includes('distribution center') || message.includes('distribution')) {
  const foundCenter = distributionCenters.find(dc =>
    message.includes(dc.name?.toLowerCase()) || message.includes(dc.id?.toLowerCase())
  );

  if (foundCenter) {
    return res.json({
      reply: `🏢 Distribution Center Details:\n\n📍 Name: ${foundCenter.name}\n🆔 ID: ${foundCenter.id}\n🌐 Location: (${foundCenter.latitude}, ${foundCenter.longitude})`
    });
  } else {
    return res.json({
      reply: "❌ I couldn't find a matching distribution center."
    });
  }
}


  //order status

    // 📦 Order Status Tracking
  if (message.includes('order') && message.includes('status')) {
    const orderIdMatch = message.match(/\d+/);
    const orderId = orderIdMatch ? orderIdMatch[0] : null;

    if (!orderId) {
      return res.json({ reply: '❗ Please provide a valid order ID to check status.' });
    }

    const matchedOrderItems = orderItems.filter(item => item.order_id === orderId);

    if (matchedOrderItems.length === 0) {
      return res.json({ reply: `❌ No order found with ID ${orderId}.` });
    }

    const statusReply = matchedOrderItems.map(item => {
      const product = products.find(p => p.id === item.product_id);
      const name = product?.name || 'Unknown Product';
      const status = item.status || 'Unknown';
      const shipped = item.shipped_at || 'Not shipped';
      const delivered = item.delivered_at || 'Not delivered';
      const returned = item.returned_at || 'Not returned';

      return `• 🛍️ Product: ${name}\n  📦 Status: ${status}\n  🚚 Shipped At: ${shipped}\n  📬 Delivered At: ${delivered}\n  🔄 Returned At: ${returned}`;
    }).join('\n\n');

    return res.json({ reply: `📦 Order Status for Order ID ${orderId}:\n\n${statusReply}` });
  }


  // 🏆 Top 5 Most Sold Products
  if (message.includes('top') && message.includes('product')) {
    const salesMap = {};

    orderItems.forEach(item => {
      const productId = item.product_id;
      const qty = parseInt(item.quantity, 10);
      if (!salesMap[productId]) salesMap[productId] = 0;
      salesMap[productId] += qty;
    });

    const topProducts = Object.entries(salesMap)
      .map(([productId, totalSold]) => {
        const product = products.find(p => p.id === productId);
        return {
          name: product?.name || 'Unknown',
          totalSold
        };
      })
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    const reply = topProducts.map(p => `• ${p.name}: ${p.totalSold} sold`).join('\n');
    return res.json({ reply: `🏆 Top 5 Best-Selling Products:\n${reply}` });
  }

  // 📦 Inventory Lookup by product name/brand/id
  if (message.includes('stock') || message.includes('available') || message.includes('inventory')) {
    const found = inventoryItems.filter(item =>
      message.includes(item.product_name?.toLowerCase()) ||
      message.includes(item.product_brand?.toLowerCase()) ||
      message.includes(item.product_id)
    );

    if (found.length > 0) {
      // Group by product_id to count availability
      const grouped = {};

      found.forEach(item => {
        if (!grouped[item.product_id]) {
          grouped[item.product_id] = {
            product_name: item.product_name,
            product_brand: item.product_brand,
            count: 0
          };
        }
        grouped[item.product_id].count += 1;
      });

     const reply = Object.entries(grouped).map(([_, val], i) => {
  const brand = val.product_brand?.trim() || 'Unknown';
  return `${i + 1}. 🛍️ Product: ${val.product_name}\n   🏷️ Brand: ${brand}\n   📦 Available: ${val.count}`;
}).join('\n\n');

return res.json({ reply: `📦 Matching Inventory Items:\n\n${reply}` });

    } else {
      return res.json({ reply: "❌ Sorry, I couldn't find that product in the inventory." });
    }
  }

  // 🆘 Default Fallback
  res.json({ reply: "❓ Sorry, I didn't understand that. You can ask about 'top products', 'order status', or 'product stock'." });
});


// Start server
app.listen(5000, () => {
  console.log('🚀 Server running at http://localhost:5000');
  loadCSVData();
});
