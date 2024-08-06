// Routes
const express = require("express");
const { body } = require("express-validator");
const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/add-product", isAuth, adminController.getAddProduct);
router.get("/products", isAuth, adminController.getProducts);

router.post(
  "/add-product",
  [
    body("title")
      .isString()
      .withMessage("Title must be String")
      .isLength({ min: 5 })
      .withMessage("Title must be at least 5 characters long.")
      .trim(),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a number and not less than 0."),
    body("quantity")
      .isInt({ min: 0 })
      .withMessage("Quantity must be an number and cannot be less than 0."),
    body("description")
      .isString()
      .withMessage("Description must be string")
      .isLength({ min: 5, max: 400 })
      .withMessage("Description must be between 5 and 400 characters."),
  ],
  isAuth,
  adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);


router.post(
  "/edit-product",
  [
    body("title")
      .isString()
      .withMessage("Title must be a string.")
      .isLength({ min: 3 })
      .withMessage("Title must be at least 3 characters long.")
      .trim(),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a number and cannot be less than 0."),
    body("quantity")
      .isInt({ min: 0 })
      .withMessage("Quantity must be an integer and cannot be less than 0."),
    body("description")
      .isLength({ min: 5, max: 400 })
      .withMessage("Description must be between 5 and 400 characters."),
  ],
  isAuth,
  adminController.postEditProduct
);

router.post("/delete-product", isAuth, adminController.postDeleteProduct);

//userAccount on Auth

router.get("/userAccount", adminController.getUserAccount);
router.post("/updateStatus/:id", isAuth, adminController.postUpdateStatus);
router.post("/deleteUser/:id", isAuth, adminController.postDeleteUser);

//Orders

router.get("/order", adminController.getOrder);
router.post("/deleteOrder/:id", isAuth, adminController.postDeleteOrder);

//Change Status
router.post("/products/:id", isAuth, adminController.postProductUpdateStatus);

module.exports = router;