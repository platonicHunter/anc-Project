const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const Product = require("./product");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "User",
  },
  status: {
    type: String,
    enum: ["active", "pending"],
    default: "pending",
  },
  resetToken: String,
  resetTokenExpiration: Date,
  activationToken: String,
  activationTokenExpiration: Date,
  cart: {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
      },
    ],
  },
});

userSchema.methods.addToCart = function (product, quantity) {
  const cartProductIndex = this.cart.items.findIndex((cp) => {
    return cp.productId.toString() === product._id.toString();
  });
  let newQuantity = quantity;
  const updatedCartItems = [...this.cart.items];

  if (cartProductIndex >= 0) {
    newQuantity = this.cart.items[cartProductIndex].quantity + quantity;
    updatedCartItems[cartProductIndex].quantity = newQuantity;
  } else {
    updatedCartItems.push({
      productId: product._id,
      quantity: newQuantity,
    });
  }
  const updatedCart = {
    items: updatedCartItems,
  };
  this.cart = updatedCart;
  return this.save();
  // // Reduce the product's quantity
  // product.quantity -= quantity;

  // // Save both user cart and product
  // return Promise.all([this.save(), product.save()]);
};

// userSchema.methods.updateCartQuantity = async function (productId, newQuantity) {
//   // Find the product in the cart
//   const cartProductIndex = this.cart.items.findIndex(cp => {
//     return cp.productId.toString() === productId.toString();
//   });

//   if (cartProductIndex === -1) {
//     throw new Error('Product not found in cart.');
//   }

//   // Find the product
//   const product = await Product.findById(productId);
//   if (!product) {
//     throw new Error('Product not found.');
//   }

//   // Calculate the quantity difference
//   const oldQuantity = this.cart.items[cartProductIndex].quantity;
//   const quantityDifference = newQuantity - oldQuantity;

//   // Check if the new quantity exceeds the available stock
//   if (product.quantity < quantityDifference) {
//     throw new Error('Not enough stock available.');
//   }

//   // Update the cart item quantity
//   const updatedCartItems = [...this.cart.items];
//   updatedCartItems[cartProductIndex].quantity = newQuantity;

//   // Update the cart
//   this.cart = { items: updatedCartItems };

//   // Adjust the product's quantity
//   product.quantity -= quantityDifference;

//   // Save both user cart and product
//   await Promise.all([this.save(), product.save()]);
// };




userSchema.methods.removeFromCart = function (productId) {
  const cartItem = this.cart.items.find((item) => {
    return item.productId.toString() === productId.toString();
  });

  if (!cartItem) {
    return Promise.reject(new Error("Product not found in cart."));
  }

  const updatedCartItems = this.cart.items.filter((item) => {
    return item.productId.toString() !== productId.toString();
  });

  this.cart.items = updatedCartItems;

  return Product.findById(productId).then((product) => {
    if (!product) {
      return Promise.reject(new Error("Product not found."));
    }

    product.quantity += cartItem.quantity;

    return Promise.all([this.save(), product.save()]);
  });
};

userSchema.methods.clearCart = function () {
  this.cart = { items: [] };
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
