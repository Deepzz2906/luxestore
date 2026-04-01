const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config();

// IMPORTANT: keep file names EXACTLY same as inside models folder
const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- MIDDLEWARE ----------------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "luxestore_secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI
  })
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.seller = req.session.seller || null;
  res.locals.cart = req.session.cart || [];
  res.locals.wishlist = req.session.wishlist || [];
  next();
});

// ---------------- DB CONNECT ----------------
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");
    await seedData();
  })
  .catch((err) => {
    console.log("❌ MongoDB Error:", err);
  });

// ---------------- SEED DATA ----------------
async function seedData() {
  try {
    // DELETE OLD SELLER AND CREATE FRESH ONE
    await User.deleteOne({ email: "seller@luxestore.com" });

    const hashed = await bcrypt.hash("12345", 10);

    await User.create({
      name: "Seller Admin",
      email: "seller@luxestore.com",
      password: hashed,
      role: "seller"
    });

    console.log("✅ Fresh seller created");

    const count = await Product.countDocuments();

    if (count === 0) {
      await Product.insertMany([
        {
          name: "Luxury Watch",
          price: 4999,
          image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80",
          description: "Elegant premium wrist watch designed for a timeless luxury look.",
          category: "Accessories"
        },
        {
          name: "Wireless Headphones",
          price: 2999,
          image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
          description: "Crystal-clear audio experience with modern premium finish.",
          category: "Electronics"
        },
        {
          name: "Premium Sneakers",
          price: 3999,
          image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
          description: "Luxury casual sneakers made for comfort and statement style.",
          category: "Fashion"
        },
        {
          name: "Flagship Smartphone",
          price: 24999,
          image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
          description: "Premium performance smartphone with sleek design and speed.",
          category: "Electronics"
        },
        {
          name: "Leather Handbag",
          price: 3499,
          image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
          description: "Elegant handbag crafted for premium style and functionality.",
          category: "Fashion"
        },
        {
          name: "Gaming Laptop",
          price: 79999,
          image: "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
          description: "Powerful laptop for gaming, work, and elite performance.",
          category: "Electronics"
        }
      ]);

      console.log("✅ Default products inserted");
    } else {
      console.log("ℹ️ Products already exist");
    }
  } catch (error) {
    console.log("❌ Seed Error:", error);
  }
}

// ---------------- ROUTES ----------------

// HOME
app.get("/", async (req, res) => {
  try {
    const products = await Product.find().limit(3);
    res.render("index", { products });
  } catch (error) {
    console.log(error);
    res.send("Error loading homepage");
  }
});

// REGISTER
app.get("/register", (req, res) => {
  res.render("register", { msg: "" });
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.render("register", { msg: "Email already registered!" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashed,
      role: "user"
    });

    res.render("login", { msg: "Registration successful! Please login." });
  } catch (error) {
    console.log(error);
    res.render("register", { msg: "Registration failed!" });
  }
});

// USER LOGIN
app.get("/login", (req, res) => {
  res.render("login", { msg: "" });
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: "user" });

    if (!user) {
      return res.render("login", { msg: "Invalid user credentials!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", { msg: "Invalid user credentials!" });
    }

    req.session.user = user.email;
    req.session.seller = null;

    res.redirect("/");
  } catch (error) {
    console.log(error);
    res.render("login", { msg: "Login failed!" });
  }
});

// SELLER LOGIN PAGE
app.get("/seller-login", (req, res) => {
  res.render("seller-login", { msg: "" });
});

// SELLER LOGIN POST
app.post("/seller-login", async (req, res) => {
  try {
    console.log("📥 Seller Login Body:", req.body);

    const { email, password } = req.body;
    const seller = await User.findOne({ email, role: "seller" });

    console.log("👤 Seller Found:", seller);

    if (!seller) {
      return res.render("seller-login", { msg: "Invalid seller credentials!" });
    }

    const isMatch = await bcrypt.compare(password, seller.password);
    console.log("🔐 Password Match:", isMatch);

    if (!isMatch) {
      return res.render("seller-login", { msg: "Invalid seller credentials!" });
    }

    req.session.seller = seller.email;
    req.session.user = null;

    console.log("✅ Seller Logged In Successfully");
    res.redirect("/seller-dashboard");
  } catch (error) {
    console.log("❌ Seller Login Error:", error);
    res.render("seller-login", { msg: "Seller login failed!" });
  }
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// PRODUCTS
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ _id: -1 });
    res.render("products", { products });
  } catch (error) {
    console.log(error);
    res.send("Error loading products");
  }
});

// SINGLE PRODUCT
app.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.send("Product not found");
    }

    res.render("product", { product });
  } catch (error) {
    console.log(error);
    res.send("Error loading product");
  }
});

// ADD TO CART
app.post("/add-to-cart/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.redirect("/products");
    }

    if (!req.session.cart) {
      req.session.cart = [];
    }

    req.session.cart.push(product);
    res.redirect("/cart");
  } catch (error) {
    console.log(error);
    res.redirect("/products");
  }
});

// CART
app.get("/cart", (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
  res.render("cart", { cart, total });
});

// REMOVE CART
app.get("/remove-cart/:index", (req, res) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }

  const index = parseInt(req.params.index);

  if (!isNaN(index) && index >= 0 && index < req.session.cart.length) {
    req.session.cart.splice(index, 1);
  }

  res.redirect("/cart");
});

// ADD TO WISHLIST
app.post("/add-to-wishlist/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.redirect("/products");
    }

    if (!req.session.wishlist) {
      req.session.wishlist = [];
    }

    const exists = req.session.wishlist.find(
      (item) => item._id.toString() === product._id.toString()
    );

    if (!exists) {
      req.session.wishlist.push(product);
    }

    res.redirect("/wishlist");
  } catch (error) {
    console.log(error);
    res.redirect("/products");
  }
});

// WISHLIST
app.get("/wishlist", (req, res) => {
  const wishlist = req.session.wishlist || [];
  res.render("wishlist", { wishlist });
});

// REMOVE WISHLIST
app.get("/remove-wishlist/:index", (req, res) => {
  if (!req.session.wishlist) {
    req.session.wishlist = [];
  }

  const index = parseInt(req.params.index);

  if (!isNaN(index) && index >= 0 && index < req.session.wishlist.length) {
    req.session.wishlist.splice(index, 1);
  }

  res.redirect("/wishlist");
});

// CHECKOUT
app.get("/checkout", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + Number(item.price), 0);

  res.render("checkout", { total });
});

// PLACE ORDER
app.post("/place-order", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const cart = req.session.cart || [];

    for (const item of cart) {
      await Order.create({
        userEmail: req.session.user,
        productName: item.name,
        price: item.price
      });
    }

    req.session.cart = [];
    res.redirect("/orders");
  } catch (error) {
    console.log(error);
    res.send("Error placing order");
  }
});

// ORDERS
app.get("/orders", async (req, res) => {
  try {
    if (req.session.seller) {
      const orders = await Order.find().sort({ _id: -1 });
      return res.render("orders", {
        orders,
        title: "All Customer Orders"
      });
    }

    if (!req.session.user) {
      return res.redirect("/login");
    }

    const orders = await Order.find({ userEmail: req.session.user }).sort({ _id: -1 });

    res.render("orders", {
      orders,
      title: "Your Orders"
    });
  } catch (error) {
    console.log(error);
    res.send("Error loading orders");
  }
});

// SELLER DASHBOARD
app.get("/seller-dashboard", async (req, res) => {
  try {
    if (!req.session.seller) {
      return res.redirect("/seller-login");
    }

    const products = await Product.find().sort({ _id: -1 });
    res.render("seller-dashboard", { products });
  } catch (error) {
    console.log(error);
    res.send("Error loading seller dashboard");
  }
});

// ADD PRODUCT PAGE
app.get("/add-product", (req, res) => {
  if (!req.session.seller) {
    return res.redirect("/seller-login");
  }

  res.render("add-product", { msg: "" });
});

// ADD PRODUCT
app.post("/add-product", async (req, res) => {
  try {
    if (!req.session.seller) {
      return res.redirect("/seller-login");
    }

    const { name, price, image, description, category } = req.body;

    await Product.create({
      name,
      price,
      image,
      description,
      category
    });

    res.render("add-product", { msg: "Product added successfully!" });
  } catch (error) {
    console.log(error);
    res.render("add-product", { msg: "Failed to add product!" });
  }
});

// DELETE PRODUCT
app.get("/delete-product/:id", async (req, res) => {
  try {
    if (!req.session.seller) {
      return res.redirect("/seller-login");
    }

    await Product.findByIdAndDelete(req.params.id);
    res.redirect("/seller-dashboard");
  } catch (error) {
    console.log(error);
    res.redirect("/seller-dashboard");
  }
});

// 404
app.use((req, res) => {
  res.status(404).send("404 - Page Not Found");
});

// ---------------- SERVER ----------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});