import {
    createOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    createOrderForCustomer,
    getAllOrders,
    getOrdersByUserId,
    getOrderStatuses,
    updateOrderByUser,
    updateOrderByAdmin
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

// Update order items (before shipment)
router.put('/orders/:orderId/items', userAuthentication, updateOrderItems);

// Update shipping address (before shipment)
router.put('/orders/:orderId/address', userAuthentication, updateShippingAddress);

// Admin routes
router.route('/admin/orders/create')
    .post(adminAuthentication, createOrderForCustomer);

// Update order status (separate route)
router.put('/admin/orders/:orderId', adminAuthentication, updateOrderStatus);

// Get order by ID for admin
router.get('/admin/orders/:orderId', adminAuthentication, getOrderById);

// Get all orders for admin
router.get('/admin/orders', adminAuthentication, getAllOrders);

// Get orders by user ID for admin
router.get('/admin/user-orders/:userId', adminAuthentication, getOrdersByUserId);

// Get order by ID for admin (alternative route)
router.get('/getOrderById/:id', adminAuthentication, getOrderById);

// Get order statuses (for admin dropdown)
router.get('/statuses', adminAuthentication, getOrderStatuses);


// update order for user and admin
router.put('/update-order/:orderId',userAuthentication,updateOrderByUser);
router.put('/admin/update-order',adminAuthentication,updateOrderByAdmin);


export default router;
