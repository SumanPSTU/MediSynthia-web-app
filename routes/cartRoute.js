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

router.route('/carts/cart')
  .put(userAuthentication, updateCartItem)
  .delete(userAuthentication, removeFromCart);



export default router;