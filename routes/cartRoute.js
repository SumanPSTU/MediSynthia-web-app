// routes/orderRoutes.js
import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cartController.js';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  createOrderForCustomer // Add this import
} from '../controllers/orderController.js';
import { adminAuthentication, userAuthentication } from '../middleware/isAuthentication.js';

const router = express.Router();

// Cart routes
router.route('/cart')
  .get(userAuthentication, getCart)
  .post(userAuthentication, addToCart)
  .delete(userAuthentication, clearCart);

router.route('/cart/:itemId')
  .put(userAuthentication, updateCartItem)
  .delete(userAuthentication, removeFromCart);

// Order routes
router.route('/orders')
  .get(userAuthentication, getUserOrders)
  .post(userAuthentication, createOrder);

router.route('/orders/:orderId')
  .get(userAuthentication, getOrderById)
  .put(userAuthentication, cancelOrder);

// Admin routes
router.route('/admin/orders/create') // Add this route
  .post(adminAuthentication, createOrderForCustomer);

router.route('/admin/orders/:orderId')
  .put(adminAuthentication, updateOrderStatus);

export default router;