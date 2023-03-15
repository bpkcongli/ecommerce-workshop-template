const cors = require('cors');
const express = require('express');
const path = require('path');
const { carts, products, productTags } = require('./inMemoryDb');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /product-tags
app.get('/product-tags', (_, res) => {
  res.json(productTags);
});

// GET /products
app.get('/products', (req, res) => {
  let filteredProducts = products;
  const { tags } = req.query;
  const tagArray = tags ? tags.split(',') : [];

  if (tagArray.length > 0) {
    filteredProducts = products.filter((product) => {
      const filteredTag = product.tags.filter((tag) => tagArray.includes(tag));
      return filteredTag.length > 0;
    });
  }

  res.json(filteredProducts);
});

// GET /products/:id
app.get('/products/:id', (req, res) => {
  const { id: productId } = req.params;
  const targetProduct = products.find((product) => product.id === productId);

  if (targetProduct) {
    return res.json(targetProduct);
  }

  return res.json({
    error: true,
    message: 'not found',
  }).status(404);
});

// POST /carts/add-to-cart
app.post('/carts/add-to-cart', (req, res) => {
  const { id, quantity } = req.body;
  if (!id || !quantity || typeof id !== 'string' || typeof quantity !== 'number') {
    return res.json({
      error: true,
      message: 'invalid payload',
    }).status(422);
  }

  const targetProduct = products.find((product) => product.id === id);
  if (!targetProduct) {
    return res.json({
      error: true,
      message: 'product id not found',
    }).status(404);
  }

  const { stock } = targetProduct;
  if (stock === 0) {
    return res.json({
      error: true,
      message: 'Stok habis.',
    }).status(422);
  }

  const totalPricePerItem = (Number(targetProduct.price) * quantity).toFixed(2);
  const isProductAlreadyInCart = carts.items.find((item) => item.id === id) !== undefined;

  if (!isProductAlreadyInCart) {
    const {
      name,
      imageUrl,
      price,
    } = targetProduct;

    carts.items.push({
      id,
      name,
      imageUrl,
      price,
      quantity,
      total: totalPricePerItem,
      stock,
    });
  } else {
    carts.items = [...carts.items].map(
      (item) => (item.id === id
        ? { ...item, quantity: item.quantity + quantity }
        : item),
    );
  }

  const subtotal = carts.items.reduce((prev, current) => prev + Number(current.total), 0);
  carts.subtotal = subtotal.toFixed(2);
  carts.tax = (Number(carts.subtotal) * 0.1).toFixed(2);
  carts.deliveryFee = '50.00';
  carts.total = (Number(carts.subtotal)
    + Number(carts.tax)
    + Number(carts.deliveryFee)).toFixed(2);

  return res.json({
    error: false,
    message: 'success',
  });
});

// GET /carts
app.get('/carts', (_, res) => {
  res.json(carts);
});

// GET /carts/total-items
app.get('/carts/total-items', (_, res) => {
  res.json({
    totalItems: carts.items.length,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
