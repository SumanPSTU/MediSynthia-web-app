// routes/orderRoutes.js
import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cartController.js';
import { adminAuthentication, userAuthentication } from '../middleware/isAuthentication.js';

const router = express.Router();

// Cart routes - mounted at /cart in index.js
router.route('/')
  .get(userAuthentication, getCart)
  .post(userAuthentication, addToCart)
  .delete(userAuthentication, clearCart);

router.route('/item/:itemId')
  .put(userAuthentication, updateCartItem)
  .delete(userAuthentication, removeFromCart);

export default router;
