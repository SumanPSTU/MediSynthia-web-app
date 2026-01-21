import {
    createOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    createOrderForCustomer,
    getAllOrders
} from "../controllers/orderController.js";

import { userAuthentication,adminAuthentication } from "../middleware/isAuthentication.js";
import express from 'express';

const router = express.Router();



// Order routes
router.route('/orders')
    .get(userAuthentication, getUserOrders)
    .post(userAuthentication, createOrder);

router.route('/orders/:orderId')
    .get(userAuthentication, getOrderById)
    .put(userAuthentication, cancelOrder);

// Admin routes
router.route('/admin/orders/create')
    .post(adminAuthentication, createOrderForCustomer);

router.route('/admin/orders/:orderId')
    .put(adminAuthentication, updateOrderStatus);

// Get all orders for admin
router.get('/admin/orders', adminAuthentication, getAllOrders);

export default router;
