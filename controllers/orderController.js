import { Cart } from '../models/cartModel.js';
import { Order } from '../models/orderModel.js';
import { User } from '../models/userModel.js';
import { Products } from '../models/productModel.js';

// Create new order
export const createOrder = async (req, res) => {
  try {
    // Validate user
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication failed'
      });
    }

    const userId = req.user._id;
    const { orderId, shippingAddress, paymentMethod, items } = req.body;

    // Validate address
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required'
      });
    }
    
    // If items are provided directly from frontend (new format)
    if (items && Array.isArray(items) && items.length > 0) {
      
      let totalAmount = 0;
      
      // Validate items
      const orderItems = items.map((item, index) => {
        if (!item.productId || item.quantity === undefined || !item.price) {
          throw new Error(`Item ${index} missing required fields`);
        }
        totalAmount += parseFloat(item.price) * parseInt(item.quantity);
        return {
          productId: item.productId,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price),
          name: item.name || 'Unnamed Product',
          image: item.image || ''
        };
      });

      // Create order
      const order = new Order({
        orderId,
        userId,
        items: orderItems,
        totalAmount,
        shippingAddress,
        paymentMethod: paymentMethod || 'cash_on_delivery'
      });
      
      // Clear cart
      const cart = await Cart.findOne({ userId });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
      
      await order.save();
      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order
      });
    }
    
    // Fallback to original logic if items not provided (from cart)
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }
    
    // compute effective price per item (product > subcategory > category)
    const computeEffectivePrice = (p) => {
      const price = Number(p.productPrice) || 0;
      const prodDisc = Number(p.discountPercentage) || 0;
      const subDisc = p.subCategory ? Number(p.subCategory.discountPercentage || 0) : 0;
      const catDisc = p.category ? Number(p.category.discountPercentage || 0) : 0;

      let applied = 0;
      if (prodDisc > 0) applied = prodDisc;
      else if (subDisc > 0) applied = subDisc;
      else if (catDisc > 0) applied = catDisc;

      const effective = +(price * (1 - applied / 100)).toFixed(2);
      return effective;
    };

    const orderItems = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      const prod = item.productId;
      // ensure populated category/subCategory
      let fullProd = prod;
      if (!prod.category && !prod.subCategory) {
        fullProd = await Products.findById(prod._id).populate('category').populate('subCategory');
      }

      const price = computeEffectivePrice(fullProd);

      orderItems.push({
        productId: fullProd._id,
        quantity: item.quantity,
        price,
        name: fullProd.productName || 'Unnamed Product',
        image: fullProd.productImgUrl || ''
      });

      totalAmount += price * item.quantity;
    }

    // Create order
    const order = new Order({
      orderId: orderId || `ORD${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod
    });
    
    // Clear cart
    cart.items = [];
    await cart.save();
    
    await order.save();
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Error in createOrder:', error.message);
    
    // Check for specific error types
    let statusCode = 500;
    let message = 'Error creating order';
    
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = `Validation error: ${Object.keys(error.errors).map(key => error.errors[key].message).join(', ')}`;
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = `Invalid data format: ${error.message}`;
    } else if (error.message.includes('missing required fields')) {
      statusCode = 400;
      message = error.message;
    }
    
    res.status(statusCode).json({
      success: false,
      message,
      error: error.message
    });
  }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { orderId, id } = req.params;
    const searchId = orderId || id; // Support both parameter names
    
    if (!searchId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    const order = await Order.findOne({ orderId: searchId })
      .populate('items.productId', 'productName productImgUrl productPrice')
      .populate('userId', 'name email phone username');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user owns this order (skip check for admins)
    const isAdmin = req.admin || (req.user && req.user.isAdmin);
    
    // Get userId as string for comparison
    const orderUserId = order.userId?._id?.toString() || order.userId?.toString();
    const requestUserId = req.user?._id?.toString();
    
    if (!isAdmin && orderUserId && requestUserId && orderUserId !== requestUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Error in getOrderById:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// Update order status (admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    let { orderStatus, trackingNumber, carrier } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    // Normalize status - ensure it's always capitalized
    if (orderStatus) {
      orderStatus = orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1).toLowerCase();
    }
    
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (orderStatus) order.orderStatus = orderStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.carrier = carrier;
    
    // Set delivery date if order is shipped
    if (orderStatus === 'Shipped' && !order.deliveryDate) {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 5) + 3);
      order.deliveryDate = deliveryDate;
    }
    
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }
    
    order.orderStatus = 'cancelled';
    await order.save();
    
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
};

// Admin creates order for a customer
export const createOrderForCustomer = async (req, res) => {
  try {
    const { userId, items, shippingAddress, paymentMethod } = req.body;
    
    console.log('=== createOrderForCustomer ===');
    console.log('userId:', userId);
    console.log('items:', JSON.stringify(items));
    console.log('shippingAddress:', JSON.stringify(shippingAddress));
    console.log('paymentMethod:', paymentMethod);
    
    if (!userId || !items || !items.length || !shippingAddress || !paymentMethod) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'User ID, items, shipping address, and payment method are required'
      });
    }
    
    console.log('Looking up user:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    console.log('User found:', user.username);
    
    const orderItems = [];
    let totalAmount = 0;

    // compute effective price helper
    const computeEffectivePrice = (p) => {
      const price = Number(p.productPrice) || 0;
      const prodDisc = Number(p.discountPercentage) || 0;
      const subDisc = p.subCategory ? Number(p.subCategory.discountPercentage || 0) : 0;
      const catDisc = p.category ? Number(p.category.discountPercentage || 0) : 0;

      let applied = 0;
      if (prodDisc > 0) applied = prodDisc;
      else if (subDisc > 0) applied = subDisc;
      else if (catDisc > 0) applied = catDisc;

      const effective = +(price * (1 - applied / 100)).toFixed(2);
      return effective;
    };

    console.log('Processing items...');
    for (const item of items) {
      const { productId, quantity } = item;
      console.log('Processing item:', { productId, quantity });

      const prod = await Products.findById(productId).populate('category').populate('subCategory');
      if (!prod) {
        console.log('Product not found:', productId);
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} not found`
        });
      }
      console.log('Product found:', prod.productName, 'price:', prod.productPrice);

      const price = computeEffectivePrice(prod);
      console.log('Computed price:', price);

      orderItems.push({
        productId,
        quantity,
        price,
        name: prod.productName || 'Unnamed Product',
        image: prod.productImgUrl || ''
      });

      totalAmount += price * quantity;
    }
    
    console.log('Creating order...');
    console.log('orderItems:', JSON.stringify(orderItems));
    console.log('totalAmount:', totalAmount);
    
    const order = new Order({
      orderId: `ORD${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      orderStatus: 'Confirmed',
      paymentStatus: 'completed'
    });
    
    console.log('Saving order...');
    await order.save();
    console.log('Order saved successfully:', order.orderId);
    
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('items.productId', 'name price');
    
    console.log('Order populated and ready to return');
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully for customer',
      order: populatedOrder
    });
    
  } catch (error) {
    console.error('=== ERROR in createOrderForCustomer ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error creating order for customer',
      error: error.message
    });
  }
};

// get all orders - admin only (optional enhancement)
export const getAllOrders = async (req, res) => {
  try {
    // Get page and limit from query, set defaults if not provided
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch orders with pagination
    const orders = await Order.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination info
    const totalOrders = await Order.countDocuments();

    res.status(200).json({
      success: true,
      orders,
      page,
      totalPages: Math.ceil(totalOrders / limit),
      totalOrders,
      count: orders.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get orders by user ID - admin only
export const getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const orders = await Order.find({ userId })
      .populate('items.productId', 'productName productImgUrl')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user orders',
      error: error.message
    });
  }
};

// Get order statuses - for admin dropdown
export const getOrderStatuses = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      statuses: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statuses',
      error: error.message
    });
  }
};
