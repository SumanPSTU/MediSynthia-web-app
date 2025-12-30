// controllers/cartController.js
import mongoose from "mongoose";
import { Cart } from '../models/cartModel.js';
import { Products } from '../models/productModel.js';

// compute effective price helper (product > subcategory > category)
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

// Helper: recalc totals
const recalcCart = (cart) => {
  cart.totalItems = cart.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  cart.totalPrice = cart.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
};

// Get user's cart
export const getCart = async (req, res) => {
  try {
    const userId = req.user._id || req.params.id;

    let cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart) {
      cart = await Cart.create({ userId, items: [], totalPrice: 0, totalItems: 0 });
    }

    // refresh stored item prices using current product/category/subcategory discounts
    for (const item of cart.items) {
      if (item.productId && typeof item.productId === 'object') {
        const p = item.productId;
        // Ensure populated category/subCategory are present
        // if not populated, fetch product with population
        if (!p.category || !p.subCategory) {
          const fresh = await Products.findById(p._id).populate('category').populate('subCategory');
          if (fresh) {
            item.price = computeEffectivePrice(fresh);
          }
        } else {
          item.price = computeEffectivePrice(p);
        }
      }
    }

    recalcCart(cart);
    await cart.save();

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cart', error: error.message });
  }
};

// Add product to cart
export const addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ success: false, message: "Invalid product ID" });

    const qty = Number(quantity);
    if (!qty || qty <= 0)
      return res.status(400).json({ success: false, message: "Quantity must be a positive number" });

    const product = await Products.findById(productId).populate('category').populate('subCategory');
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const productPrice = computeEffectivePrice(product);
    if (isNaN(productPrice)) return res.status(400).json({ success: false, message: "Product price invalid" });

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [], totalPrice: 0, totalItems: 0 });

    const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity += qty;
      // update price in case discounts changed
      cart.items[existingItemIndex].price = productPrice;
    } else {
      cart.items.push({
        productId,
        quantity: qty,
        price: productPrice,
        name: product.productName || "Unnamed Product",
        image: product.productImgUrl || "",
      });
    }

    recalcCart(cart);
    await cart.save();
    await cart.populate('items.productId');

    res.status(200).json({ success: true, message: "Product added to cart", cart });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding to cart", error: error.message });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId, quantity } = req.body;


    const qty = Number(quantity);
    if (!qty || qty < 1) return res.status(400).json({
      success: false,
      message: 'Quantity must be at least 1'
    });

    const cart = await Cart.findOne({ userId });

    if (!cart) return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === itemId);
    if (itemIndex === -1) return res.status(404).json({
      success: false,
      message: 'Item not found in cart'
    });

    cart.items[itemIndex].quantity = qty;

    recalcCart(cart);
    await cart.save();
    await cart.populate('items.productId');

    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating cart',
      error: error.message
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);

    recalcCart(cart);
    await cart.save();
    await cart.populate('items.productId');

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing from cart',
      error: error.message
    });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    cart.items = [];
    recalcCart(cart);
    await cart.save();
    await cart.populate('items.productId');

    res.status(200).json({ success: true, message: 'Cart cleared successfully', cart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing cart', error: error.message });
  }
};
