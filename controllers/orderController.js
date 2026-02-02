import { Cart } from '../models/cartModel.js';
import { Order } from '../models/orderModel.js';
import { User } from '../models/userModel.js';
import { Products } from '../models/productModel.js';

// Create new order
export const createOrder = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User authentication failed"
      });
    }

    const userId = req.user._id;
    const {
      orderId,
      shippingAddress,
      paymentMethod,
      items,
    } = req.body;
    const selectedCartItemIds = items.map(item => item.productId);
    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required"
      });
    }

    
    

    /* ======================================================
       2️⃣ CART CHECKOUT (FULL / PARTIAL)
    ====================================================== */
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    const checkoutItems =
      Array.isArray(selectedCartItemIds) && selectedCartItemIds.length > 0
        ? cart.items.filter(i =>
          selectedCartItemIds.includes(i._id.toString())
        )
        : cart.items;


    if (checkoutItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Selected items not found in cart"
      });
    }

    const computeEffectivePrice = (p) => {
      const price = Number(p.productPrice) || 0;
      const prodDisc = Number(p.discountPercentage) || 0;
      const subDisc = p.subCategory
        ? Number(p.subCategory.discountPercentage || 0)
        : 0;
      const catDisc = p.category
        ? Number(p.category.discountPercentage || 0)
        : 0;

      const applied = prodDisc || subDisc || catDisc;
      return +(price * (1 - applied / 100)).toFixed(2);
    };

    let totalAmount = 0;
    const orderItems = [];

    for (const item of checkoutItems) {
      let prod = item.productId;

      if (!prod.category && !prod.subCategory) {
        prod = await Products.findById(prod._id)
          .populate("category")
          .populate("subCategory");
      }

      const price = computeEffectivePrice(prod);

      orderItems.push({
        productId: prod._id,
        quantity: item.quantity,
        price,
        name: prod.productName || "Unnamed Product",
        image: prod.productImgUrl || ""
      });

      totalAmount += price * item.quantity;
    }

    const order = await Order.create({
      orderId: orderId || `ORD${Date.now()}`,
      userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod
    });

    /* ======================================================
       3️⃣ REMOVE ONLY CHECKED-OUT ITEMS
    ====================================================== */
    // After creating the order

    if (Array.isArray(selectedCartItemIds) && selectedCartItemIds.length > 0) {
      cart.items = cart.items.filter(
        item => !selectedCartItemIds.includes(item._id.toString())
      );
      cart.markModified("items"); // ensures Mongoose notices array change
      await cart.save();
    }

    


    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
      remainingCartItems: cart.items
    });

  } catch (error) {
    console.error("Error in createOrder:", error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message
    });
  }
};
// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { orderId, id } = req.params;
    const searchId = orderId || id;

    const order = await Order.findOne({ orderId: searchId })
      .populate("items.productId", "productName productImgUrl productPrice")
      .populate("userId", "name email phone").sort({ createdAt: -1 });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching order",
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
        message: "Order not found"
      });
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.carrier = carrier;

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated",
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating order",
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
        message: "Order not found"
      });
    }

    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    order.orderStatus = "Cancelled";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled",
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error cancelling order",
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
      orderId: `ORD${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      orderStatus: 'Confirmed',
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


export const updateOrderByUser = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id; // authenticated user
    const updates = req.body;

    // Find order belonging to the user
    const order = await Order.findOne({ orderId, userId }).populate("items.productId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or access denied"
      });
    }

    // Allowed fields for user update
    const allowedFields = ["shippingAddress", "paymentMethod", "items"];

    // Update shippingAddress or paymentMethod
    if (updates.shippingAddress) order.shippingAddress = updates.shippingAddress;
    if (updates.paymentMethod) order.paymentMethod = updates.paymentMethod;

    // Update items if provided
    if (updates.items && Array.isArray(updates.items)) {
      let totalAmount = 0;
      const newItems = [];

      for (const item of updates.items) {
        const product = await Products.findById(item.productId)
          .populate("category")
          .populate("subCategory");

        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product with ID ${item.productId} not found`
          });
        }

        // Calculate effective price
        const price = (() => {
          const prodDisc = Number(product.discountPercentage) || 0;
          const subDisc = product.subCategory?.discountPercentage || 0;
          const catDisc = product.category?.discountPercentage || 0;
          const applied = prodDisc || subDisc || catDisc;
          return +(product.productPrice * (1 - applied / 100)).toFixed(2);
        })();

        newItems.push({
          productId: product._id,
          quantity: item.quantity,
          price,
          name: product.productName,
          image: product.productImgUrl || ""
        });

        totalAmount += price * item.quantity;
      }

      order.items = newItems;
      order.totalAmount = totalAmount;
    }

    await order.save();

    // Optionally populate before sending response
    const updatedOrder = await Order.findById(order._id)
      .populate("items.productId", "productName productImgUrl productPrice")
      .populate("userId", "name email");

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order: updatedOrder
    });

  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order",
      error: error.message
    });
  }
};


export const updateOrderByAdmin = async (req, res) => {
  try {
    const { orderId, userId } = req.body; // now both come from body
    const updates = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({
        success: false,
        message: "orderId and userId are required in the body"
      });
    }

    // Find order belonging to the user
    const order = await Order.findOne({ orderId, userId }).populate("items.productId");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or access denied"
      });
    }

    // Allowed fields for user update
    const allowedFields = ["shippingAddress", "paymentMethod", "items"];

    // Update shippingAddress or paymentMethod
    if (updates.shippingAddress) order.shippingAddress = updates.shippingAddress;
    if (updates.paymentMethod) order.paymentMethod = updates.paymentMethod;

    // Update items if provided
    if (updates.items && Array.isArray(updates.items)) {
      let totalAmount = 0;
      const newItems = [];

      for (const item of updates.items) {
        const product = await Products.findById(item.productId)
          .populate("category")
          .populate("subCategory");

        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product with ID ${item.productId} not found`
          });
        }

        // Calculate effective price
        const price = (() => {
          const prodDisc = Number(product.discountPercentage) || 0;
          const subDisc = product.subCategory?.discountPercentage || 0;
          const catDisc = product.category?.discountPercentage || 0;
          const applied = prodDisc || subDisc || catDisc;
          return +(product.productPrice * (1 - applied / 100)).toFixed(2);
        })();

        newItems.push({
          productId: product._id,
          quantity: item.quantity,
          price,
          name: product.productName,
          image: product.productImgUrl || ""
        });

        totalAmount += price * item.quantity;
      }

      order.items = newItems;
      order.totalAmount = totalAmount;
    }

    await order.save();

    // Optionally populate before sending response
    const updatedOrder = await Order.findById(order._id)
      .populate("items.productId", "productName productImgUrl productPrice")
      .populate("userId", "name email");

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order: updatedOrder
    });

  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order",
      error: error.message
    });
  }
};
