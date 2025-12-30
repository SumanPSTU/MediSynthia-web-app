// controllers/orderController.js
import { Cart } from '../models/cartModel.js';
import { Order } from '../models/orderModel.js';
import { User } from '../models/userModel.js';
import { Products } from '../models/productModel.js';

// Create new order
export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { shippingAddress, paymentMethod } = req.body;
    
    // Get user's cart
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
    res.status(500).json({
      success: false,
      message: 'Error creating order',
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
    const { orderId } = req.params;
    
    const order = await Order.findOne({ orderId }).populate('items.productId');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user owns this order
    if (order.userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
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
    const { orderStatus, trackingNumber, carrier } = req.body;
    
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
    if (orderStatus === 'shipped' && !order.deliveryDate) {
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
    
    if (!userId || !items || !items.length || !shippingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'User ID, items, shipping address, and payment method are required'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
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

    for (const item of items) {
      const { productId, quantity } = item;

      const prod = await Products.findById(productId).populate('category').populate('subCategory');
      if (!prod) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} not found`
        });
      }

      const price = computeEffectivePrice(prod);

      orderItems.push({
        productId,
        quantity,
        price,
        name: prod.productName || 'Unnamed Product',
        image: prod.productImgUrl || ''
      });

      totalAmount += price * quantity;
    }
    
    const order = new Order({
      userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      orderStatus: 'confirmed',
      paymentStatus: 'completed'
    });
    
    await order.save();
    
    const populatedOrder = await Order.findById(order._id)
      .populate('userId', 'name email')
      .populate('items.productId', 'name price');
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully for customer',
      order: populatedOrder
    });
    
  } catch (error) {
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
